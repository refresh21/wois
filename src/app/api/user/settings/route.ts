import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Using service role for server-side operations if needed, 
// but here we can use the user's token from headers if we pass it.
// For simplicity, we'll use the environment variables to create a client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Need to ensure this is in .env

export async function GET(req: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
            throw error
        }

        return NextResponse.json({ settings: data || null })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId, google_refresh_token, google_drive_connected } = await req.json()

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        const { data, error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                google_refresh_token,
                google_drive_connected,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ settings: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
