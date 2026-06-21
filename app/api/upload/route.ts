import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { appendRow } from '@/lib/sheets'

function cloudinarySign(params: Record<string, string>, secret: string): string {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  return createHash('sha1').update(str + secret).digest('hex')
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

async function logToMediaSheet(url: string, fileType: string, groomId: string, groomName: string, label: string) {
  try {
    await appendRow('Media', [
      new Date().toISOString(),
      url,
      fileType,
      groomId,
      groomName,
      label,
    ])
  } catch { /* non-fatal */ }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Optional metadata for the media library
    const groomId = (formData.get('groomId') as string) || ''
    const groomName = (formData.get('groomName') as string) || ''
    const label = (formData.get('label') as string) || (file.type.startsWith('image/') ? 'photo' : 'pdf')

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
    const isVercel = !!process.env.VERCEL

    if (cloudName && apiKey && apiSecret) {
      const timestamp = String(Math.floor(Date.now() / 1000))
      const folder = 'rishtabook'
      const signature = cloudinarySign({ folder, timestamp }, apiSecret)

      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const dataUri = `data:${file.type || 'application/octet-stream'};base64,${base64}`

      const body = new FormData()
      body.append('file', dataUri)
      body.append('api_key', apiKey)
      body.append('timestamp', timestamp)
      body.append('folder', folder)
      body.append('signature', signature)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Cloudinary upload failed')

      const url: string = data.secure_url
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf'
      await logToMediaSheet(url, fileType, groomId, groomName, label)

      return NextResponse.json({ path: url, source: 'cloudinary' })
    }

    if (isVercel) return NextResponse.json({ error: 'File storage not configured. Add CLOUDINARY credentials to Vercel environment variables.' }, { status: 500 })

    const localPath = await saveLocally(file)
    await logToMediaSheet(localPath, file.type.startsWith('image/') ? 'image' : 'pdf', groomId, groomName, label)
    return NextResponse.json({ path: localPath, source: 'local' })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    console.error('Upload error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
