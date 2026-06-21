import { NextRequest, NextResponse } from 'next/server'
import { readSheet, appendRow } from '@/lib/sheets'

export async function GET() {
  try {
    const rows = await readSheet('Agents')
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = `AGENT_${Math.floor(1000 + Math.random() * 9000)}`
    const values = [
      id,
      body.name || '',
      body.phone || '',
      body.email || '',
      new Date().toISOString(),
    ]
    await appendRow('Agents', values)
    return NextResponse.json({ ok: true, id })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
