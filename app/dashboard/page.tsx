'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronRight, MapPin, GraduationCap, IndianRupee, Loader2, Briefcase, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Groom {
  id: string
  name: string
  dob: string
  location: string
  education: string
  occupation: string
  income: string
  status: string
  agent_name: string
  guna_score: string
  photo_paths: string
  nakshatra: string
  timestamp: string
}

const STATUS_FILTERS = ['All', 'Shortlisted', 'Important', 'Rejected', 'Pending']

const STATUS_COLORS: Record<string, string> = {
  Shortlisted: 'text-[#2E7D32] bg-green-50',
  Important: 'text-[#E65100] bg-orange-50',
  Rejected: 'text-[#C62828] bg-red-50',
  Pending: 'text-[#6B6B6B] bg-gray-100',
}

const STATUS_DOT: Record<string, string> = {
  Shortlisted: 'bg-[#2E7D32]',
  Important: 'bg-[#E65100]',
  Rejected: 'bg-[#C62828]',
  Pending: 'bg-[#6B6B6B]',
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

export default function DashboardPage() {
  const [grooms, setGrooms] = useState<Groom[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [agentFilter, setAgentFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const clearAllData = async () => {
    setClearing(true)
    try {
      const res = await fetch('/api/admin/clear-data', { method: 'POST' })
      if (res.ok) {
        setGrooms([])
        setShowClearConfirm(false)
        toast.success('All data cleared')
      } else {
        toast.error('Failed to clear data')
      }
    } catch {
      toast.error('Error clearing data')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    fetch('/api/grooms')
      .then(r => r.json())
      .then(data => { setGrooms(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const agents = [...new Set(grooms.map(g => g.agent_name).filter(Boolean))]
  const locations = [...new Set(grooms.map(g => g.location).filter(Boolean))]

  const filtered = grooms.filter(g => {
    if (statusFilter !== 'All' && g.status !== statusFilter) return false
    if (agentFilter && g.agent_name !== agentFilter) return false
    if (locationFilter && g.location !== locationFilter) return false
    return true
  })

  const getGunaColor = (score: string) => {
    const n = parseFloat(score)
    if (isNaN(n)) return 'text-[#6B6B6B] bg-gray-100'
    if (n >= 27) return 'text-[#2E7D32] bg-green-50'
    if (n >= 18) return 'text-[#E65100] bg-orange-50'
    return 'text-[#C62828] bg-red-50'
  }

  return (
    <AppLayout>
      <div>
        {/* Clear all data confirmation modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-semibold text-[#1C1C1E] mb-2">Clear All Data?</h3>
              <p className="text-sm text-[#6B6B6B] mb-5">This will permanently delete all {grooms.length} groom profiles and all agent records. This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={clearAllData}
                  disabled={clearing}
                  className="flex-1 bg-[#C62828] text-white py-3 rounded-xl font-semibold hover:bg-red-800 disabled:opacity-60 transition-colors"
                >
                  {clearing ? 'Clearing...' : 'Yes, Clear All'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 border border-[#E8E8E4] py-3 rounded-xl font-semibold text-[#6B6B6B] hover:bg-[#FAFAF8]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-[#1C1C1E]">Groom Profiles</h1>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 text-sm text-[#C62828] border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>

        {/* Filters */}
        <div className="sticky top-0 lg:top-0 bg-[#FAFAF8] pb-4 z-10">
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E8E8E4] rounded-lg bg-white text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#C2185B] font-medium"
            >
              {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E8E8E4] rounded-lg bg-white text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
            >
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E8E8E4] rounded-lg bg-white text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
            >
              <option value="">All Locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Groom list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#C2185B]" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg">No grooms found</p>
            <Link href="/add-groom" className="text-[#C2185B] font-medium mt-2 inline-block">Add first groom →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(g => {
              const photos = g.photo_paths ? g.photo_paths.split(',').filter(Boolean) : []
              const age = calcAge(g.dob)
              return (
                <Link key={g.id} href={`/groom/${g.id}`}>
                  <div className="bg-white rounded-xl p-4 border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md transition-shadow flex items-center gap-4">
                    {/* Photo */}
                    <div className="w-14 h-14 rounded-full bg-[#FCE4EC] flex-shrink-0 overflow-hidden">
                      {photos[0] ? (
                        <img src={photos[0]} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C2185B] text-xl font-bold">
                          {g.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: name + age + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[17px] font-semibold text-[#1C1C1E]">{g.name}</span>
                        {age && <span className="text-sm text-[#6B6B6B]">{age} yrs</span>}
                        {g.status && (
                          <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-600')}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_DOT[g.status] || 'bg-gray-400')} />
                            {g.status}
                          </span>
                        )}
                      </div>
                      {/* Row 2: location | income */}
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-[#6B6B6B]">
                        {g.location && <span className="flex items-center gap-1"><MapPin size={12} />{g.location}</span>}
                        {g.location && g.income && <span className="text-[#D0D0D0]">|</span>}
                        {g.income && <span className="flex items-center gap-1"><IndianRupee size={12} />{g.income} LPA</span>}
                      </div>
                      {/* Row 3: occupation (1 line, truncated) */}
                      {(g.occupation || g.education) && (
                        <p className="text-sm text-[#6B6B6B] mt-0.5 truncate">
                          {g.occupation
                            ? <><Briefcase size={12} className="inline mr-1" />{g.occupation}</>
                            : <><GraduationCap size={12} className="inline mr-1" />{g.education}</>
                          }
                        </p>
                      )}
                      {/* Row 4: agent + guna chips */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {g.agent_name && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-[#6B6B6B] rounded-full">{g.agent_name.replace(/^[\s/—\-–.·|,]+|[\s/—\-–.·|,]+$/g, '').trim()}</span>
                        )}
                        {g.guna_score && (
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', getGunaColor(g.guna_score))}>
                            Guna: {g.guna_score}/36
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-[#6B6B6B] flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
