import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  const info: Record<string, string> = {
    cloud_name: cloudName || 'MISSING',
    api_key: apiKey ? apiKey.slice(0, 6) + '...' : 'MISSING',
    api_secret_length: String(apiSecret?.length ?? 0),
    api_secret_first6: apiSecret ? apiSecret.slice(0, 6) + '...' : 'MISSING',
    api_secret_last4: apiSecret ? '...' + apiSecret.slice(-4) : 'MISSING',
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ ...info, status: 'MISSING_CREDENTIALS' })
  }

  // Test actual upload with a tiny text file
  try {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const folder = 'rishtabook'
    const str = `folder=${folder}&timestamp=${timestamp}`
    const signature = createHash('sha1').update(str + apiSecret).digest('hex')

    info.string_to_sign = str
    info.computed_signature = signature.slice(0, 10) + '...'

    const body = new FormData()
    body.append('file', 'data:text/plain;base64,' + Buffer.from('test').toString('base64'))
    body.append('api_key', apiKey)
    body.append('timestamp', timestamp)
    body.append('folder', folder)
    body.append('signature', signature)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body })
    const data = await res.json()

    if (res.ok) {
      // Clean up the test file
      const delTimestamp = String(Math.floor(Date.now() / 1000))
      const publicId = data.public_id
      const delSig = createHash('sha1').update(`public_id=${publicId}&timestamp=${delTimestamp}` + apiSecret).digest('hex')
      const delBody = new FormData()
      delBody.append('public_id', publicId)
      delBody.append('api_key', apiKey)
      delBody.append('timestamp', delTimestamp)
      delBody.append('signature', delSig)
      await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body: delBody })

      return NextResponse.json({ ...info, status: 'SUCCESS', url: data.secure_url })
    } else {
      return NextResponse.json({ ...info, status: 'CLOUDINARY_ERROR', error: data.error?.message })
    }
  } catch (e) {
    return NextResponse.json({ ...info, status: 'ERROR', error: e instanceof Error ? e.message : String(e) })
  }
}
