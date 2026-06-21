import { google } from 'googleapis'

// In-memory cache per sheet — valid for 30 seconds in the same server process
const cache: Record<string, { data: Record<string, string>[]; ts: number }> = {}
const CACHE_TTL = 30_000

function cacheGet(key: string) {
  const entry = cache[key]
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  return null
}

function cacheSet(key: string, data: Record<string, string>[]) {
  cache[key] = { data, ts: Date.now() }
}

export function cacheInvalidate(sheetName: string) {
  delete cache[sheetName]
}

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Google Sheets request timed out after ${ms}ms. Check that the Sheets API is enabled and the sheet is shared with the service account.`)), ms)
    )
  ])
}

function getAuth() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const jwt = new google.auth.JWT()
  jwt.email = key.client_email
  jwt.key = key.private_key
  jwt.scopes = ['https://www.googleapis.com/auth/spreadsheets']
  return jwt
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export async function readSheet(sheetName: string, bypassCache = false) {
  if (!bypassCache) {
    const cached = cacheGet(sheetName)
    if (cached) return cached
  }
  const sheets = getSheets()
  const res = await withTimeout(sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: `${sheetName}!A:Z`
  }))
  const rows = res.data.values || []
  if (rows.length < 2) return []
  const headers = rows[0] as string[]
  const data = rows.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] || '']))
  )
  cacheSet(sheetName, data)
  return data
}

export async function appendRow(sheetName: string, values: string[]) {
  const sheets = getSheets()
  await withTimeout(sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] }
  }))
  cacheInvalidate(sheetName)
}

export async function updateRow(sheetName: string, rowIndex: number, values: string[]) {
  const sheets = getSheets()
  await withTimeout(sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] }
  }))
  cacheInvalidate(sheetName)
}

export async function deleteRow(sheetName: string, rowIndex: number) {
  const sheets = getSheets()
  // Get sheetId by name
  const meta = await withTimeout(sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  }))
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId === undefined) throw new Error(`Sheet ${sheetName} not found`)
  const sheetId = sheet?.properties?.sheetId ?? 0
  await withTimeout(sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }
        }
      }]
    }
  }))
  cacheInvalidate(sheetName)
}

export async function clearSheet(sheetName: string) {
  const sheets = getSheets()
  await withTimeout(sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: `${sheetName}!A2:ZZ`,
  }))
  cacheInvalidate(sheetName)
}

export async function getRowByField(sheetName: string, fieldIndex: number, value: string): Promise<{ row: Record<string, string>, rowIndex: number } | null> {
  const sheets = getSheets()
  const res = await withTimeout(sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: `${sheetName}!A:Z`
  }))
  const rows = res.data.values || []
  if (rows.length < 2) return null
  const headers = rows[0] as string[]
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][fieldIndex] === value) {
      return {
        row: Object.fromEntries(headers.map((h, j) => [h, rows[i][j] || ''])),
        rowIndex: i + 1
      }
    }
  }
  return null
}
