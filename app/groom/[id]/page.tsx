'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Phone, MapPin, ChevronLeft, Heart, Loader2, FileText, X, Share2, Pencil, Check, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Groom {
  id: string
  name: string
  dob: string
  birth_time: string
  birth_place: string
  phone: string
  location: string
  education: string
  occupation: string
  income: string
  nakshatra: string
  rashi: string
  gotra: string
  manglik: string
  family_details: string
  about: string
  agent_id: string
  agent_name: string
  photo_paths: string
  pdf_path: string
  status: string
  notes: string
  guna_score: string
  timestamp: string
  age: string
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

const STATUS_OPTIONS = [
  { key: 'Shortlisted', label: '✓ Shortlist', color: 'bg-[#2E7D32] text-white', outline: 'border-[#2E7D32] text-[#2E7D32]' },
  { key: 'Important', label: '♥ Girl Approved', color: 'bg-[#E65100] text-white', outline: 'border-[#E65100] text-[#E65100]' },
  { key: 'Rejected', label: '✗ Reject', color: 'bg-[#C62828] text-white', outline: 'border-[#C62828] text-[#C62828]' },
]

const EDIT_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)' },
  { key: 'birth_time', label: 'Birth Time' },
  { key: 'birth_place', label: 'Birth Place' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'education', label: 'Education' },
  { key: 'income', label: 'Income (LPA)' },
  { key: 'nakshatra', label: 'Nakshatra' },
  { key: 'rashi', label: 'Rashi' },
  { key: 'gotra', label: 'Gotra' },
]

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <h3 className="text-[17px] font-semibold text-[#1C1C1E] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2 py-1.5">
      <span className="text-[#6B6B6B] text-sm font-medium w-32 flex-shrink-0">{label}</span>
      <span className="text-[#1C1C1E] text-sm">{value}</span>
    </div>
  )
}

function gunaColor(score: string) {
  const n = parseFloat(score)
  if (n >= 33) return 'bg-green-50 text-[#2E7D32]'
  if (n >= 25) return 'bg-blue-50 text-[#1565C0]'
  if (n >= 18) return 'bg-orange-50 text-[#E65100]'
  return 'bg-red-50 text-[#C62828]'
}

