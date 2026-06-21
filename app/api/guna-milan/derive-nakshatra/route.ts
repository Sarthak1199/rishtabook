import { NextRequest, NextResponse } from 'next/server'
import { deriveNakshatraFromDob } from '@/lib/nakshatra'

export async function POST(req: NextRequest) {
  const { dob, birth_time } = await req.json()
  if (!dob) return NextResponse.json({ error: 'DOB required' }, { status: 400 })
  const result = await deriveNakshatraFromDob(dob, birth_time)
  if (!result) return NextResponse.json({ error: 'Could not derive' }, { status: 422 })
  return NextResponse.json(result)
}
