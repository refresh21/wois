import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ chats: data || [] })
    } catch (error: any) {
        console.error('List chats error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId, title } = await req.json()

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        const { data, error } = await supabase
            .from('chats')
            .insert({
                user_id: userId,
                title: title || 'New Conversation',
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ chat: data })
    } catch (error: any) {
        console.error('Create chat error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
