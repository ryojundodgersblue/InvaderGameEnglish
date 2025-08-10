// backend/src/services/sheets.js
const { google } = require('googleapis');
const path = require('path');

const KEYFILE = process.env.GOOGLE_KEYFILE
  || path.join(__dirname, '../../credentials.json');

const SPREADSHEET_ID = process.env.SHEET_ID; // .env に入れる

async function getSheetsClient(readonly = true) {
  const scopes = readonly
    ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
    : ['https://www.googleapis.com/auth/spreadsheets'];

  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes,
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

module.exports = {
  getSheetsClient,
  SPREADSHEET_ID,
};
