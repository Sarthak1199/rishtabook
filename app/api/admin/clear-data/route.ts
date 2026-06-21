import { NextResponse } from 'next/server'
import { clearSheet } from '@/lib/sheets'

export async function POST() {
  try {
    await Promise.all([
      clearSheet('Grooms'),
      clearSheet('Agents'),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
