import { NextRequest, NextResponse } from 'next/server'
import { readSheet, updateRow, deleteRow } from '@/lib/sheets'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await readSheet('Grooms')
    const groom = rows.find((r: Record<string, string>) => r.id === params.id)
    if (!groom) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(groom)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const allRows = await readSheet('Grooms')
    const idx = allRows.findIndex((r: Record<string, string>) => r.id === params.id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await deleteRow('Grooms', idx + 2)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const allRows = await readSheet('Grooms')
    const idx = allRows.findIndex((r: Record<string, string>) => r.id === params.id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const existing = allRows[idx] as Record<string, string>
    const merged = { ...existing, ...body }
    const values = [
      merged.id, merged.timestamp, merged.name, merged.dob, merged.birth_time,
      merged.birth_place, merged.phone, merged.location, merged.education, merged.income,
      merged.nakshatra, merged.rashi, merged.gotra, merged.manglik, merged.family_details,
      merged.about, merged.agent_id, merged.agent_name, merged.photo_paths, merged.pdf_path,
      merged.status, merged.notes, merged.guna_score, merged.occupation || '',
    ]
    await updateRow('Grooms', idx + 2, values)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
