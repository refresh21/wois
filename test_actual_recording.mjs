import fs from 'fs'

const envData = fs.readFileSync('.env.local', 'utf8')
const env = {}
envData.split(/\r?\n/).forEach(line => {
    if (line.includes('=')) {
        const idx = line.indexOf('=')
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
})

// Latest recording from Supabase
const audioUrl = 'https://lqhxkdgtlryxurqjerop.supabase.co/storage/v1/object/public/recordings/recording_1772979171187.webm'

console.log('Fetching audio from Supabase...')
const res = await fetch(audioUrl)
const buf = await res.arrayBuffer()
console.log('Size:', buf.byteLength, 'bytes')

// Send directly to Groq as webm
const blob = new Blob([buf], { type: 'audio/webm' })
const form = new FormData()
form.append('file', blob, 'recording.webm')
form.append('model', 'whisper-large-v3')
form.append('response_format', 'text')
form.append('language', 'tr')

console.log('Sending to Groq...')
const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: form
})
console.log('Groq status:', groqRes.status)
const text = await groqRes.text()
console.log('Groq response:', text)

// Now try with mp4 type
console.log('\n-- Trying with audio/mp4 content type --')
const blob2 = new Blob([buf], { type: 'audio/mp4' })
const form2 = new FormData()
form2.append('file', blob2, 'recording.mp4')
form2.append('model', 'whisper-large-v3')
form2.append('response_format', 'text')
form2.append('language', 'tr')

const groqRes2 = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: form2
})
console.log('Groq status (mp4):', groqRes2.status)
const text2 = await groqRes2.text()
console.log('Groq response (mp4):', text2)
