import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

function getAuth() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const jwt = new google.auth.JWT()
  jwt.email = key.client_email
  jwt.key = key.private_key
  jwt.scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ]
  return jwt
}

async function saveLocally(file: File): Promise<string> {
  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  const bytes = await file.arrayBuffer()
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
  return `/uploads/${filename}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    if (!folderId) {
      // Drive not configured — fall back to local storage
      const localPath = await saveLocally(file)
      return NextResponse.json({ path: localPath, source: 'local' })
    }

    // Upload to Google Drive
    try {
      const auth = getAuth()
      const drive = google.drive({ version: 'v3', auth })
      const bytes = await file.arrayBuffer()
      const buf = Buffer.from(bytes)

      const driveRes = await drive.files.create({
        requestBody: {
          name: `${Date.now()}-${file.name}`,
          parents: [folderId],
        },
        media: { mimeType: file.type || 'application/octet-stream', body: Readable.from(buf) },
        fields: 'id',
      })

      await drive.permissions.create({
        fileId: driveRes.data.id!,
        requestBody: { role: 'reader', type: 'anyone' },
      })

      const url = `https://drive.google.com/uc?export=view&id=${driveRes.data.id}`
      return NextResponse.json({ path: url, source: 'drive', fileId: driveRes.data.id })
    } catch (driveError) {
      const errMsg = driveError instanceof Error ? driveError.message : String(driveError)
      console.error('Drive upload failed:', errMsg)
      const localPath = await saveLocally(file)
      return NextResponse.json({ path: localPath, source: 'local', driveError: errMsg })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
