import { NextRequest, NextResponse } from 'next/server'

// Exchange authorization code for tokens
export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json()

        if (!code) {
            return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${req.nextUrl.origin}/drive/callback`,
                grant_type: 'authorization_code',
            }),
        })

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            console.error('Token exchange error:', errorText)
            return NextResponse.json({ error: 'Token exchange failed', details: errorText }, { status: 500 })
        }

        const tokens = await tokenResponse.json()
        return NextResponse.json(tokens)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
