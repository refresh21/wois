import { NextRequest, NextResponse } from 'next/server'

// Upload file to Google Drive
export async function POST(req: NextRequest) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const accessToken = formData.get('accessToken') as string
        const folderId = formData.get('folderId') as string | null
        const fileName = formData.get('fileName') as string || file?.name || 'untitled'

        if (!file || !accessToken) {
            console.error('Missing file or accessToken')
            return NextResponse.json({ error: 'File and accessToken required' }, { status: 400 })
        }

        // Step 1: Create or find the Wois folder if no folder ID provided
        let targetFolderId = folderId
        if (!targetFolderId) {
            const searchRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='Wois' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
                { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }
            )
            const searchData = await searchRes.json()

            if (searchData.files && searchData.files.length > 0) {
                targetFolderId = searchData.files[0].id
            } else {
                const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: 'Wois',
                        mimeType: 'application/vnd.google-apps.folder',
                    }),
                    signal: controller.signal
                })
                const folderData = await createFolderRes.json()
                targetFolderId = folderData.id
            }
        }

        // Step 2: Upload file to Drive using multipart upload
        const fileBuffer = await file.arrayBuffer()
        const metadata = {
            name: fileName,
            parents: targetFolderId ? [targetFolderId] : [],
        }

        const boundary = 'wois_upload_boundary'
        const metadataPart = JSON.stringify(metadata)

        const bodyParts = [
            `--${boundary}\r\n`,
            'Content-Type: application/json; charset=UTF-8\r\n\r\n',
            metadataPart,
            `\r\n--${boundary}\r\n`,
            `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        ]

        const textEncoder = new TextEncoder()
        const textParts = bodyParts.map(p => textEncoder.encode(p))
        const endPart = textEncoder.encode(`\r\n--${boundary}--`)
        const fileArray = new Uint8Array(fileBuffer)

        const totalLength = textParts.reduce((acc, p) => acc + p.length, 0) + fileArray.length + endPart.length
        const body = new Uint8Array(totalLength)
        let offset = 0
        for (const part of textParts) {
            body.set(part, offset)
            offset += part.length
        }
        body.set(fileArray, offset)
        offset += fileArray.length
        body.set(endPart, offset)

        const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: body,
                signal: controller.signal
            }
        )

        if (!uploadRes.ok) {
            const errorText = await uploadRes.text()
            console.error('Drive upload error:', errorText)
            return NextResponse.json({ error: 'Upload to Drive failed', details: errorText }, { status: 500 })
        }

        const uploadData = await uploadRes.json()
        return NextResponse.json({
            success: true,
            file: uploadData,
            folderId: targetFolderId,
        })
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('Drive upload timed out')
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
        }
        console.error('Drive upload error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    } finally {
        clearTimeout(timeout)
    }
}

// List files in the Wois folder
export async function GET(req: NextRequest) {
    try {
        const accessToken = req.headers.get('Authorization')?.replace('Bearer ', '')
        if (!accessToken) {
            return NextResponse.json({ error: 'No access token' }, { status: 401 })
        }

        // Find Wois folder
        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='Wois' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const searchData = await searchRes.json()

        if (!searchData.files || searchData.files.length === 0) {
            return NextResponse.json({ files: [], folderId: null })
        }

        const folderId = searchData.files[0].id

        // List files in folder
        const listRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,createdTime,webViewLink,webContentLink,thumbnailLink)&orderBy=createdTime desc`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const listData = await listRes.json()

        return NextResponse.json({ files: listData.files || [], folderId })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
