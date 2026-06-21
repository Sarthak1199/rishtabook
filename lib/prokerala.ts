// Prokerala Kundli Matching API integration
// Get credentials at: https://api.prokerala.com

const PROKERALA_TOKEN_URL = 'https://api.prokerala.com/token'
const PROKERALA_API_BASE = 'https://api.prokerala.com/v2/astrology'

// Simple in-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const clientId = process.env.PROKERALA_CLIENT_ID
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Prokerala credentials not configured')

  const res = await fetch(PROKERALA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`Prokerala auth failed: ${res.status}`)
  const data = await res.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.token
}

// Geocode city name using Nominatim (OpenStreetMap, free, no key needed)
const coordsCache: Record<string, [number, number]> = {}
const INDIA_DEFAULT: [number, number] = [28.6139, 77.2090] // New Delhi fallback

async function geocode(city: string): Promise<[number, number]> {
  if (!city) return INDIA_DEFAULT
  const key = city.toLowerCase().trim()
  if (coordsCache[key]) return coordsCache[key]
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', India')}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'RishtaBook/1.0' } })
    const results = await res.json()
    if (results[0]) {
      const coords: [number, number] = [parseFloat(results[0].lat), parseFloat(results[0].lon)]
      coordsCache[key] = coords
      return coords
    }
  } catch { /* ignore geocoding failures */ }
  return INDIA_DEFAULT
}

// Convert DD/MM/YYYY + HH:MM (12hr or 24hr) to ISO 8601 with IST offset
function toISO(dob: string, time?: string): string {
  const [d, m, y] = (dob || '').split('/')
  if (!d || !m || !y) throw new Error(`Invalid DOB format: ${dob}`)
  let t = '12:00'
  if (time && /\d{1,2}:\d{2}/.test(time)) {
    const ampm = /am/i.test(time) ? 'am' : /pm/i.test(time) ? 'pm' : null
    const [hStr, minStr] = time.replace(/[^\d:]/g, '').split(':')
    let h = parseInt(hStr), min = parseInt(minStr)
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    t = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0')
  }
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${t}:00+05:30`
}

export interface ProkeralaKootScore {
  name: string
  max_points: number
  obtained_points: number
  description?: string
}

export interface ProkeralaMatchResult {
  total: number
  breakdown: ProkeralaKootScore[]
  girl_nakshatra: string
  boy_nakshatra: string
  girl_rasi: string
  boy_rasi: string
  message?: string
}

export async function fetchKundliMatching(
  bride: { dob: string; birth_time?: string; birth_place?: string },
  groom: { dob: string; birth_time?: string; birth_place?: string }
): Promise<ProkeralaMatchResult> {
  const token = await getAccessToken()

  const [girlLat, girlLon] = await geocode(bride.birth_place || '')
  const [boyLat, boyLon] = await geocode(groom.birth_place || '')

  const params = new URLSearchParams({
    ayanamsa: '1',
    girl_dob: toISO(bride.dob, bride.birth_time),
    girl_coordinates: `${girlLat},${girlLon}`,
    boy_dob: toISO(groom.dob, groom.birth_time),
    boy_coordinates: `${boyLat},${boyLon}`,
    la: 'en',
  })

  // Use advanced endpoint for full koot breakdown
  const url = `${PROKERALA_API_BASE}/kundli-matching/advanced?${params}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.text()
    // Sandbox mode: free tier only allows Jan 1st dates
    if (err.includes('sandbox') || err.includes('1004')) {
      throw new Error('SANDBOX: Prokerala free tier only allows Jan 1st dates. Upgrade to paid plan at api.prokerala.com for real dates.')
    }
    throw new Error(`Prokerala API error ${res.status}: ${err}`)
  }

  const json = await res.json()
  const data = json.data

  // Advanced endpoint uses guna[] array with id-based ordering (1=Varna..8=Nadi)
  const KOOT_NAMES = ['', 'Varna', 'Vashya', 'Tara', 'Yoni', 'Graha Maitri', 'Gana', 'Bhakoot', 'Nadi']
  const gunas: { id: number; name: unknown; maximum_points: number; obtained_points: number; description: unknown }[] = data.guna_milan?.guna ?? []

  const breakdown: ProkeralaKootScore[] = gunas.map(k => ({
    name: typeof k.name === 'string' ? k.name : KOOT_NAMES[k.id] ?? `Koot ${k.id}`,
    max_points: k.maximum_points,
    obtained_points: k.obtained_points,
    description: typeof k.description === 'string' ? k.description : undefined,
  }))

  return {
    total: data.guna_milan?.total_points ?? 0,
    breakdown,
    girl_nakshatra: data.girl_info?.nakshatra?.name ?? '',
    boy_nakshatra: data.boy_info?.nakshatra?.name ?? '',
    girl_rasi: data.girl_info?.rasi?.name ?? '',
    boy_rasi: data.boy_info?.rasi?.name ?? '',
    message: data.message,
  }
}

export function isProkeralaConfigured(): boolean {
  return !!(process.env.PROKERALA_CLIENT_ID && process.env.PROKERALA_CLIENT_SECRET)
}
