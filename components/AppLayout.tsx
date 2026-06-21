'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, User, UserPlus, Heart, Images, Menu, X, LogOut } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-profile', label: 'My Profile', icon: User },
  { href: '/add-groom', label: 'Add Groom', icon: UserPlus },
  { href: '/match', label: 'Match Analysis', icon: Heart },
  { href: '/media', label: 'Media Library', icon: Images },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('slh_auth')
      if (!raw) { router.replace('/login'); return }
      const { expires } = JSON.parse(raw)
      if (!expires || Date.now() > expires) {
        localStorage.removeItem('slh_auth')
        router.replace('/login')
        return
      }
      setChecked(true)
    } catch {
      router.replace('/login')
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]">
        <div className="text-[#6B6B6B] text-lg">Loading...</div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('slh_auth')
    router.replace('/login')
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={clsx('flex flex-col h-full bg-white border-r border-[#E8E8E4]', mobile ? 'w-[260px]' : 'w-[260px]')}>
      <div className="px-6 py-5 border-b border-[#E8E8E4]">
        <img src="/rishtabook-logo.jpg" alt="RishtaBook" className="h-[67px] w-auto" />
        <div className="text-[#6B6B6B] text-sm mt-1">Rishta managing platform</div>
      </div>
      <nav className="flex-1 py-4 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl mb-1 font-medium text-[15px] transition-colors',
                active
                  ? 'bg-[#FCE4EC] text-[#C2185B]'
                  : 'text-[#1C1C1E] hover:bg-[#FAFAF8]'
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-[#E8E8E4]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-[#6B6B6B] hover:bg-[#FAFAF8] font-medium text-[15px] transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[260px] lg:flex-col z-30">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E8E8E4] flex items-center px-4 z-30">
        <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-lg hover:bg-[#FAFAF8]">
          <Menu size={24} className="text-[#1C1C1E]" />
        </button>
        <div className="ml-3">
          <img src="/rishtabook-logo.jpg" alt="RishtaBook" className="h-[53px] w-auto" />
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 flex flex-col h-full">
            <Sidebar mobile />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-[260px] pt-16 lg:pt-0 min-h-screen">
        <main className="p-4 lg:p-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  )
}
