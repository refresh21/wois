import fs from 'fs'

const envData = fs.readFileSync('.env.local', 'utf8')
const env = {}
envData.split(/\r?\n/).forEach(line => {
    if (line.includes('=')) {
        const idx = line.indexOf('=')
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
})

// Download latest audio file and save it
const audioUrl = 'https://lqhxkdgtlryxurqjerop.supabase.co/storage/v1/object/public/recordings/recording_1772979171187.webm'

console.log('Downloading audio...')
const res = await fetch(audioUrl)
const buf = await res.arrayBuffer()
fs.writeFileSync('downloaded_recording.webm', Buffer.from(buf))
console.log('Saved as downloaded_recording.webm, size:', buf.byteLength)
