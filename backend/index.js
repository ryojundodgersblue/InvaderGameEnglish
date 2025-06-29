const express = require('express');
const { google } = require('googleapis');
const app = express();
app.use(express.json());

// サービスアカウントの鍵ファイル（名前は実際のファイル名に合わせる）
const KEYFILE = './credentials.json';

// あなたのスプレッドシートID
const SPREADSHEET_ID = '1JDcz_bmgzEaS0kGq3WQmYVjwDdoVQjLjnEtXyqSOzTI';

// スプレッドシートAPI初期化
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

// 例：A1セルの内容を取得
app.get('/api/get-cell', async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1',
    });
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 例：A1とB1に書き込む
app.post('/api/set-cell', async (req, res) => {
  const { valueA, valueB } = req.body;
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:B1',
      valueInputOption: 'RAW',
      requestBody: { values: [[valueA, valueB]] }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('APIサーバー起動中 http://localhost:3001'));
