// Run with: node scripts/update-sheet-headers.mjs
// Adds the "occupation" column to the Grooms sheet header row
import { google } from 'googleapis'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
const jwt = new google.auth.JWT()
jwt.email = key.client_email
jwt.key = key.private_key
jwt.scopes = ['https://www.googleapis.com/auth/spreadsheets']

const sheets = google.sheets({ version: 'v4', auth: jwt })
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

async function run() {
  // Read current headers
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Grooms!A1:Z1',
  })
  const headers = res.data.values?.[0] || []
  console.log('Current headers:', headers)

  if (!headers.includes('occupation')) {
    headers.push('occupation')
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Grooms!A1:Z1',
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
    console.log('Added "occupation" column. New headers:', headers)
  } else {
    console.log('"occupation" already exists.')
  }
}

run().catch(console.error)
