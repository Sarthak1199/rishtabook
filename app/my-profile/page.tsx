'use client'

import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import toast from 'react-hot-toast'
import { Loader2, Upload, RefreshCw } from 'lucide-react'

const FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)' },
  { key: 'birth_time', label: 'Birth Time' },
  { key: 'birth_place', label: 'Birth Place' },
  { key: 'nakshatra', label: 'Nakshatra' },
  { key: 'rashi', label: 'Rashi' },
  { key: 'gotra', label: 'Gotra' },
  { key: 'education', label: 'Education' },
  { key: 'location', label: 'Current Location' },
  { key: 'about', label: 'About', textarea: true },
]

export default function MyProfilePage() {
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deriving, setDeriving] = useState(false)
  const pdfFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/my-profile')
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/my-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success('Profile saved!')
      else toast.error('Failed to save')
    } catch {
      toast.error('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDeriveNakshatra = async () => {
    if (!form.dob) { toast.error('Please enter Date of Birth first'); return }
    setDeriving(true)
    try {
      const res = await fetch('/api/guna-milan/derive-nakshatra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dob: form.dob, birth_time: form.birth_time }),
      })
      const data = await res.json()
      if (data.nakshatra) {
        setForm(prev => ({ ...prev, nakshatra: data.nakshatra, rashi: data.rashi || prev.rashi }))
        toast.success(`Derived: ${data.nakshatra} / ${data.rashi}`)
      } else {
        toast.error('Could not derive — check DOB format (DD/MM/YYYY)')
      }
    } catch {
      toast.error('Derivation failed')
    } finally {
      setDeriving(false)
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      const merged: Record<string, string> = { ...form }
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) merged[k] = String(v)
      }
      setForm(merged)
      toast.success('Profile extracted from PDF!')
    } catch {
      toast.error('Extraction failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C2185B]" size={32} /></div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[#1C1C1E] mb-6">My Profile (Girl&apos;s Bio Data)</h1>

        {/* PDF Upload */}
        <div className="bg-[#FCE4EC] rounded-xl p-4 mb-6 flex items-center gap-4">
          <Upload size={24} className="text-[#C2185B] flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-[#1C1C1E]">Upload Bio-Data PDF</p>
            <p className="text-sm text-[#6B6B6B]">AI will auto-fill fields from your PDF</p>
          </div>
          <button
            type="button"
            onClick={() => pdfFileRef.current?.click()}
            disabled={uploading}
            className="bg-[#C2185B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#AD1457] transition-colors disabled:opacity-60"
          >
            {uploading ? 'Extracting...' : 'Choose PDF'}
          </button>
          <input ref={pdfFileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
        </div>

        <div className="bg-white rounded-xl border border-[#E8E8E4] p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FIELDS.filter(f => !f.textarea).map(f => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[15px] font-medium text-[#1C1C1E]">{f.label}</label>
                  {f.key === 'nakshatra' && (
                    <button
                      type="button"
                      onClick={handleDeriveNakshatra}
                      disabled={deriving}
                      className="flex items-center gap-1 text-xs text-[#C2185B] font-medium hover:underline disabled:opacity-60"
                    >
                      {deriving ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      Derive from DOB
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
                />
              </div>
            ))}
          </div>
          {FIELDS.filter(f => f.textarea).map(f => (
            <div key={f.key}>
              <label className="block text-[15px] font-medium text-[#1C1C1E] mb-1.5">{f.label}</label>
              <textarea
                rows={4}
                value={form[f.key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-4 py-3 border border-[#E8E8E4] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#C2185B] resize-none"
              />
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#C2185B] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#AD1457] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
