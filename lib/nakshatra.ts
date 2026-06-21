// Shared astronomical nakshatra derivation (no AI, no API)
// Uses astronomy-engine with Lahiri ayanamsa

const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']
const RASHIS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

function parseDob(dob: string): Date | null {
  if (!dob) return null
  let d: Date
  if (dob.includes('/')) {
    const parts = dob.split('/')
    if (parts.length === 3) d = new Date(+parts[2], +parts[1] - 1, +parts[0])
    else return null
  } else {
    d = new Date(dob)
  }
  return isNaN(d.getTime()) ? null : d
}

function lahiriAyanamsa(year: number): number {
  return 23.853 + (year - 2000) * (50.2388 / 3600)
}

export async function deriveNakshatraFromDob(
  dob: string,
  birth_time?: string
): Promise<{ nakshatra: string; rashi: string } | null> {
  try {
    const dobDate = parseDob(dob)
    if (!dobDate) return null

    const timeParts = (birth_time || '12:00').replace(/[^\d:]/g, '').split(':')
    const h = parseInt(timeParts[0] || '12')
    const m = parseInt(timeParts[1] || '0')

    // Treat birth time as IST (UTC+5:30)
    const utcDate = new Date(Date.UTC(
      dobDate.getFullYear(), dobDate.getMonth(), dobDate.getDate(),
      h - 5, m - 30, 0
    ))

    const Astronomy = await import('astronomy-engine')
    const ecliptic = Astronomy.EclipticGeoMoon(utcDate)
    const tropLon = ecliptic.lon

    const year = utcDate.getFullYear() + utcDate.getMonth() / 12
    const ayanamsa = lahiriAyanamsa(year)
    const siderealLon = ((tropLon - ayanamsa) % 360 + 360) % 360

    const nakIdx = Math.floor(siderealLon / (360 / 27))
    const rashiIdx = Math.floor(siderealLon / 30)

    return {
      nakshatra: NAKSHATRAS[nakIdx],
      rashi: RASHIS[rashiIdx],
    }
  } catch {
    return null
  }
}
