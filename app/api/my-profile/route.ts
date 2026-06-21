import { NextRequest, NextResponse } from 'next/server'
import { readSheet, updateRow } from '@/lib/sheets'

const FIELDS = ['name','dob','birth_time','birth_place','nakshatra','rashi','gotra','education','location','about','pdf_path','updated_at']

export async function GET() {
  try {
    const rows = await readSheet('MyProfile')
    return NextResponse.json(rows[0] || {})
  } catch (e) {
    console.error('MyProfile GET:', e)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const values = FIELDS.map(f => f === 'updated_at' ? new Date().toISOString() : (body[f] || ''))
    // Row 2 = index 2 (1-based, row 1 is headers)
    await updateRow('MyProfile', 2, values)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('MyProfile POST:', e)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
