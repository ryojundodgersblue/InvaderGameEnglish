// backend/src/routes/logInPage.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/google');
const { verifyPassword, isPasswordHashed } = require('../utils/password');
const { generateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

const USER_SHEET_NAME = 'users';

// 期待するヘッダー（列順も固定）
const EXPECTED_HEADER = [
  'id',
  'user_id',
  'password',
  'nickname',
  'real_name',
  'current_grade',
  'current_part',
  'current_subpart',
  'is_admin',
  'created_at',
  'updated_at',
];

// 固定の列インデックス（0始まり）
const COL = {
  id: 0,
  user_id: 1,
  password: 2,
  nickname: 3,
  real_name: 4,
  current_grade: 5,
  current_part: 6,
  current_subpart: 7,
  is_admin: 8,
  created_at: 9,
  updated_at: 10,
};

/* ---------- ログ補助 ---------- */
const NS = 'auth/login';
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 8);
const maskUser = (u) => {
  const s = String(u || '');
  if (s.length <= 2) return '*'.repeat(s.length);
  return s.slice(0, 1) + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1);
};
const logInfo  = (id, msg, extra) => console.info(`[${now()}] [${NS}] [${id}] INFO  ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
const logWarn  = (id, msg, extra) => console.warn(`[${now()}] [${NS}] [${id}] WARN  ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
const logError = (id, msg, extra) => console.error(`[${now()}] [${NS}] [${id}] ERROR ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);

/* ---------- ルート ---------- */
router.post('/login',
  validateBody({
    userId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    password: { type: 'string', required: true, minLength: 1, maxLength: 200 }
  }),
  async (req, res) => {
  const reqId = rid();
  const t0 = Date.now();

  const { userId, password } = req.body || {};
  logInfo(reqId, 'request received', { ip: req.ip, userId: maskUser(userId) });

  if (!userId || !password) {
    logWarn(reqId, 'missing params', { hasUserId: !!userId, hasPassword: !!password });
    return res.status(400).json({ ok: false, message: 'userId と password は必須です' });
  }
  if (!SPREADSHEET_ID) {
    logError(reqId, 'SHEET_ID not set');
    return res.status(500).json({ ok: false, message: 'SHEET_ID が未設定です' });
  }

  try {
    const sheets = await getSheetsClient(true);
    logInfo(reqId, 'sheets client obtained');

    // A〜K列まで取得（列は固定）
    // ★ FORMATTED_VALUE を使用して user_id の先頭ゼロを保持（例: 00002）
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    logInfo(reqId, 'users fetched', { totalRows: rows.length });

    if (rows.length < 2) {
      logWarn(reqId, 'no data rows');
      return res.status(500).json({ ok: false, message: 'ユーザーデータが存在しません' });
    }

    // ヘッダー一致チェック（列名＆順序）
    const header = (rows[0] || []).map(v => String(v || '').trim());
    const headerOk =
      EXPECTED_HEADER.length === header.length &&
      EXPECTED_HEADER.every((name, i) => header[i] === name);

    if (!headerOk) {
      logError(reqId, 'header mismatch', { got: header, expected: EXPECTED_HEADER });
      return res
        .status(500)
        .json({ ok: false, message: 'usersヘッダが想定と異なります（列名・順序固定）' });
    }

    const dataRows = rows.slice(1);

    // user_id が完全一致する行を探す（固定列 index=1）
    const rowIndex = dataRows.findIndex(r => String(r[COL.user_id] || '') === String(userId));
    if (rowIndex === -1) {
      logWarn(reqId, 'user not found', { userId: maskUser(userId) });
      return res.status(401).json({ ok: false, message: '認証に失敗しました' });
    }
    const row = dataRows[rowIndex];

    // パスワード検証（固定列 index=2）
    const storedPassword = String(row[COL.password] || '');
    let passwordMatch = false;

    if (isPasswordHashed(storedPassword)) {
      // ハッシュ化されたパスワードの場合はbcryptで検証
      try {
        passwordMatch = await verifyPassword(String(password), storedPassword);
      } catch (err) {
        logError(reqId, 'password verification error', { message: err?.message });
        return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
      }
    } else {
      // 平文パスワードの場合（後方互換性のため）
      // 注意: 早急にハッシュ化されたパスワードに移行してください
      passwordMatch = (storedPassword === String(password));
      logWarn(reqId, 'plain-text password detected', { userId: maskUser(userId) });
    }

    if (!passwordMatch) {
      logWarn(reqId, 'password mismatch', { userId: maskUser(userId) });
      return res.status(401).json({ ok: false, message: '認証に失敗しました' });
    }

    // 表示名は nickname（固定列 index=3）
    const name = String(row[COL.nickname] || '');

    // 進捗（数値化して返す）
    const current_grade    = Number(row[COL.current_grade]    ?? 0) || 0;
    const current_part     = Number(row[COL.current_part]     ?? 0) || 0;
    const current_subpart  = Number(row[COL.current_subpart]  ?? 0) || 0;

    // 管理者フラグ（固定列 index=8）
    const is_admin = row[COL.is_admin] === true || String(row[COL.is_admin] || '').toLowerCase() === 'true';

    const ms = Date.now() - t0;
    logInfo(reqId, 'login success', {
      userId: maskUser(userId),
      nickname: name,
      current_grade,
      current_part,
      current_subpart,
      is_admin,
      durationMs: ms,
    });

    // JWTトークンを生成
    const token = generateToken({
      userId: String(userId),
      name,
      current_grade,
      current_part,
      current_subpart,
      is_admin,
    });

    // HttpOnlyクッキーにトークンを設定
    const cookieOptions = {
      httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
      secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
      sameSite: 'lax', // CSRF対策（開発環境で異なるポート間の通信を許可）
      maxAge: 24 * 60 * 60 * 1000, // 24時間
    };

    logInfo(reqId, 'Setting authToken cookie', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge
    });

    res.cookie('authToken', token, cookieOptions);

    return res.json({
      ok: true,
      user: {
        userId: String(userId),
        name,
        current_grade,
        current_part,
        current_subpart,
        is_admin,
      },
    });
  } catch (err) {
    const ms = Date.now() - t0;
    logError(reqId, 'exception', { message: err?.message, stack: err?.stack, durationMs: ms });
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
