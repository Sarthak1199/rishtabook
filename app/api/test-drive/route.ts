import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

export async function GET() {
  const results: Record<string, string> = {}

  // Check env vars
  results.FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ? 'SET' : 'MISSING'
  results.SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'SET' : 'MISSING'

  try {
    const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
    results.client_email = key.client_email
    results.project_id = key.project_id

    const jwt = new google.auth.JWT()
    jwt.email = key.client_email
    jwt.key = key.private_key
    jwt.scopes = ['https://www.googleapis.com/auth/drive']

    const drive = google.drive({ version: 'v3', auth: jwt })

    // Try to list files in the folder
    const list = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      fields: 'files(id, name)',
      pageSize: 3,
    })
    results.folder_access = 'OK'
    results.files_in_folder = String(list.data.files?.length ?? 0)

    // Try uploading a tiny test file
    const testRes = await drive.files.create({
      requestBody: { name: `test-${Date.now()}.txt`, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!] },
      media: { mimeType: 'text/plain', body: Readable.from(Buffer.from('RishtaBook Drive test')) },
      fields: 'id',
    })
    results.upload = 'OK'
    results.uploaded_file_id = testRes.data.id!

    // Clean up test file
    await drive.files.delete({ fileId: testRes.data.id! })
    results.cleanup = 'OK'

  } catch (e) {
    results.error = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(results)
}
