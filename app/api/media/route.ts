import { NextResponse } from 'next/server'
import { readSheet } from '@/lib/sheets'

export const revalidate = 0

export async function GET() {
  try {
    const rows = await readSheet('Media')
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([])
  }
}
