// backend/src/routes/logInPage.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/sheets');

const USER_SHEET_NAME = 'users';

// 列は固定
const EXPECTED_HEADER = [
  'id',
  'user_id',
  'password',
  'nickname',
  'real_name',
  'current_grade',
  'current_part',
  'is_admin',
  'created_at',
  'updated_at',
];

const COL = {
  id: 0,
  user_id: 1,
  password: 2,
  nickname: 3,
  real_name: 4,
  current_grade: 5,
  current_part: 6,
  is_admin: 7,
  created_at: 8,
  updated_at: 9,
};

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
      range: `${USER_SHEET_NAME}!A1:J`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      return res.status(500).json({ ok: false, message: 'ユーザーデータが存在しません' });
    }

    const header = (rows[0] || []).map(v => String(v || '').trim());
    const headerOk =
      EXPECTED_HEADER.length === header.length &&
      EXPECTED_HEADER.every((name, i) => header[i] === name);
    if (!headerOk) {
      return res.status(500).json({ ok: false, message: 'usersヘッダが想定と異なります（列名・順序固定）' });
    }

    const dataRows = rows.slice(1);
    const row = dataRows.find(r => String(r[COL.user_id] || '') === String(userId));
    if (!row) {
      return res.status(401).json({ ok: false, message: '認証に失敗しました' });
    }

    const storedPassword = String(row[COL.password] || '');
    if (storedPassword !== String(password)) {
      return res.status(401).json({ ok: false, message: '認証に失敗しました' });
    }

    const name = String(row[COL.nickname] || '');
    const current_grade = Number(row[COL.current_grade] ?? 1) || 1;
    const current_part  = Number(row[COL.current_part]  ?? 1) || 1;

    return res.json({
      ok: true,
      user: { userId: String(userId), name, current_grade, current_part },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
