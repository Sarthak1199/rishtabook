import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { girl_dob, boy_dob, girl_time, boy_time, girl_place, boy_place } = await req.json()

  const clientId = process.env.PROKERALA_CLIENT_ID
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'Prokerala not configured' })

  const tokenRes = await fetch('https://api.prokerala.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  })
  const { access_token } = await tokenRes.json()

  function toISO(dob: string, time?: string) {
    const [d, m, y] = dob.split('/')
    let t = '12:00'
    if (time && /\d{1,2}:\d{2}/.test(time)) {
      const ampm = /am/i.test(time) ? 'am' : /pm/i.test(time) ? 'pm' : null
      const [hStr, minStr] = time.replace(/[^\d:]/g, '').split(':')
      let h = parseInt(hStr); const min = parseInt(minStr)
      if (ampm === 'pm' && h !== 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      t = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0')
    }
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${t}:00+05:30`
  }

  async function geocode(city: string): Promise<[number, number]> {
    if (!city) return [28.6139, 77.2090]
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', India')}&format=json&limit=1`, { headers: { 'User-Agent': 'RishtaBook/1.0' } })
      const results = await r.json()
      if (results[0]) return [parseFloat(results[0].lat), parseFloat(results[0].lon)]
    } catch { /* ignore */ }
    return [28.6139, 77.2090]
  }

  const [gLat, gLon] = await geocode(girl_place || '')
  const [bLat, bLon] = await geocode(boy_place || '')

  const params = new URLSearchParams({
    ayanamsa: '1',
    girl_dob: toISO(girl_dob, girl_time),
    girl_coordinates: `${gLat},${gLon}`,
    boy_dob: toISO(boy_dob, boy_time),
    boy_coordinates: `${bLat},${bLon}`,
    la: 'en',
  })

  const url = `https://api.prokerala.com/v2/astrology/kundli-matching/advanced?${params}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } })
  const raw = await res.json()

  const gunas = raw.data?.guna_milan?.guna ?? []
  const parsed = gunas.map((k: { id: number; name: unknown; maximum_points: number; obtained_points: number }) => ({
    id: k.id,
    name: k.name,
    max: k.maximum_points,
    obtained: k.obtained_points,
  }))

  return NextResponse.json({
    total_from_api: raw.data?.guna_milan?.total_points,
    parsed_koots: parsed,
    sum_of_parsed: parsed.reduce((s: number, k: { obtained: number }) => s + k.obtained, 0),
    girl_nakshatra: raw.data?.girl_info?.nakshatra?.name,
    boy_nakshatra: raw.data?.boy_info?.nakshatra?.name,
    girl_coordinates_used: `${gLat},${gLon}`,
    boy_coordinates_used: `${bLat},${bLon}`,
    girl_dob_iso: toISO(girl_dob, girl_time),
    boy_dob_iso: toISO(boy_dob, boy_time),
  })
}
