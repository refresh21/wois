import fs from 'fs'

async function runTest() {
    try {
        console.log("Reading test file...")
        // Just send a dummy text file as audio since groq expects valid extension but we just want to see if it reaches groq
        const blob = new Blob(["test audio"], { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'test.webm')

        console.log("Sending to local Next.js API...")
        const res = await fetch('http://localhost:3000/api/transcribe', {
            method: 'POST',
            body: formData
        })

        const text = await res.text()
        console.log("Status:", res.status)
        console.log("Response:", text)
    } catch (e) {
        console.error("Fetch threw error:", e)
    }
}

runTest()
