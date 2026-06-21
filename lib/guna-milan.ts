const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']

const RASHIS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

// Purva Bhadrapada(24) is Aquarius(10), not Pisces
const NAK_TO_RASHI = [0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,7,8,8,9,9,10,10,10,11,11]

// Corrected: Rohini(3)=Manava(1), Mrigashira(4)=Deva(0), Ardra(5)=Manava(1)
const GANA = [0,1,2,1,0,1,0,0,2,2,1,1,0,2,0,2,0,2,2,1,1,0,2,2,1,1,0]

const NADI = [0,1,2,2,1,0,0,1,2,2,1,0,0,1,2,2,1,0,0,1,2,2,1,0,0,1,2]

const YONI: [string, string][] = [['Horse','M'],['Elephant','M'],['Goat','F'],['Serpent','M'],['Serpent','F'],['Dog','F'],['Cat','F'],['Goat','M'],['Cat','M'],['Rat','M'],['Rat','F'],['Cow','M'],['Buffalo','F'],['Tiger','F'],['Buffalo','M'],['Tiger','M'],['Deer','F'],['Deer','M'],['Dog','M'],['Monkey','F'],['Mongoose','-'],['Monkey','M'],['Lion','F'],['Horse','F'],['Lion','M'],['Cow','F'],['Elephant','F']]

const VARNA = [1,2,3,0,1,2,3,0,1,2,3,0]

const RASHI_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']

const PLANET_FRIENDS: Record<string, string[]> = {
  Sun: ['Moon','Mars','Jupiter'], Moon: ['Sun','Mercury'], Mars: ['Sun','Moon','Jupiter'],
  Mercury: ['Sun','Venus'], Jupiter: ['Sun','Moon','Mars'], Venus: ['Mercury','Saturn'],
  Saturn: ['Mercury','Venus']
}

const PLANET_ENEMIES: Record<string, string[]> = {
  Sun: ['Saturn','Venus'], Moon: ['Saturn'], Mars: ['Mercury'],
  Mercury: ['Moon'], Jupiter: ['Mercury','Venus'], // Saturn is neutral to Jupiter, not enemy
  Venus: ['Sun','Moon'], Saturn: ['Sun','Moon','Mars']
}

// 3-tier per standard Ashtakoot formula: mutual friends=5, any enemy=0, else (neutral/one-way)=3
function grahaScore(lord1: string, lord2: string): number {
  if (lord1 === lord2) return 5
  const f1 = PLANET_FRIENDS[lord1]?.includes(lord2)
  const f2 = PLANET_FRIENDS[lord2]?.includes(lord1)
  const e1 = PLANET_ENEMIES[lord1]?.includes(lord2)
  const e2 = PLANET_ENEMIES[lord2]?.includes(lord1)
  if (f1 && f2) return 5
  if (e1 || e2) return 0
  return 3
}

export interface KootaResult {
  name: string
  maxPoints: number
  score: number
  detail: string
}

export interface GunaMilanResult {
  total: number
  breakdown: KootaResult[]
  doshas: string[]
  summary: string
}

const NAKSHATRA_ALIASES: Record<string, string> = {
  'ashvini': 'ashwini', 'aswini': 'ashwini', 'asvini': 'ashwini',
  'mrigasira': 'mrigashira', 'mrigarshira': 'mrigashira', 'mrigasirsa': 'mrigashira',
  'aslesa': 'ashlesha', 'aslesha': 'ashlesha',
  'poorva phalguni': 'purva phalguni', 'purva phalguni': 'purva phalguni',
  'uttara phalguni': 'uttara phalguni',
  'chitta': 'chitra',
  'svati': 'swati',
  'visakha': 'vishakha', 'visaka': 'vishakha',
  'jyestha': 'jyeshtha', 'jyesta': 'jyeshtha',
  'moola': 'mula', 'mool': 'mula',
  'poorva ashadha': 'purva ashadha', 'purva asadha': 'purva ashadha',
  'uttara ashadha': 'uttara ashadha', 'uttara asadha': 'uttara ashadha',
  'shravan': 'shravana', 'sravana': 'shravana',
  'dhanistha': 'dhanishtha', 'dhanista': 'dhanishtha', 'dhanishta': 'dhanishtha',
  'satabhisha': 'shatabhisha', 'satabisha': 'shatabhisha', 'shatataraka': 'shatabhisha',
  'purva bhadra': 'purva bhadrapada', 'purva bhadrapad': 'purva bhadrapada',
  'uttara bhadra': 'uttara bhadrapada', 'uttara bhadrapad': 'uttara bhadrapada',
}

