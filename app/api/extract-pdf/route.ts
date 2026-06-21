import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const EXTRACTION_PROMPT = `Extract the following fields from this Indian matrimonial bio-data. Return ONLY a valid JSON object with these exact keys (use null if not found):
name, dob (DD/MM/YYYY format), birth_time, birth_place, phone, location (current city), education (highest degree and field e.g. "B.Tech Computer Science, IIT Delhi"), occupation (full detail: job title + company/employer name OR business type + business name, e.g. "Software Engineer at Google" or "Owner, ABC Textiles Pvt Ltd" or "CA, self-employed"), income (salary, turnover, or business income — convert to a single number in lakhs per annum; if per month multiply by 12; if crores multiply by 100; return just the number e.g. 24), nakshatra, rashi, gotra, manglik (true or false), family_details (2-3 sentences: father's profession, mother, siblings, family background, business if any), about (2-3 sentences self description)

Return ONLY the JSON object, no markdown, no explanation.`

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function parseJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in response')
  return JSON.parse(match[0])
}

async function extractFromText(text: string) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // Fastest model — plenty for field extraction
    max_tokens: 512,
    messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nBio-data text:\n${text.slice(0, 6000)}` }]
  })
  const c = message.content[0]
  if (c.type !== 'text') throw new Error('Unexpected response')
  return parseJson(c.text)
}

async function extractFromImage(buffer: Buffer, mimeType: string) {
  const base64 = buffer.toString('base64')
  const validMime = (['image/jpeg', 'image/png', 'image/webp'] as const)
    .find(m => m === mimeType) ?? 'image/jpeg'
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: validMime, data: base64 } },
        { type: 'text', text: EXTRACTION_PROMPT }
      ]
    }]
  })
  const c = message.content[0]
  if (c.type !== 'text') throw new Error('Unexpected response')
  return parseJson(c.text)
}

async function extractFromPdfVision(buffer: Buffer) {
  const base64 = buffer.toString('base64')
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',  // Haiku doesn't support PDF documents; use Sonnet
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: EXTRACTION_PROMPT }
      ]
    }]
  })
  const c = message.content[0]
  if (c.type !== 'text') throw new Error('Unexpected response')
  return parseJson(c.text)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type || ''
    const fileName = file.name.toLowerCase()

    const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/.test(fileName)
    const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf')

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Please upload a PDF or image (JPG, PNG, WEBP).' }, { status: 400 })
    }

    if (isImage) {
      const parsed = await extractFromImage(buffer, mimeType)
      return NextResponse.json(parsed)
    }

    // PDF: use unpdf to extract text fast (no workers, no PDF.js setup)
    const { extractText } = await import('unpdf')
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })

    if (!text || text.trim().length < 30) {
      // Scanned PDF — send raw PDF to Claude's native PDF vision
      const parsed = await extractFromPdfVision(buffer)
      return NextResponse.json(parsed)
    }

    const parsed = await extractFromText(text)
    return NextResponse.json(parsed)

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Extraction failed'
    console.error('Extract error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
