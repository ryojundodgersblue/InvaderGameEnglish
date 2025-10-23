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

// Sheets API クライアント（読み取り/書き込みで別々にキャッシュ）
let sheetsClientReadOnly = null;
let sheetsClientReadWrite = null;

async function getSheetsClient(readonly = true) {
  // 既にキャッシュされたクライアントがあればそれを返す
  if (readonly && sheetsClientReadOnly) {
    return sheetsClientReadOnly;
  }
  if (!readonly && sheetsClientReadWrite) {
    return sheetsClientReadWrite;
  }

  const scopes = readonly
    ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
    : ['https://www.googleapis.com/auth/spreadsheets'];

  const client = await getAuthClient(scopes);
  const sheetsClient = google.sheets({ version: 'v4', auth: client });

  // 適切なキャッシュに保存
  if (readonly) {
    sheetsClientReadOnly = sheetsClient;
  } else {
    sheetsClientReadWrite = sheetsClient;
  }

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