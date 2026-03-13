import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { refresh_token } = await req.json()

        if (!refresh_token) {
            return NextResponse.json({ error: 'No refresh token provided' }, { status: 400 })
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: refresh_token,
                grant_type: 'refresh_token',
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Token refresh error:', errorText)
            return NextResponse.json({ error: 'Token refresh failed', details: errorText }, { status: 500 })
        }

        const tokens = await response.json()
        return NextResponse.json({
            access_token: tokens.access_token,
            expires_in: tokens.expires_in,
            // refresh_token is sometimes not returned if it hasn't changed
            refresh_token: tokens.refresh_token || refresh_token
        })
    } catch (error: any) {
        console.error('Refresh API catch:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
