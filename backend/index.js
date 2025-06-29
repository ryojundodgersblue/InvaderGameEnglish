const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(express.json());
app.use(cors());  // フロントエンドからのリクエストを許可

// サービスアカウントの鍵ファイルパス
const KEYFILE = './credentials.json';

// あなたのスプレッドシートID
const SPREADSHEET_ID = '1JDcz_bmgzEaS0kGq3WQmYVjwDdoVQjLjnEtXyqSOzTI';

// ユーザー情報を格納しているシート名
const USER_SHEET_NAME = 'users';

// Google Sheets API クライアントを取得するヘルパー
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * POST /auth/login
 * body: { userId: string, password: string }
 * ────────────────────────────────────────────────────────────
 * 成功時: 200 OK
 *   { ok: true, user: { userId: string, name: string } }
 *
 * 失敗時:
 *   ・400 Bad Request (パラメータ不足)
 *     { ok: false, message: 'userId と password は必須です' }
 *
 *   ・401 Unauthorized (認証失敗)
 *     { ok: false, message: '認証に失敗しました' }
 *
 *   ・500 Internal Server Error
 *     { ok: false, message: 'サーバーエラーが発生しました' }
 */
app.post('/auth/login', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res
      .status(400)
      .json({ ok: false, message: 'userId と password は必須です' });
  }

  try {
    const sheets = await getSheetsClient();

    // ヘッダー行＋データ行を一括取得 (A1:E 領域)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:E`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      // ヘッダーしかない or 空
      return res
        .status(500)
        .json({ ok: false, message: 'ユーザーデータが存在しません' });
    }

    // 1行目をヘッダーとみなす
    const header      = rows[0];     // ['user_id','name','password','is_admin','created_at']
    const dataRows    = rows.slice(1);

    const idxUserId   = header.indexOf('user_id');
    const idxName     = header.indexOf('name');
    const idxPassHash = header.indexOf('password');

    // user_id が一致するユーザーを検索
    const matched = dataRows.find(r => r[idxUserId] === userId);
    if (!matched) {
      return res
        .status(401)
        .json({ ok: false, message: '認証に失敗しました' });
    }

    // password とプレーンテキスト比較
    const storedHash = matched[idxPassHash] || '';
    if (storedHash !== password) {
      return res
        .status(401)
        .json({ ok: false, message: '認証に失敗しました' });
    }

    // 認証成功 → ユーザー名を返す
    const userName = matched[idxName] || '';
    return res.json({
      ok: true,
      user: { userId, name: userName },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

// サーバー起動
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`APIサーバー起動中 → http://localhost:${PORT}`)
);
