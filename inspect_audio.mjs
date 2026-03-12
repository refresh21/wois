import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envData = fs.readFileSync('.env.local', 'utf8')
const env = {}
envData.split(/\r?\n/).forEach(line => {
    if (line.includes('=')) {
        const idx = line.indexOf('=')
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const { data, error } = await supabase.from('notes').select('id, audio_url, created_at').order('created_at', { ascending: false }).limit(1)
console.log('Latest note:', JSON.stringify(data))

if (data && data[0] && data[0].audio_url) {
    const res = await fetch(data[0].audio_url)
    const buf = await res.arrayBuffer()
    console.log('Audio file size in bytes:', buf.byteLength)
    const header = Buffer.from(buf.slice(0, 16))
    console.log('First 16 bytes (hex):', header.toString('hex'))
}
