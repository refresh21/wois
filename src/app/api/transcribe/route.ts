import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        let audioFile: File | Blob | null = null
        let fileName = 'audio.webm'
        let mimeType = 'audio/webm'

        // Check if it's a JSON request with a URL or a FormData request with a file
        const contentType = req.headers.get('content-type') || ''
        
        if (contentType.includes('application/json')) {
            const { audioUrl } = await req.json()
            if (!audioUrl) return NextResponse.json({ error: 'No audio URL provided' }, { status: 400 })
            
            console.log('Fetching audio from URL:', audioUrl)
            const audioRes = await fetch(audioUrl)
            if (!audioRes.ok) throw new Error('Failed to fetch audio from URL')
            
            const arrayBuffer = await audioRes.arrayBuffer()
            mimeType = audioRes.headers.get('content-type') || 'audio/webm'
            audioFile = new Blob([arrayBuffer], { type: mimeType })
            
            // Extract filename from URL or default
            const urlPath = new URL(audioUrl).pathname
            const extractedName = urlPath.split('/').pop()
            if (extractedName) fileName = extractedName
        } else {
            const formData = await req.formData()
            audioFile = formData.get('audio') as File
            if (!audioFile) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
            mimeType = audioFile.type || 'audio/webm'
            fileName = (audioFile as any).name || 'audio.webm'
        }

        if (mimeType.includes('opus') && !fileName.endsWith('.ogg')) {
            fileName = fileName.replace(/\.[^.]+$/, '') + '.ogg'
        }
        console.log('Sending to Groq:', fileName, 'MIME:', mimeType, 'size:', (audioFile as any).size)

        const groqForm = new FormData()
        groqForm.append('file', audioFile as any, fileName)
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


