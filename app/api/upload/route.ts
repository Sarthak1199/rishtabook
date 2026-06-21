import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const isVercel = !!process.env.VERCEL

    // Use Cloudinary when configured
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
      return NextResponse.json({ path: data.secure_url, source: 'cloudinary' })
    }

    // Local fallback for development only
    if (isVercel) return NextResponse.json({ error: 'File storage not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to Vercel environment variables.' }, { status: 500 })
    const localPath = await saveLocally(file)
    return NextResponse.json({ path: localPath, source: 'local' })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    console.error('Upload error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
