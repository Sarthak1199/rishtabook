'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        sessionStorage.setItem('slh_auth', 'true')
        router.replace('/dashboard')
      } else {
        toast.error('Invalid email or password')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E8E4] p-8">
          <div className="text-center mb-8">
            <img src="/rishtabook-logo.jpg" alt="RishtaBook" className="h-20 w-auto mx-auto" />
            <p className="text-[#6B6B6B] mt-2 text-base">Rishta managing platform</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[17px] font-500 text-[#1C1C1E] mb-2 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-base border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2185B] focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-[17px] font-medium text-[#1C1C1E] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 text-base border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2185B] focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C2185B] text-white py-3 rounded-lg text-base font-semibold hover:bg-[#AD1457] transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