export function getNakshatraIndex(name: string): number {
  if (!name) return -1
  const normalized = name.trim().toLowerCase()
  const canonical = NAKSHATRA_ALIASES[normalized] || normalized
  return NAKSHATRAS.findIndex(n => n.toLowerCase() === canonical)
}

export function calculateGunaMilan(brideNak: number, groomNak: number): GunaMilanResult {
  const breakdown: KootaResult[] = []
  const doshas: string[] = []

  // 1. Varna (1 point) — 0=Brahmin(highest), 3=Shudra(lowest); groom must be equal or higher (<=)
  const brideRashi = NAK_TO_RASHI[brideNak]
  const groomRashi = NAK_TO_RASHI[groomNak]
  const brideVarna = VARNA[brideRashi]
  const groomVarna = VARNA[groomRashi]
  const varnaScore = groomVarna <= brideVarna ? 1 : 0
  breakdown.push({ name: 'Varna', maxPoints: 1, score: varnaScore, detail: `Bride: ${['Brahmin','Kshatriya','Vaishya','Shudra'][brideVarna]}, Groom: ${['Brahmin','Kshatriya','Vaishya','Shudra'][groomVarna]}` })

  // 2. Vashya (2 points)
  const vashyaGroups = [[4,8],[1,5,9],[3,7,11],[0,6,10],[2],[]]
  let vashyaScore = 0
  for (const group of vashyaGroups) {
    if (group.includes(brideRashi) && group.includes(groomRashi)) { vashyaScore = 2; break }
    if (group.includes(brideRashi) || group.includes(groomRashi)) { vashyaScore = 1; break }
  }
  breakdown.push({ name: 'Vashya', maxPoints: 2, score: vashyaScore, detail: `Bride Rashi: ${RASHIS[brideRashi]}, Groom Rashi: ${RASHIS[groomRashi]}` })

  // 3. Tara (3 points) — bidirectional, mod-9 cycle. Formula bad set = {3,5,7}; all others including Janma(1) are good
  const GOOD_TARAS = new Set([1,2,4,6,8,9])
  const TARA_NAMES = ['','Janma','Sampat','Vipat','Kshema','Pratyak','Sadhaka','Vadha','Mitra','Ati-Mitra']
  const brideCount = ((groomNak - brideNak + 27) % 27) + 1
  const brideTara = ((brideCount - 1) % 9) + 1
  const groomCount = ((brideNak - groomNak + 27) % 27) + 1
  const groomTara = ((groomCount - 1) % 9) + 1
  const brideGood = GOOD_TARAS.has(brideTara)
  const groomGood = GOOD_TARAS.has(groomTara)
  const taraScore = (brideGood && groomGood) ? 3 : (brideGood || groomGood) ? 1.5 : 0
  breakdown.push({ name: 'Tara', maxPoints: 3, score: taraScore, detail: `Bride: ${TARA_NAMES[brideTara]}, Groom: ${TARA_NAMES[groomTara]}` })

  // 4. Yoni (4 points) — 4-tier: same opp-sex=4, same same-sex=3, neutral=2, bitter enemies=0
  const brideYoni = YONI[brideNak]
  const groomYoni = YONI[groomNak]
  // Bitter enemy pairs (both directions already covered by the bidirectional check)
  const bitterEnemies: Record<string, string> = { Horse: 'Buffalo', Elephant: 'Lion', Goat: 'Monkey', Serpent: 'Mongoose', Dog: 'Deer', Cat: 'Rat', Cow: 'Tiger', Buffalo: 'Horse', Tiger: 'Cow', Deer: 'Dog', Rat: 'Cat', Monkey: 'Goat', Lion: 'Elephant', Mongoose: 'Serpent' }
  let yoniScore = 0
  if (brideYoni[0] === groomYoni[0]) {
    yoniScore = brideYoni[1] !== groomYoni[1] ? 4 : 3  // opposite sex=4, same sex=3
  } else if (bitterEnemies[brideYoni[0]] === groomYoni[0] || bitterEnemies[groomYoni[0]] === brideYoni[0]) {
    yoniScore = 0  // bitter enemies
  } else {
    yoniScore = 2  // neutral (different animals, not enemies)
  }
  breakdown.push({ name: 'Yoni', maxPoints: 4, score: yoniScore, detail: `Bride: ${brideYoni[0]}, Groom: ${groomYoni[0]}` })

  // 5. Graha Maitri (5 points)
  const brideLord = RASHI_LORD[brideRashi]
  const groomLord = RASHI_LORD[groomRashi]
  const grahaS = grahaScore(brideLord, groomLord)
  breakdown.push({ name: 'Graha Maitri', maxPoints: 5, score: grahaS, detail: `Bride lord: ${brideLord}, Groom lord: ${groomLord}` })

  // 6. Gana (6 points)
  const brideGana = GANA[brideNak]
  const groomGana = GANA[groomNak]
  let ganaScore = 0
  if (brideGana === groomGana) ganaScore = 6
  else if (brideGana === 0 && groomGana === 1) ganaScore = 5
  else if (brideGana === 1 && groomGana === 0) ganaScore = 3
  else if (brideGana === 0 && groomGana === 2) ganaScore = 1
  else if (brideGana === 2 && groomGana === 0) ganaScore = 0
  else ganaScore = 0
  const ganaNames = ['Deva','Manava','Rakshasa']
  if (brideGana !== groomGana && (brideGana === 2 || groomGana === 2)) {
    doshas.push(`Gana Dosha: ${ganaNames[brideGana]} (bride) + ${ganaNames[groomGana]} (groom) mismatch`)
  }
  breakdown.push({ name: 'Gana', maxPoints: 6, score: ganaScore, detail: `Bride: ${ganaNames[brideGana]}, Groom: ${ganaNames[groomGana]}` })

  // 7. Bhakoot (7 points)
  const rashiDiff = ((groomRashi - brideRashi + 12) % 12) + 1
  const badBhakoot = [2, 5, 6, 8, 9, 12]
  const bhakootScore = badBhakoot.includes(rashiDiff) ? 0 : 7
  if (badBhakoot.includes(rashiDiff)) {
    doshas.push(`Bhakoot Dosha: ${rashiDiff}-12 pattern detected`)
  }
  breakdown.push({ name: 'Bhakoot', maxPoints: 7, score: bhakootScore, detail: `Rashi interval: ${rashiDiff}` })

  // 8. Nadi (8 points)
  const brideNadi = NADI[brideNak]
  const groomNadi = NADI[groomNak]
  const nadiScore = brideNadi !== groomNadi ? 8 : 0
  if (brideNadi === groomNadi) {
    doshas.push(`Nadi Dosha: Both have ${['Vata','Pitta','Kapha'][brideNadi]} Nadi — this is the most serious dosha`)
  }
  const nadiNames = ['Vata','Pitta','Kapha']
  breakdown.push({ name: 'Nadi', maxPoints: 8, score: nadiScore, detail: `Bride: ${nadiNames[brideNadi]}, Groom: ${nadiNames[groomNadi]}` })

  const total = Math.round(breakdown.reduce((sum, k) => sum + k.score, 0) * 2) / 2

  let summary = ''
  if (total >= 32) summary = 'Excellent match — highly compatible in all aspects.'
  else if (total >= 27) summary = 'Very good match — recommended for marriage.'
  else if (total >= 18) summary = 'Average match — acceptable with consideration.'
  else summary = 'Below average match — careful consideration advised.'

  if (doshas.length > 0) {
    summary += ` Note: ${doshas.length} dosha(s) detected that may need attention.`
  }

  return { total, breakdown, doshas, summary }
}

export { NAKSHATRAS, RASHIS }
