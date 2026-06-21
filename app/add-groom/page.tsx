'use client'

import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2 } from 'lucide-react'

interface Agent {
  id: string
  name: string
  phone: string
}

function calcAge(dob: string): string {
  if (!dob) return ''
  let d: Date
  if (dob.includes('/')) {
    const parts = dob.split('/')
    if (parts.length === 3) {
      d = new Date(+parts[2], +parts[1] - 1, +parts[0])
    } else return ''
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

const PERSONAL_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)' },
  { key: 'birth_time', label: 'Birth Time' },
  { key: 'birth_place', label: 'Birth Place' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'location', label: 'Current Location' },
  { key: 'education', label: 'Education' },
  { key: 'occupation', label: 'Occupation / Job Title' },
  { key: 'income', label: 'Income (LPA)' },
  { key: 'nakshatra', label: 'Nakshatra' },
  { key: 'rashi', label: 'Rashi' },
  { key: 'gotra', label: 'Gotra' },
]

const TEXTAREA_FIELDS = [
  { key: 'family_details', label: 'Family Details' },
  { key: 'about', label: 'About' },
]

export default function AddGroomPage() {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({ manglik: 'false' })
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [newAgent, setNewAgent] = useState({ name: '', phone: '' })
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [bioFilePath, setBioFilePath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [agentPhoneError, setAgentPhoneError] = useState('')
  const bioFileRef = useRef<HTMLInputElement>(null)
  const photoFileRef = useRef<HTMLInputElement>(null)

  const age = calcAge(form.dob || '')

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(data => setAgents(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const handleBioFileExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    // Mark a placeholder so save isn't blocked while uploading
    setBioFilePath('uploading')
    try {
      // Upload and extract in parallel
      const [uploadRes, extractRes] = await Promise.all([
        fetch('/api/upload', { method: 'POST', body: (() => { const fd = new FormData(); fd.append('file', file); return fd })() }),
        fetch('/api/extract-pdf', { method: 'POST', body: (() => { const fd = new FormData(); fd.append('pdf', file); return fd })() }),
      ])
      const uploadData = await uploadRes.json()
      if (uploadData.path) setBioFilePath(uploadData.path)
      else setBioFilePath('local-upload')
      if (uploadData.driveError) console.warn('Drive fallback reason:', uploadData.driveError)

      const data = await extractRes.json()
      if (data.error) { toast.error(data.error); return }
      const updated: Record<string, string> = { ...form }
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) updated[k] = String(v)
      }
      setForm(updated)
      toast.success('Fields extracted successfully!')
    } catch {
      setBioFilePath('') // reset on complete failure
      toast.error('Extraction failed — please try again')
    } finally {
      setExtracting(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Show instant local previews
    const localPreviews = files.map(f => URL.createObjectURL(f))
    setPhotos(prev => [...prev, ...localPreviews])

    setUploading(true)
    try {
      const uploadedPaths: string[] = []
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.path) uploadedPaths.push(data.path)
      }
      // Replace local blob URLs with server paths
      setPhotos(prev => {
        const withoutPreviews = prev.filter(p => !localPreviews.includes(p))
        return [...withoutPreviews, ...uploadedPaths]
      })
      toast.success('Photos uploaded!')
    } catch {
      // Remove previews on failure
      setPhotos(prev => prev.filter(p => !localPreviews.includes(p)))
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      localPreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }

  const handleSubmit = async () => {
    if (!bioFilePath) { toast.error('Please upload the bio-data PDF or image first'); return }
    if (!form.name) { toast.error('Name is required'); return }
    if (showNewAgent && newAgent.phone && newAgent.phone.length !== 10) { toast.error('Agent phone must be 10 digits'); return }
    setSaving(true)
    try {
      let agentId = selectedAgent
      let agentName = agents.find(a => a.id === selectedAgent)?.name || ''

      if (showNewAgent && newAgent.name) {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAgent),
        })
        const data = await res.json()
        agentId = data.id || ''
        agentName = newAgent.name
      }

      const groomData = {
        ...form,
        agent_id: agentId,
        agent_name: agentName,
        photo_paths: photos.join(','),
        pdf_path: bioFilePath,
        status: 'Pending',
      }

      const res = await fetch('/api/grooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groomData),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Groom profile saved!')
        router.push(`/groom/${data.id}`)
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Error saving groom')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl pb-24">
        <h1 className="text-2xl font-semibold text-[#1C1C1E] mb-6">Add Groom Profile</h1>

        {/* Bio-Data Upload Section */}
        <div className={`bg-white rounded-xl border p-5 mb-5 ${!bioFilePath ? 'border-[#C2185B]' : 'border-[#E8E8E4]'}`}>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-1">
            Bio-Data <span className="text-[#C2185B]">*</span>
          </h2>
          <p className="text-sm text-[#6B6B6B] mb-3">Upload the bio-data as PDF or photo — AI will fill in all fields automatically</p>
          <button
            type="button"
            onClick={() => bioFileRef.current?.click()}
            disabled={extracting}
            className={`inline-flex items-center gap-2 bg-[#FCE4EC] text-[#C2185B] px-4 py-2.5 rounded-lg font-medium hover:bg-pink-100 transition-colors disabled:opacity-60`}
          >
            {extracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {extracting ? 'Extracting with AI...' : 'Upload PDF or Image'}
          </button>
          <input ref={bioFileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleBioFileExtract} />
          {bioFilePath && <p className="mt-2 text-xs text-[#2E7D32] font-medium">Bio-data uploaded</p>}
          {!bioFilePath && (
            <p className="mt-2 text-xs text-[#C2185B]">Required before saving</p>
          )}
        </div>

        {/* Personal Details */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 mb-5">
          <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PERSONAL_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-[15px] font-medium text-[#1C1C1E] mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
                />
              </div>
            ))}
            {/* Age — auto-calculated, read-only */}
            <div>
              <label className="block text-[15px] font-medium text-[#1C1C1E] mb-1.5">Age</label>
              <input
                type="text"
                value={age ? `${age} years` : ''}
                readOnly
                placeholder="Auto-calculated from DOB"
                className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] bg-[#FAFAF8] text-[#6B6B6B] cursor-default"
              />
            </div>
            <div>
              <label className="block text-[15px] font-medium text-[#1C1C1E] mb-1.5">Manglik</label>
              <select
                value={form.manglik || 'false'}
                onChange={e => setForm(prev => ({ ...prev, manglik: e.target.value }))}
                className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {TEXTAREA_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-[15px] font-medium text-[#1C1C1E] mb-1.5">{f.label}</label>
                <textarea
                  rows={3}
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B] resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 mb-5">
          <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-3">Photos</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {photos.map((p, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-[#C62828] text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => photoFileRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-[#E8E8E4] rounded-lg flex flex-col items-center justify-center hover:border-[#C2185B] transition-colors"
            >
              {uploading ? <Loader2 size={20} className="animate-spin text-[#6B6B6B]" /> : <Upload size={20} className="text-[#6B6B6B]" />}
              <span className="text-xs text-[#6B6B6B] mt-1">Add</span>
            </button>
            <input ref={photoFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>

        {/* Agent */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 mb-6">
          <h2 className="text-[17px] font-semibold text-[#1C1C1E] mb-3">Agent (Matchmaker)</h2>
          <select
            value={selectedAgent}
            onChange={e => {
              setSelectedAgent(e.target.value)
              setShowNewAgent(e.target.value === '__new__')
            }}
            className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B] mb-3"
          >
            <option value="">No Agent</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name} · {a.phone}</option>)}
            <option value="__new__">+ Add New Agent</option>
          </select>
          {showNewAgent && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Agent Name</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={e => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
                  placeholder="Agent name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Agent Phone</label>
                <input
                  type="tel"
                  value={newAgent.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setNewAgent(prev => ({ ...prev, phone: val }))
                    setAgentPhoneError(val.length > 0 && val.length !== 10 ? 'Phone number must be 10 digits' : '')
                  }}
                  onBlur={() => setAgentPhoneError(newAgent.phone.length > 0 && newAgent.phone.length !== 10 ? 'Phone number must be 10 digits' : '')}
                  className={`w-full px-4 py-3 border rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B] ${agentPhoneError ? 'border-[#C62828]' : 'border-[#E8E8E4]'}`}
                  placeholder="10-digit number"
                  maxLength={10}
                />
                {agentPhoneError && <p className="mt-1 text-xs text-[#C62828]">{agentPhoneError}</p>}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Sticky save CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[260px] bg-white border-t border-[#E8E8E4] px-4 py-3 z-20 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#C2185B] text-white py-4 rounded-xl font-semibold text-base hover:bg-[#AD1457] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Groom Profile →'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
