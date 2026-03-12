import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const audioFile = formData.get('audio') as File

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
        }

        const mimeType = audioFile.type || 'audio/webm'
        let fileName = audioFile.name || 'audio.webm'
        if (mimeType.includes('opus') && !fileName.endsWith('.ogg')) {
            fileName = fileName.replace(/\.[^.]+$/, '') + '.ogg'
        }
        console.log('Sending to Groq:', fileName, 'MIME:', mimeType, 'size:', audioFile.size)

        const groqForm = new FormData()
        groqForm.append('file', audioFile, fileName)
        groqForm.append('model', 'whisper-large-v3')
        groqForm.append('response_format', 'verbose_json')

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)

        try {
            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                },
                body: groqForm,
                signal: controller.signal
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Groq API error:', errorText)
                return NextResponse.json({ error: 'Transcription failed', details: errorText }, { status: 500 })
            }

            const result = await response.json()
            console.log('Raw Groq result:', JSON.stringify(result).substring(0, 200))

            let transcript = (result.text || '').trim()

            // Use no_speech_prob to detect silence — much more reliable than string matching
            const segments = result.segments || []
            const avgNoSpeechProb = segments.length > 0
                ? segments.reduce((sum: number, seg: any) => sum + (seg.no_speech_prob || 0), 0) / segments.length
                : 0

            console.log('Transcript:', transcript, '| Avg no_speech_prob:', avgNoSpeechProb)

            if (avgNoSpeechProb > 0.9 || transcript.length === 0) {
                console.log('Detected silence or empty transcript, returning empty.')
                transcript = ''
            }

            return NextResponse.json({ transcript })
        } finally {
            clearTimeout(timeout)
        }
    } catch (error: any) {
        console.error('Transcription error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}


