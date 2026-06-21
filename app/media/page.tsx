'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import { FileText, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

interface MediaItem {
  timestamp: string
  url: string
  type: string      // 'image' | 'pdf'
  groomId: string
  groomName: string
  label: string     // 'photo' | 'biodata'
}

const LABEL_FILTERS = ['All', 'photo', 'biodata']
const TYPE_FILTERS = ['All', 'image', 'pdf']

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [labelFilter, setLabelFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [groomFilter, setGroomFilter] = useState('')

  useEffect(() => {
    fetch('/api/media')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const grooms = [...new Set(items.map(i => i.groomName).filter(Boolean))].sort()

  const filtered = items.filter(i => {
    if (labelFilter !== 'All' && i.label !== labelFilter) return false
    if (typeFilter !== 'All' && i.type !== typeFilter) return false
    if (groomFilter && i.groomName !== groomFilter) return false
    return true
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <AppLayout>
      <div>
        <h1 className="text-2xl font-semibold text-[#1C1C1E] mb-6">Media Library</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={groomFilter}
            onChange={e => setGroomFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E8E8E4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C2185B]"
          >
            <option value="">All Grooms</option>
            {grooms.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="flex rounded-lg border border-[#E8E8E4] overflow-hidden">
            {LABEL_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setLabelFilter(f)}
                className={clsx('px-3 py-2 text-sm font-medium transition-colors', labelFilter === f ? 'bg-[#C2185B] text-white' : 'text-[#6B6B6B] hover:bg-[#FAFAF8]')}
              >
                {f === 'All' ? 'All Types' : f === 'photo' ? 'Photos' : 'Bio-Data'}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-[#E8E8E4] overflow-hidden">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={clsx('px-3 py-2 text-sm font-medium transition-colors', typeFilter === f ? 'bg-[#C2185B] text-white' : 'text-[#6B6B6B] hover:bg-[#FAFAF8]')}
              >
                {f === 'All' ? 'All Formats' : f === 'image' ? 'Images' : 'PDFs'}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-[#6B6B6B] self-center">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#C2185B]" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg">No files yet</p>
            <p className="text-sm mt-1">Upload bio-data or photos when adding a groom</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Preview */}
                <div className="h-36 bg-[#FAFAF8] flex items-center justify-center relative">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.groomName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={36} className="text-[#C2185B]" />
                      <span className="text-xs text-[#6B6B6B]">PDF</span>
                    </div>
                  )}
                  {/* Label chip */}
                  <span className={clsx(
                    'absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    item.label === 'biodata' ? 'bg-[#FCE4EC] text-[#C2185B]' : 'bg-blue-50 text-blue-700'
                  )}>
                    {item.label === 'biodata' ? 'Bio-Data' : 'Photo'}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold text-[#1C1C1E] truncate">{item.groomName || 'Unknown'}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    {new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {item.groomId && (
                      <Link
                        href={`/groom/${item.groomId}`}
                        className="text-xs text-[#C2185B] hover:underline"
                      >
                        View Profile
                      </Link>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[#6B6B6B] hover:text-[#1C1C1E]"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
