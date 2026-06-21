import { NextResponse } from 'next/server'

export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim()

  const info: Record<string, string> = {
    cloud_name: cloudName || 'MISSING',
    upload_preset: uploadPreset || 'MISSING',
    approach: 'unsigned',
  }

  if (!cloudName || !uploadPreset) {
    return NextResponse.json({ ...info, status: 'MISSING_CREDENTIALS', fix: 'Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET to Vercel env vars' })
  }

  try {
    const body = new FormData()
    body.append('file', 'data:text/plain;base64,' + Buffer.from('test').toString('base64'))
    body.append('upload_preset', uploadPreset)
    body.append('folder', 'rishtabook')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body })
    const data = await res.json()

    if (res.ok) {
      return NextResponse.json({ ...info, status: 'SUCCESS', url: data.secure_url, message: 'Cloudinary unsigned upload is working!' })
    } else {
      const errMsg = data.error?.message || JSON.stringify(data.error)
      let fix = 'Unknown error'
      if (errMsg?.includes('upload preset')) fix = `Preset "${uploadPreset}" does not exist in Cloudinary. Go to Settings > Upload > Upload Presets and create an UNSIGNED preset with that name.`
      else if (errMsg?.includes('Unknown API key') || errMsg?.includes('api_key')) fix = `Preset "${uploadPreset}" is set to SIGNED mode. Go to Cloudinary Settings > Upload > Upload Presets, find the preset and change "Signing Mode" to UNSIGNED.`
      return NextResponse.json({ ...info, status: 'CLOUDINARY_ERROR', error: errMsg, fix })
    }
  } catch (e) {
    return NextResponse.json({ ...info, status: 'ERROR', error: e instanceof Error ? e.message : String(e) })
  }
}