export default function GroomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [groom, setGroom] = useState<Groom | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetch(`/api/grooms/${id}`)
      .then(r => r.json())
      .then(data => { setGroom(data); setNotes(data.notes || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const updateStatus = async (status: string) => {
    if (!groom) return
    setUpdatingStatus(true)
    try {
      await fetch(`/api/grooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setGroom(prev => prev ? { ...prev, status } : prev)
      toast.success(`Marked as ${status}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await fetch(`/api/grooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      toast.success('Notes saved!')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const deleteGroom = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/grooms/${id}`, { method: 'DELETE' })
      toast.success('Groom profile deleted')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete')
      setDeleting(false)
    }
  }

  // Strip leading/trailing special chars from agent name
  const cleanAgentName = (name: string) => name.replace(/^[\s/—\-–.·|,]+|[\s/—\-–.·|,]+$/g, '').trim()

  const startEdit = () => {
    if (!groom) return
    setEditForm({
      name: groom.name, dob: groom.dob, birth_time: groom.birth_time,
      birth_place: groom.birth_place, phone: groom.phone, location: groom.location,
      occupation: groom.occupation, education: groom.education, income: groom.income,
      nakshatra: groom.nakshatra, rashi: groom.rashi, gotra: groom.gotra,
      manglik: groom.manglik, family_details: groom.family_details, about: groom.about,
    })
    setEditMode(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await fetch(`/api/grooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      setGroom(prev => prev ? { ...prev, ...editForm } : prev)
      setEditMode(false)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C2185B]" size={32} /></div>
    </AppLayout>
  )

  if (!groom) return (
    <AppLayout>
      <div className="text-center py-16">
        <p className="text-[#6B6B6B] text-lg">Groom not found</p>
        <Link href="/dashboard" className="text-[#C2185B] font-medium mt-2 inline-block">← Back to Dashboard</Link>
      </div>
    </AppLayout>
  )

  const photos = groom.photo_paths ? groom.photo_paths.split(',').filter(Boolean) : []
  const formattedDate = groom.timestamp ? new Date(groom.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const age = groom.age || calcAge(groom.dob)

  const shareOnWhatsApp = () => {
    const profileUrl = `${window.location.origin}/groom/${groom.id}`
    const lines = [
      `Hi! Check out *${groom.name}* on RishtaBook.`,
      '',
      age ? `Age: ${age} years` : groom.dob ? `DOB: ${groom.dob}` : '',
      groom.location ? `Location: ${groom.location}` : '',
      groom.occupation ? `Occupation: ${groom.occupation}` : '',
      groom.education ? `Education: ${groom.education}` : '',
      groom.income ? `Income: Rs ${groom.income} LPA` : '',
      groom.nakshatra ? `Nakshatra: ${groom.nakshatra}${groom.rashi ? ` | Rashi: ${groom.rashi}` : ''}` : '',
      groom.gotra ? `Gotra: ${groom.gotra}` : '',
      groom.manglik === 'true' ? 'Manglik: Yes' : groom.manglik === 'false' ? 'Manglik: No' : '',
      groom.guna_score ? `Guna Score: ${groom.guna_score}/36` : '',
      '',
      `🔗 ${profileUrl}`,
    ].filter(Boolean)
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <AppLayout>
      {/* Add bottom padding so sticky bar doesn't overlap content */}
      <div className="max-w-2xl pb-24">
        {/* Back + Edit */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-[#6B6B6B] hover:text-[#1C1C1E] transition-colors">
            <ChevronLeft size={18} /> Back
          </button>
          <button
            onClick={editMode ? saveEdit : startEdit}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-medium text-[#C2185B] hover:text-[#AD1457] transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : editMode ? <Check size={15} /> : <Pencil size={15} />}
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        {/* Photos */}
        {photos.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" className="h-48 w-36 object-cover rounded-xl flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="h-32 bg-[#FCE4EC] rounded-xl flex items-center justify-center mb-5">
            <span className="text-5xl font-bold text-[#C2185B]">{groom.name?.[0]?.toUpperCase()}</span>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {showPdf && groom.pdf_path && (
          <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" onClick={() => setShowPdf(false)}>
            <div className="flex items-center justify-between bg-white px-4 py-3" onClick={e => e.stopPropagation()}>
              <span className="font-semibold text-[#1C1C1E]">Bio-Data — {groom.name}</span>
              <button onClick={() => setShowPdf(false)} className="p-1 rounded-lg hover:bg-[#F5F5F5]">
                <X size={22} className="text-[#1C1C1E]" />
              </button>
            </div>
            <div className="flex-1 overflow-auto" onClick={e => e.stopPropagation()}>
              {groom.pdf_path.endsWith('.pdf') ? (
                <iframe src={groom.pdf_path} className="w-full h-full min-h-screen" title="Bio-Data PDF" />
              ) : (
                <div className="flex items-center justify-center h-full p-4 bg-[#F5F5F5]">
                  <img src={groom.pdf_path} alt="Bio-Data" className="max-w-full max-h-full rounded-lg shadow-lg object-contain" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-semibold text-[#1C1C1E] mb-2">Delete Profile?</h3>
              <p className="text-sm text-[#6B6B6B] mb-5">This will permanently remove <span className="font-semibold text-[#1C1C1E]">{groom.name}</span> from your database. This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={deleteGroom}
                  disabled={deleting}
                  className="flex-1 bg-[#C62828] text-white py-3 rounded-xl font-semibold hover:bg-red-800 disabled:opacity-60 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border border-[#E8E8E4] py-3 rounded-xl font-semibold text-[#6B6B6B] hover:bg-[#FAFAF8]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Name & Status */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] font-bold text-[#1C1C1E]">{groom.name}</h1>
            {age && <span className="text-[#6B6B6B] text-lg">{age} yrs</span>}
          </div>
          <p className="text-[11px] text-[#AAAAAA] font-mono mt-0.5">{groom.id}</p>
          {groom.occupation && (
            <p className="text-[#1C1C1E] mt-1 text-[15px] font-medium">{groom.occupation}</p>
          )}
          {groom.location && (
            <p className="text-[#6B6B6B] mt-0.5 flex items-center gap-1 text-sm">
              <MapPin size={13} />{groom.location}
            </p>
          )}
          {/* Guna score chip */}
          {groom.guna_score && (
            <div className="mt-2">
              <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold', gunaColor(groom.guna_score))}>
                Guna Score: {groom.guna_score}/36
              </span>
            </div>
          )}
          {/* Action buttons */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {groom.pdf_path && (
              <button
                onClick={() => setShowPdf(true)}
                className="flex items-center gap-1.5 bg-white border border-[#E8E8E4] text-[#1C1C1E] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#F5F5F5] transition-colors shadow-sm"
              >
                <FileText size={15} className="text-[#C2185B]" /> View Bio-Data
              </button>
            )}
            <button
              onClick={shareOnWhatsApp}
              className="flex items-center gap-1.5 bg-[#075E54] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#054d43] transition-colors shadow-sm"
            >
              <Share2 size={15} /> Share on WhatsApp
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 bg-white border border-red-200 text-[#C62828] px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {editMode ? (
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 shadow-sm">
              <h3 className="text-[17px] font-semibold text-[#1C1C1E] mb-4">Edit Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EDIT_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Manglik</label>
                  <select
                    value={editForm.manglik || 'false'}
                    onChange={e => setEditForm(prev => ({ ...prev, manglik: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {['family_details', 'about'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-[#6B6B6B] mb-1">{key === 'family_details' ? 'Family Details' : 'About'}</label>
                    <textarea
                      rows={3}
                      value={editForm[key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B] resize-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="bg-[#C2185B] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#AD1457] transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2.5 rounded-lg font-medium border border-[#E8E8E4] text-[#6B6B6B] hover:bg-[#FAFAF8]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Personal */}
              <InfoCard title="Personal Details">
                <InfoRow label="Date of Birth" value={groom.dob} />
                <InfoRow label="Age" value={age ? `${age} years` : ''} />
                <InfoRow label="Birth Time" value={groom.birth_time} />
                <InfoRow label="Birth Place" value={groom.birth_place} />
                <InfoRow label="Nakshatra" value={groom.nakshatra} />
                <InfoRow label="Rashi" value={groom.rashi} />
                <InfoRow label="Gotra" value={groom.gotra} />
                <InfoRow label="Manglik" value={groom.manglik === 'true' ? 'Yes' : groom.manglik === 'false' ? 'No' : groom.manglik} />
              </InfoCard>

              {/* Professional */}
              <InfoCard title="Professional">
                {groom.occupation && (
                  <div className="flex gap-2 py-1.5">
                    <span className="text-[#6B6B6B] text-sm font-medium w-32 flex-shrink-0">Occupation</span>
                    <span className="text-[#1C1C1E] text-sm font-medium">{groom.occupation}</span>
                  </div>
                )}
                <InfoRow label="Education" value={groom.education} />
                <InfoRow label="Income" value={groom.income ? `₹${groom.income} LPA` : ''} />
                {groom.location && <InfoRow label="Based in" value={groom.location} />}
              </InfoCard>

              {/* Contact */}
              <InfoCard title="Contact">
                {groom.phone && (
                  <a href={`tel:${groom.phone}`} className="flex items-center gap-2 text-[#C2185B] font-medium py-1.5">
                    <Phone size={16} />{groom.phone}
                  </a>
                )}
                <InfoRow label="Location" value={groom.location} />
              </InfoCard>

              {groom.family_details && (
                <InfoCard title="Family Details">
                  <p className="text-[#1C1C1E] text-sm leading-relaxed">{groom.family_details}</p>
                </InfoCard>
              )}

              {groom.about && (
                <InfoCard title="About">
                  <p className="text-[#1C1C1E] text-sm leading-relaxed">{groom.about}</p>
                </InfoCard>
              )}

              {groom.agent_name && (
                <InfoCard title="Agent / Matchmaker">
                  <InfoRow label="Name" value={cleanAgentName(groom.agent_name)} />
                </InfoCard>
              )}

              {formattedDate && (
                <p className="text-sm text-[#6B6B6B]">Added on {formattedDate}</p>
              )}
            </>
          )}

          {/* Notes */}
          <InfoCard title="Notes">
            <textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this groom..."
              className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B] resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-3 bg-[#C2185B] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#AD1457] transition-colors disabled:opacity-60"
            >
              {savingNotes ? 'Saving...' : 'Save Note'}
            </button>
          </InfoCard>

          {/* Match CTA */}
          <Link href={`/match?groomId=${groom.id}`}>
            <div className="bg-[#FCE4EC] rounded-xl p-4 flex items-center justify-between hover:bg-pink-100 transition-colors">
              <div className="flex items-center gap-3">
                <Heart className="text-[#C2185B]" size={24} />
                <div>
                  <p className="font-semibold text-[#1C1C1E]">Check Compatibility</p>
                  <p className="text-sm text-[#6B6B6B]">Calculate Guna Milan score</p>
                </div>
              </div>
              <span className="text-[#C2185B] font-semibold">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Sticky status bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[260px] bg-white border-t border-[#E8E8E4] px-4 py-3 z-20 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl flex gap-3">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => updateStatus(opt.key)}
              disabled={updatingStatus}
              className={clsx(
                'flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all',
                groom.status === opt.key ? opt.color + ' border-transparent' : 'bg-white ' + opt.outline
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
