import { NextRequest, NextResponse } from 'next/server'
import { calculateGunaMilan, getNakshatraIndex } from '@/lib/guna-milan'
import { deriveNakshatraFromDob } from '@/lib/nakshatra'
import { fetchKundliMatching, isProkeralaConfigured } from '@/lib/prokerala'
import { getCachedGuna, setCachedGuna } from '@/lib/gunaCache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bride, groom, groomId } = body

    // Return cached result if available (avoids repeat API calls for same groom)
    if (groomId) {
      const cached = getCachedGuna(groomId)
      if (cached) return NextResponse.json(cached)
    }

    // Use Prokerala API when credentials are configured — authoritative calculation
    if (isProkeralaConfigured() && bride.dob && groom.dob) {
      try {
        const pk = await fetchKundliMatching(
          { dob: bride.dob, birth_time: bride.birth_time, birth_place: bride.birth_place },
          { dob: groom.dob, birth_time: groom.birth_time, birth_place: groom.birth_place }
        )
        const breakdown = pk.breakdown.map(k => ({
          name: k.name, maxPoints: k.max_points, score: k.obtained_points, detail: k.description ?? '',
        }))
        const total = pk.total
        const doshas: string[] = pk.breakdown
          .filter(k => k.obtained_points === 0 && ['Nadi', 'Bhakoot', 'Gana'].includes(k.name))
          .map(k => `${k.name} Dosha`)
        let summary = total >= 32 ? 'Excellent match — highly compatible in all aspects.'
          : total >= 27 ? 'Very good match — recommended for marriage.'
          : total >= 18 ? 'Average match — acceptable with consideration.'
          : 'Below average match — careful consideration advised.'
        if (doshas.length) summary += ` Note: ${doshas.length} dosha(s) detected.`
        const result = {
          total, breakdown, doshas, summary, source: 'prokerala',
          nakshatras: { bride: pk.girl_nakshatra, groom: pk.boy_nakshatra, brideRasi: pk.girl_rasi, groomRasi: pk.boy_rasi },
        }
        if (groomId) setCachedGuna(groomId, result)
        return NextResponse.json(result)
      } catch (e) {
        console.warn('Prokerala failed, falling back to local:', e instanceof Error ? e.message : e)
      }
    }

    let brideNak = getNakshatraIndex(bride.nakshatra || '')
    let groomNak = getNakshatraIndex(groom.nakshatra || '')
    let derived = false
    const derivedNames = { bride: bride.nakshatra || '', groom: groom.nakshatra || '' }

    if (brideNak === -1 && bride.dob) {
      const d = await deriveNakshatraFromDob(bride.dob, bride.birth_time)
      if (d) { derivedNames.bride = d.nakshatra; brideNak = getNakshatraIndex(d.nakshatra); derived = true }
    }
    if (groomNak === -1 && groom.dob) {
      const d = await deriveNakshatraFromDob(groom.dob, groom.birth_time)
      if (d) { derivedNames.groom = d.nakshatra; groomNak = getNakshatraIndex(d.nakshatra); derived = true }
    }

    if (brideNak === -1) return NextResponse.json({ error: "Could not determine bride's Nakshatra. Please enter it in My Profile." }, { status: 400 })
    if (groomNak === -1) return NextResponse.json({ error: "Could not determine groom's Nakshatra. Please enter it in the groom's profile, or add their Date of Birth." }, { status: 400 })

    const result = calculateGunaMilan(brideNak, groomNak)

    return NextResponse.json({
      ...result,
      derivedNakshatras: derived ? {
        bride: derivedNames.bride,
        groom: derivedNames.groom,
        disclaimer: 'Nakshatra calculated from DOB using astronomical ephemeris (Lahiri ayanamsa). Accurate to within ±1 nakshatra near boundaries — verify with a pandit for final decisions.'
      } : null
    })
  } catch (error) {
    console.error('Guna milan error:', error)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
