import fs from 'fs'

async function runTest() {
    try {
        console.log("Fetching sample audio...")
        // Fetch a small public mp3 sample
        const audioRes = await fetch('https://filesamples.com/samples/audio/mp3/sample3.mp3')
        const arrayBuffer = await audioRes.arrayBuffer()

        console.log("Creating Blob...")
        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' })
        const formData = new FormData()
        formData.append('audio', blob, 'sample.mp3')

        console.log("Sending to local Next.js API...")
        const res = await fetch('http://localhost:3000/api/transcribe', {
            method: 'POST',
            body: formData
        })

        const text = await res.text()
        console.log("Status:", res.status)
        console.log("Response:", text)
    } catch (e) {
        console.error("Test threw error:", e)
    }
}

runTest()
