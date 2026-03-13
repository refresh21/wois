import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const id = params.id

    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', id)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json({ messages: data || [] })
    } catch (error: any) {
        console.error('Get chat messages error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const id = params.id
    const { role, content, userId } = await req.json()

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                chat_id: id,
                user_id: userId,
                role,
                content
            })
            .select()
            .single()

        if (error) throw error

        // Also update the chat's updated_at timestamp
        await supabase
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', id)

        return NextResponse.json({ message: data })
    } catch (error: any) {
        console.error('Save chat message error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const id = params.id

    try {
        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete chat error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
