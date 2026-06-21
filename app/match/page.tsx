'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import AppLayout from '@/components/AppLayout'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle, AlertCircle, MinusCircle, Loader2, Upload } from 'lucide-react'
import clsx from 'clsx'

interface Groom {
  id: string
  name: string
  nakshatra: string
  rashi: string
  dob: string
  birth_time: string
  birth_place: string
}

interface Profile {
  name: string
  nakshatra: string
  rashi: string
  dob: string
  birth_time: string
  birth_place: string
}

interface KootaResult {
  name: string
  maxPoints: number
  score: number
  detail: string
}

interface GunaMilanResult {
  total: number
  breakdown: KootaResult[]
  doshas: string[]
  summary: string
  source?: 'prokerala' | 'local'
  nakshatras?: { bride: string; groom: string; brideRasi: string; groomRasi: string }
  derivedNakshatras?: { bride: string; groom: string; disclaimer: string } | null
}

function MatchContent() {
  const searchParams = useSearchParams()
  const preselectedGroomId = searchParams.get('groomId')

  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [grooms, setGrooms] = useState<Groom[]>([])
  const [selectedGroomId, setSelectedGroomId] = useState(preselectedGroomId || '')
  const [groomMode, setGroomMode] = useState<'existing' | 'pdf'>('existing')
  const [extractedGroom, setExtractedGroom] = useState<Partial<Groom>>({})
  const [result, setResult] = useState<GunaMilanResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [expandedKoots, setExpandedKoots] = useState<Set<string>>(new Set())
  const pdfInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/my-profile').then(r => r.json()).then(setMyProfile).catch(() => {})
    fetch('/api/grooms').then(r => r.json()).then(data => setGrooms(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const selectedGroom = groomMode === 'existing'
    ? grooms.find(g => g.id === selectedGroomId)
    : extractedGroom as Groom

  const handlePdfExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setExtractedGroom({
        name: data.name,
        nakshatra: data.nakshatra,
        rashi: data.rashi,
        dob: data.dob,
        birth_time: data.birth_time,
        birth_place: data.birth_place,
      })
      toast.success('Groom profile extracted!')
    } catch {
      toast.error('Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  const handleCalculate = async () => {
    if (!myProfile) { toast.error('Please set up your profile first'); return }
    if (!myProfile.nakshatra && !myProfile.dob) { toast.error('Please add at least DOB or Nakshatra to your profile'); return }
    if (!selectedGroom) { toast.error('Please select a groom'); return }
    if (!selectedGroom.nakshatra && !selectedGroom.dob) { toast.error('Selected groom has no Nakshatra or DOB — please update their profile'); return }

    setCalculating(true)
    try {
      const res = await fetch('/api/guna-milan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groomId: groomMode === 'existing' ? selectedGroomId : undefined,
          bride: { nakshatra: myProfile.nakshatra, rashi: myProfile.rashi, dob: myProfile.dob, birth_time: myProfile.birth_time, birth_place: myProfile.birth_place },
          groom: { nakshatra: selectedGroom.nakshatra, rashi: selectedGroom.rashi, dob: selectedGroom.dob, birth_time: selectedGroom.birth_time, birth_place: selectedGroom.birth_place },
        }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setResult(data)
    } catch {
      toast.error('Calculation failed')
    } finally {
      setCalculating(false)
    }
  }

  // Nakshatra → Gana lookup for reliable fallback (when API description parsing fails)
  const NAKSHATRA_GANA: Record<string, string> = {
    Ashwini: 'Deva', Bharani: 'Manava', Krittika: 'Rakshasa', Rohini: 'Manava',
    Mrigashira: 'Deva', Ardra: 'Manava', Punarvasu: 'Deva', Pushya: 'Deva',
    Ashlesha: 'Rakshasa', Magha: 'Rakshasa', 'Purva Phalguni': 'Manava',
    'Uttara Phalguni': 'Manava', Hasta: 'Deva', Chitra: 'Rakshasa', Swati: 'Deva',
    Vishakha: 'Rakshasa', Anuradha: 'Deva', Jyeshtha: 'Rakshasa', Mula: 'Rakshasa',
    'Purva Ashadha': 'Manava', 'Uttara Ashadha': 'Manava', Shravana: 'Deva',
    Dhanishtha: 'Rakshasa', Shatabhisha: 'Rakshasa', 'Purva Bhadrapada': 'Manava',
    'Uttara Bhadrapada': 'Manava', Revati: 'Deva',
  }

  const getScoreColor = (score: number) => {
    if (score >= 33) return '#2E7D32'
    if (score >= 25) return '#1565C0'
    if (score >= 18) return '#E65100'
    return '#C62828'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 33) return 'Excellent Match'
    if (score >= 25) return 'Good Match'
    if (score >= 18) return 'Average Match'
    return 'Not Recommended'
  }

  const getKootaIcon = (score: number, max: number) => {
    const pct = score / max
    if (pct >= 0.7) return <CheckCircle size={18} className="text-[#2E7D32]" />
    if (pct >= 0.4) return <MinusCircle size={18} className="text-[#E65100]" />
    return <AlertCircle size={18} className="text-[#C62828]" />
  }

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-[#1C1C1E] mb-6">Match Analysis (Guna Milan)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left panel */}
          <div className="space-y-4">
            {!myProfile && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                My Profile not set up. <a href="/my-profile" className="font-semibold underline">Set it up →</a>
              </div>
            )}
            {/* Groom selection */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-5">
              <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-3">Groom Profile</h2>

              {/* Mode toggle */}
              <div className="flex rounded-lg border border-[#E8E8E4] overflow-hidden mb-4">
                <button
                  onClick={() => setGroomMode('existing')}
                  className={clsx('flex-1 py-2 text-sm font-medium transition-colors', groomMode === 'existing' ? 'bg-[#C2185B] text-white' : 'text-[#6B6B6B] hover:bg-[#FAFAF8]')}
                >
                  Select Existing
                </button>
                <button
                  onClick={() => setGroomMode('pdf')}
                  className={clsx('flex-1 py-2 text-sm font-medium transition-colors', groomMode === 'pdf' ? 'bg-[#C2185B] text-white' : 'text-[#6B6B6B] hover:bg-[#FAFAF8]')}
                >
                  Upload New PDF
                </button>
              </div>

              {groomMode === 'existing' ? (
                <select
                  value={selectedGroomId}
                  onChange={e => setSelectedGroomId(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
                >
                  <option value="">Select a groom...</option>
                  {grooms.map(g => (
                    <option key={g.id} value={g.id}>{g.name} — {g.nakshatra || 'No nakshatra'}</option>
                  ))}
                </select>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={extracting}
                    className="flex items-center gap-2 bg-[#FCE4EC] text-[#C2185B] px-4 py-2.5 rounded-lg font-medium hover:bg-pink-100 w-fit disabled:opacity-60"
                  >
                    {extracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {extracting ? 'Extracting...' : 'Upload PDF & Extract'}
                  </button>
                  <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfExtract} />
                  {extractedGroom.name && (
                    <div className="mt-3 p-3 bg-[#FAFAF8] rounded-lg">
                      <p className="font-medium text-[#1C1C1E]">{extractedGroom.name}</p>
                      <p className="text-sm text-[#6B6B6B]">Nakshatra: {extractedGroom.nakshatra || 'Not found'}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedGroom?.nakshatra && groomMode === 'existing' && (
                <div className="mt-3 p-3 bg-[#FAFAF8] rounded-lg">
                  <p className="font-medium text-[#1C1C1E]">{selectedGroom.name}</p>
                  <p className="text-sm text-[#6B6B6B]">Nakshatra: <span className="text-[#1C1C1E] font-medium">{selectedGroom.nakshatra}</span></p>
                </div>
              )}
            </div>

            <button
              onClick={handleCalculate}
              disabled={calculating || !myProfile || !selectedGroom}
              className="w-full bg-[#C2185B] text-white py-4 rounded-xl font-semibold text-base hover:bg-[#AD1457] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {calculating ? <><Loader2 size={20} className="animate-spin" /> Calculating...</> : 'Calculate Compatibility'}
            </button>
          </div>

          {/* Right panel — Results */}
          <div>
            {result ? (
              <div className="space-y-4">
                {/* Score circle */}
                <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 flex flex-col items-center">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="58" fill="none" stroke="#E8E8E4" strokeWidth="10" />
                    <circle
                      cx="70" cy="70" r="58"
                      fill="none"
                      stroke={getScoreColor(result.total)}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(result.total / 36) * 364} 364`}
                      transform="rotate(-90 70 70)"
                    />
                    <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="700" fill={getScoreColor(result.total)}>{result.total}</text>
                    <text x="70" y="85" textAnchor="middle" fontSize="14" fill="#6B6B6B">out of 36</text>
                  </svg>
                  <p className="text-xl font-semibold mt-2" style={{ color: getScoreColor(result.total) }}>{getScoreLabel(result.total)}</p>
                </div>

                {/* Koota breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  {result.breakdown.map(k => {
                    const isExpanded = expandedKoots.has(k.name)
                    const firstLine = k.detail?.split('.')[0] ?? ''
                    const hasMore = k.detail && k.detail.length > firstLine.length + 1
                    return (
                      <div key={k.name} className="bg-white rounded-xl border border-[#E8E8E4] p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-[#1C1C1E]">{k.name}</span>
                          {getKootaIcon(k.score, k.maxPoints)}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold" style={{ color: getScoreColor((k.score / k.maxPoints) * 36) }}>{k.score}</span>
                          <span className="text-[#6B6B6B] text-sm">/{k.maxPoints}</span>
                        </div>
                        {k.detail && (
                          <div className="mt-1">
                            <p className="text-xs text-[#6B6B6B]">
                              {isExpanded ? k.detail : firstLine + (hasMore ? '.' : '')}
                            </p>
                            {hasMore && (
                              <button
                                type="button"
                                onClick={() => setExpandedKoots(prev => {
                                  const next = new Set(prev)
                                  isExpanded ? next.delete(k.name) : next.add(k.name)
                                  return next
                                })}
                                className="text-xs text-[#C2185B] font-medium mt-0.5 hover:underline"
                              >
                                {isExpanded ? 'Read less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Gana Personality */}
                {(() => {
                  const ganaKoota = result.breakdown.find(k => k.name === 'Gana' || k.name === 'Gana Koot')
                  if (!ganaKoota) return null
                  const detail = ganaKoota.detail || ''
                  // Normalize Prokerala names: Devata→Deva, Manushya→Manava
                  const normalizeGana = (g: string) =>
                    g === 'Devata' ? 'Deva' : g === 'Manushya' ? 'Manava' : g
                  // Try local format first: "Bride: Deva" / "Groom: Manava"
                  let brideGana = normalizeGana(detail.match(/Bride:\s*(\w+)/)?.[1] || '')
                  let groomGana = normalizeGana(detail.match(/Groom:\s*(\w+)/)?.[1] || '')
                  // Prokerala format: "boy's Gana is Devata" / "girl comes under Rakshasa Gana"
                  if (!brideGana) {
                    const m = detail.match(/girl(?:'s)?\s+(?:Gana\s+is|comes\s+under)\s+(\w+)/i) ||
                              detail.match(/(\w+)\s+Gana.*girl/i)
                    brideGana = normalizeGana(m?.[1] || '')
                  }
                  if (!groomGana) {
                    const m = detail.match(/boy(?:'s)?\s+(?:Gana\s+is|comes\s+under)\s+(\w+)/i) ||
                              detail.match(/(\w+)\s+Gana.*boy/i)
                    groomGana = normalizeGana(m?.[1] || '')
                  }
                  // Fallback: derive gana from nakshatra name using local table
                  if (!brideGana && result.nakshatras?.bride) {
                    brideGana = NAKSHATRA_GANA[result.nakshatras.bride] || ''
                  }
                  if (!groomGana && result.nakshatras?.groom) {
                    groomGana = NAKSHATRA_GANA[result.nakshatras.groom] || ''
                  }
                  const GANA_INFO: Record<string, { emoji: string; trait: string; description: string }> = {
                    Deva: { emoji: '😇', trait: 'Divine / Sattvic', description: 'Gentle, spiritual, idealistic, forgiving. Prefers harmony and peace. Values ethics and tradition.' },
                    Manava: { emoji: '🧑', trait: 'Human / Rajasic', description: 'Practical, ambitious, balanced. Mixes logic with emotion. Adaptable to situations and people.' },
                    Rakshasa: { emoji: '💪', trait: 'Fierce / Tamasic', description: 'Strong-willed, independent, intense. Can be dominating but fiercely loyal. Driven by instinct and passion.' },
                  }
                  const brideInfo = GANA_INFO[brideGana]
                  const groomInfo = GANA_INFO[groomGana]
                  if (!brideInfo || !groomInfo) return null
                  return (
                    <div className="bg-white rounded-xl border border-[#E8E8E4] p-5">
                      <h4 className="font-semibold text-[#1C1C1E] mb-3 text-sm">Personality Nature (Gana)</h4>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <span className="text-2xl">{brideInfo.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-[#1C1C1E]">Girl — {brideGana} ({brideInfo.trait})</p>
                            <p className="text-xs text-[#6B6B6B] mt-0.5">{brideInfo.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-2xl">{groomInfo.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-[#1C1C1E]">Groom — {groomGana} ({groomInfo.trait})</p>
                            <p className="text-xs text-[#6B6B6B] mt-0.5">{groomInfo.description}</p>
                          </div>
                        </div>
                        {brideGana === groomGana
                          ? <p className="text-xs text-[#2E7D32] bg-green-50 rounded-lg px-3 py-2">Same Gana — excellent temperament match. Similar nature leads to understanding and harmony.</p>
                          : brideGana === 'Deva' && groomGana === 'Manava'
                          ? <p className="text-xs text-[#E65100] bg-orange-50 rounded-lg px-3 py-2">Deva+Manava — generally compatible. The groom's practicality balances the bride's idealism.</p>
                          : (brideGana === 'Rakshasa' || groomGana === 'Rakshasa')
                          ? <p className="text-xs text-[#C62828] bg-red-50 rounded-lg px-3 py-2">Rakshasa combination — temperament mismatch may cause friction. Strong personalities need mutual respect.</p>
                          : <p className="text-xs text-[#6B6B6B] bg-gray-50 rounded-lg px-3 py-2">Different Ganas — requires understanding and adjustment from both sides.</p>
                        }
                      </div>
                    </div>
                  )
                })()}

                {/* Doshas */}
                {result.doshas.length > 0 && (
                  <div className="space-y-2">
                    {result.doshas.map((d, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                        <AlertCircle size={18} className="text-[#C62828] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-[#C62828]">{d}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Source badge */}
                {result.source === 'prokerala' ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs text-green-800 font-medium">Calculated via Prokerala API — authoritative Vedic astrology using precise birth coordinates &amp; Lahiri ayanamsa.</p>
                    {result.nakshatras && (
                      <p className="text-xs text-green-700 mt-1">Girl: {result.nakshatras.bride} ({result.nakshatras.brideRasi}) · Boy: {result.nakshatras.groom} ({result.nakshatras.groomRasi})</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-800">⚠️ Using local calculation. Add <span className="font-semibold">PROKERALA_CLIENT_ID</span> + <span className="font-semibold">PROKERALA_CLIENT_SECRET</span> in .env.local for authoritative API scores. Score also depends on correct Nakshatra in <a href="/my-profile" className="font-semibold underline">My Profile</a>.</p>
                  </div>
                )}

                {/* AI disclaimer if nakshatra was derived (local mode only) */}
                {result.derivedNakshatras && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800 font-medium mb-1">Nakshatra derived from birth details</p>
                    <p className="text-xs text-blue-700">Bride: {result.derivedNakshatras.bride} · Groom: {result.derivedNakshatras.groom}</p>
                    <p className="text-xs text-blue-600 mt-1">{result.derivedNakshatras.disclaimer}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E8E8E4] p-8 flex flex-col items-center justify-center text-center h-64">
                <div className="w-16 h-16 bg-[#FCE4EC] rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">💑</span>
                </div>
                <p className="text-[#6B6B6B]">Select profiles and calculate to see compatibility results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C2185B]" size={32} /></div>}>
      <MatchContent />
    </Suspense>
  )
}
