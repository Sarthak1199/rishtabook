// Run: node scripts/setup-drive.cjs
// Creates a "RishtaBook Uploads" folder in Google Drive and outputs the folder ID to add to .env.local
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
jwt.scopes = ['https://www.googleapis.com/auth/drive']

const drive = google.drive({ version: 'v3', auth: jwt })

async function run() {
  // Check if folder already exists
  const search = await drive.files.list({
    q: "name='RishtaBook Uploads' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id,name)',
  })

  let folderId
  if (search.data.files?.length > 0) {
    folderId = search.data.files[0].id
    console.log('Folder already exists:', folderId)
  } else {
    const res = await drive.files.create({
      requestBody: {
        name: 'RishtaBook Uploads',
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    })
    folderId = res.data.id
    console.log('Created folder:', folderId)
  }

  // Make folder publicly readable (so uploaded file URLs work)
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: 'reader', type: 'anyone' },
    })
    console.log('Set folder to public reader access.')
  } catch (e) {
    console.log('Permission already set or error:', e.message)
  }

  console.log('\nAdd this to your .env.local:')
  console.log(`GOOGLE_DRIVE_FOLDER_ID=${folderId}`)
}

run().catch(console.error)
