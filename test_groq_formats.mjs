import fs from 'fs'

const envData = fs.readFileSync('.env.local', 'utf8')
const env = {}
envData.split(/\r?\n/).forEach(line => {
    if (line.includes('=')) {
        const idx = line.indexOf('=')
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
})

// Get most recent note's audio
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data } = await supabase.from('notes').select('id, audio_url, created_at').order('created_at', { ascending: false }).limit(1)
const audioUrl = data[0].audio_url
console.log('Testing audio:', audioUrl)

const res = await fetch(audioUrl)
const buf = await res.arrayBuffer()
console.log('File size:', buf.byteLength, 'bytes')

// Try 1: webm
console.log('\n-- Test 1: audio/webm;codecs=opus as .ogg --')
const blob1 = new Blob([buf], { type: 'audio/webm;codecs=opus' })
const form1 = new FormData()
form1.append('file', blob1, 'recording.ogg')
form1.append('model', 'whisper-large-v3')
form1.append('response_format', 'text')
form1.append('language', 'tr')
const r1 = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: form1
})
console.log('Status:', r1.status, '| Response:', await r1.text())

// Try 2: audio/ogg
console.log('\n-- Test 2: audio/ogg;codecs=opus as .ogg --')
const blob2 = new Blob([buf], { type: 'audio/ogg;codecs=opus' })
const form2 = new FormData()
form2.append('file', blob2, 'recording.ogg')
form2.append('model', 'whisper-large-v3')
form2.append('response_format', 'text')
form2.append('language', 'tr')
const r2 = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: form2
})
console.log('Status:', r2.status, '| Response:', await r2.text())

// Try 3: no language
console.log('\n-- Test 3: no language, webm as .ogg --')
const blob3 = new Blob([buf], { type: 'audio/webm;codecs=opus' })
const form3 = new FormData()
form3.append('file', blob3, 'recording.ogg')
form3.append('model', 'whisper-large-v3')
form3.append('response_format', 'verbose_json')
const r3 = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: form3
})
console.log('Status:', r3.status, '| Response:', await r3.text())
