// backend/src/services/google.js
const { google } = require('googleapis');
const textToSpeech = require('@google-cloud/text-to-speech'); // ✅ 追加
const path = require('path');

const KEYFILE = process.env.GOOGLE_KEYFILE
  || path.join(__dirname, '../../credentials.json');

const SPREADSHEET_ID = process.env.SHEET_ID;

// 認証クライアントのキャッシュ
let authClient = null;

async function getAuthClient(scopes) {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes,
  });
  return await auth.getClient();
}

// Sheets API クライアント
let sheetsClient = null;
async function getSheetsClient(readonly = true) {
  if (sheetsClient) return sheetsClient;
  
  const scopes = readonly
    ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
    : ['https://www.googleapis.com/auth/spreadsheets'];

  const client = await getAuthClient(scopes);
  sheetsClient = google.sheets({ version: 'v4', auth: client });
  return sheetsClient;
}

// ✅ Text-to-Speech API クライアント(修正版)
let ttsClient = null;
async function getTTSClient() {
  if (ttsClient) return ttsClient;
  
  // @google-cloud/text-to-speech を使用
  ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: KEYFILE,
  });
  
  return ttsClient;
}

module.exports = {
  getSheetsClient,
  getTTSClient,
  SPREADSHEET_ID,
};