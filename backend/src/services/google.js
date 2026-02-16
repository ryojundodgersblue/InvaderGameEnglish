// backend/src/services/google.js
const { google } = require('googleapis');
const textToSpeech = require('@google-cloud/text-to-speech');
const path = require('path');

const KEYFILE = process.env.GOOGLE_KEYFILE
  || path.join(__dirname, '../../credentials.json');

// 環境変数からJSON認証情報を取得（Render等のクラウド環境用）
let credentials = null;
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log('[Google] Using credentials from GOOGLE_CREDENTIALS_JSON env var');
  } catch (e) {
    console.error('[Google] Failed to parse GOOGLE_CREDENTIALS_JSON:', e.message);
  }
}

const SPREADSHEET_ID = process.env.SHEET_ID;

// 認証クライアントのキャッシュ
let authClient = null;

async function getAuthClient(scopes) {
  if (credentials) {
    const auth = new google.auth.GoogleAuth({ credentials, scopes });
    return await auth.getClient();
  }
  const auth = new google.auth.GoogleAuth({ keyFile: KEYFILE, scopes });
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
  
  const ttsOptions = credentials ? { credentials } : { keyFilename: KEYFILE };
  ttsClient = new textToSpeech.TextToSpeechClient(ttsOptions);
  
  return ttsClient;
}

module.exports = {
  getSheetsClient,
  getTTSClient,
  SPREADSHEET_ID,
};