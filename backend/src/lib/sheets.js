// backend/src/lib/sheets.js
const { google } = require('googleapis');
const path = require('path');

const KEYFILE = path.join(__dirname, '..', '..', 'credentials.json');
let sheets = null;

async function getSheets() {
  if (sheets) return sheets;
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  sheets = google.sheets({ version: 'v4', auth: client });
  return sheets;
}

module.exports = { getSheets };