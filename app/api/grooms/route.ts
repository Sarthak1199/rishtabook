import { NextRequest, NextResponse } from 'next/server'
import { readSheet, appendRow } from '@/lib/sheets'
import { getNakshatraIndex } from '@/lib/guna-milan'
import { deriveNakshatraFromDob } from '@/lib/nakshatra'
import { fetchKundliMatching, isProkeralaConfigured } from '@/lib/prokerala'

export const revalidate = 0

function generateGroomId() {
  return `GROOM_${Math.floor(10000 + Math.random() * 90000)}`
}

function calcAge(dob: string): string {
  if (!dob) return ''
  let d: Date
  if (dob.includes('/')) {
    const parts = dob.split('/')
    if (parts.length === 3) d = new Date(+parts[2], +parts[1] - 1, +parts[0])
    else return ''
  } else {
    d = new Date(dob)
  }
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age > 0 && age < 120 ? String(age) : ''
}

export async function GET() {
  try {
    const rows = await readSheet('Grooms')
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch grooms' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Resolve nakshatra — use explicit value or derive from DOB
    let nakshatra = body.nakshatra || ''
    let rashi = body.rashi || ''
    if (!nakshatra && body.dob) {
      const derived = await deriveNakshatraFromDob(body.dob, body.birth_time)
      if (derived) { nakshatra = derived.nakshatra; rashi = rashi || derived.rashi }
    }

    // Auto guna score — use Prokerala API when available, no local fallback (avoids wrong scores)
    let gunaScore = ''
    try {
      const profileRows = await readSheet('MyProfile')
      const profile = profileRows[0]
      if (profile && isProkeralaConfigured() && body.dob && profile.dob) {
        const pk = await fetchKundliMatching(
          { dob: profile.dob, birth_time: profile.birth_time, birth_place: profile.birth_place },
          { dob: body.dob, birth_time: body.birth_time, birth_place: body.birth_place }
        )
        gunaScore = String(pk.total)
      } else if (profile?.nakshatra && nakshatra) {
        // Only use local if Prokerala not configured
        if (!isProkeralaConfigured()) {
          const { calculateGunaMilan } = await import('@/lib/guna-milan')
          const bi = getNakshatraIndex(profile.nakshatra)
          const gi = getNakshatraIndex(nakshatra)
          if (bi !== -1 && gi !== -1) gunaScore = String(calculateGunaMilan(bi, gi).total)
        }
      }
    } catch { /* non-fatal — score left blank rather than wrong */ }

    const id = body.id || generateGroomId()
    const age = calcAge(body.dob || '')

    const values = [
      id,
      body.timestamp || new Date().toISOString(),
      body.name || '',
      body.dob || '',
      body.birth_time || '',
      body.birth_place || '',
      body.phone || '',
      body.location || '',
      body.education || '',
      body.income || '',
      nakshatra,
      rashi,
      body.gotra || '',
      body.manglik || '',
      body.family_details || '',
      body.about || '',
      body.agent_id || '',
      body.agent_name || '',
      body.photo_paths || '',
      body.pdf_path || '',
      body.status || 'Pending',
      body.notes || '',
      gunaScore,
      body.occupation || '',
      age,
    ]
    await appendRow('Grooms', values)
    return NextResponse.json({ ok: true, id })
  } catch {
    return NextResponse.json({ error: 'Failed to add groom' }, { status: 500 })
  }
}
