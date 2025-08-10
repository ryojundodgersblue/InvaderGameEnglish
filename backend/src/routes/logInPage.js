// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();

const { getSheetsClient, SPREADSHEET_ID } = require('../services/sheets');

const USER_SHEET_NAME = 'users';

router.post('/login', async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ ok: false, message: 'userId と password は必須です' });
  }
  if (!SPREADSHEET_ID) {
    return res.status(500).json({ ok: false, message: 'SHEET_ID が未設定です' });
  }

  try {
    const sheets = await getSheetsClient(true);

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:E`,
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      return res.status(500).json({ ok: false, message: 'ユーザーデータが存在しません' });
    }

    const header   = rows[0];      // ['user_id','name','password_hash','is_admin','created_at']
    const dataRows = rows.slice(1);

    const idxUserId   = header.indexOf('user_id');
    const idxName     = header.indexOf('name');
    const idxPassHash = header.indexOf('password');

    if (idxUserId === -1 || idxName === -1 || idxPassHash === -1) {
      return res.status(500).json({ ok: false, message: 'usersヘッダが想定と異なります' });
    }

    const matched = dataRows.find(r => (r[idxUserId] || '') === userId);
    if (!matched) {
      return res.status(401).json({ ok: false, message: '認証に失敗しました' });
    }

    const stored = matched[idxPassHash] || '';
    if (stored !== password) {
      return res.status(401).json({ ok: false, message: '認証に失敗しました' });
    }

    const name = matched[idxName] || '';
    return res.json({ ok: true, user: { userId, name } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
