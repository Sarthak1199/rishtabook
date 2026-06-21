// Run: node scripts/update-sheet-headers.cjs
const { google } = require('googleapis')
const fs = require('fs')

const env = {}
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const eq = line.indexOf('=')
  if (eq > 0) env[line.slice(0, eq)] = line.slice(eq + 1)
})

const key = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY)
const jwt = new google.auth.JWT()
jwt.email = key.client_email
jwt.key = key.private_key
jwt.scopes = ['https://www.googleapis.com/auth/spreadsheets']

const sheets = google.sheets({ version: 'v4', auth: jwt })
const SPREADSHEET_ID = env.GOOGLE_SHEETS_SPREADSHEET_ID

async function run() {
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
    console.log('Added "occupation" column. Headers now:', headers)
  } else {
    console.log('"occupation" already exists.')
  }
}

run().catch(console.error)
