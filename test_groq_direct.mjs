import fs from 'fs'

// Or just use native fetch FormData if available
const envData = fs.readFileSync('.env.local', 'utf8')
envData.split('\n').forEach(line => {
    if (line.includes('=')) {
        const [k, v] = line.split('=')
        process.env[k.trim()] = v.trim()
    }
})
async function runGroqDirect() {
    try {
        console.log("Fetching sample audio...")
        const audioRes = await fetch('https://filesamples.com/samples/audio/mp3/sample3.mp3')
        if (!audioRes.ok) throw new Error("Could not fetch test audio")
        const arrayBuffer = await audioRes.arrayBuffer()

        console.log("Buffer size:", arrayBuffer.byteLength) // Should be > 0

        const groqForm = new FormData()
        // Method 1: native Blob with 3rd arg
        groqForm.append('file', new Blob([arrayBuffer], { type: 'audio/mp3' }), 'sample.mp3')
        groqForm.append('model', 'whisper-large-v3')
        groqForm.append('response_format', 'text')
        groqForm.append('language', 'tr')

        console.log("Sending to Groq...")
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: groqForm
        })

        const text = await res.text()
        console.log("Status:", res.status)
        console.log("Response:", text.substring(0, 100))
    } catch (e) {
        console.error("Test threw error:", e)
    }
}

runGroqDirect()
