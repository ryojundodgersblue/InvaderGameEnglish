// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const { hashPassword, generatePassword } = require('../utils/password');
const { validateBody } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const {
  SHEET_NAMES, USER_COL,
  PASSWORD_LENGTH, USER_ID_PAD_LENGTH,
  ensureSheetId, fetchSheet, findUserRow, toBool,
  getSheetsClient, SPREADSHEET_ID,
} = require('../utils/sheets');

const log = createLogger('admin');

/* ---------- ミドルウェア：管理者チェック ---------- */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ ok: false, message: '管理者権限が必要です' });
  }
  next();
};

/* ---------- ユーザー一覧取得 ---------- */
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  const route = 'GET /users';
  try {
    ensureSheetId();
    const rows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
    if (rows.length < 2) return res.json({ ok: true, users: [] });

    const users = rows.slice(1).map((row) => ({
      id: Number(row[USER_COL.id] || 0),
      user_id: String(row[USER_COL.user_id] || ''),
      password: String(row[USER_COL.password] || ''),
      nickname: String(row[USER_COL.nickname] || ''),
      real_name: String(row[USER_COL.real_name] || ''),
      current_grade: Number(row[USER_COL.current_grade] || 1),
      current_part: Number(row[USER_COL.current_part] || 1),
      current_subpart: Number(row[USER_COL.current_subpart] || 1),
      is_admin: toBool(row[USER_COL.is_admin]),
      created_at: String(row[USER_COL.created_at] || ''),
      updated_at: String(row[USER_COL.updated_at] || ''),
    }));

    return res.json({ ok: true, users });
  } catch (err) {
    log.error(route, 'exception', { message: err?.message });
    return res.status(err.statusCode || 500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

/* ---------- 新規ユーザー登録 ---------- */
router.post('/users',
  verifyToken,
  requireAdmin,
  validateBody({
    nickname: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    real_name: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  const route = 'POST /users';
  const { nickname, real_name } = req.body || {};

  try {
    ensureSheetId();
    const sheets = await getSheetsClient(false);

    const rows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
    if (rows.length < 1) {
      return res.status(500).json({ ok: false, message: 'usersシートにヘッダーがありません' });
    }

    const dataRows = rows.slice(1);

    // 次のIDとuser_idを計算
    let nextId = 1;
    if (dataRows.length > 0) {
      const lastRow = dataRows[dataRows.length - 1];
      nextId = Number(lastRow[USER_COL.id] || 0) + 1;
    }
    const nextUserId = String(nextId).padStart(USER_ID_PAD_LENGTH, '0');

    const plainPassword = generatePassword(PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(plainPassword);
    const timestamp = new Date().toISOString();

    const newRow = [
      nextId, nextUserId, hashedPassword, nickname, real_name,
      1, 1, 1, false, timestamp, timestamp,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.USERS}!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [newRow] },
    });

    log.info(route, 'user registered', { user_id: nextUserId });
    return res.json({ ok: true, user_id: nextUserId, password: plainPassword });
  } catch (err) {
    log.error(route, 'exception', { message: err?.message });
    return res.status(err.statusCode || 500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

/* ---------- ユーザー情報更新 ---------- */
router.put('/users/:userId',
  verifyToken,
  requireAdmin,
  validateBody({
    current_grade: { type: 'number', required: false },
    current_part: { type: 'number', required: false },
    current_subpart: { type: 'number', required: false }
  }),
  async (req, res) => {
  const route = 'PUT /users/:userId';
  const { userId } = req.params;
  const { current_grade, current_part, current_subpart } = req.body || {};

  try {
    ensureSheetId();
    const rows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
    if (rows.length < 2) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const found = findUserRow(rows.slice(1), userId);
    if (!found) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const { row, absRow } = found;
    const timestamp = new Date().toISOString();

    const updatedRow = [...row];
    updatedRow[USER_COL.current_grade] = current_grade !== undefined ? current_grade : Number(row[USER_COL.current_grade] || 1);
    updatedRow[USER_COL.current_part] = current_part !== undefined ? current_part : Number(row[USER_COL.current_part] || 1);
    updatedRow[USER_COL.current_subpart] = current_subpart !== undefined ? current_subpart : Number(row[USER_COL.current_subpart] || 1);
    updatedRow[USER_COL.updated_at] = timestamp;

    const sheets = await getSheetsClient(false);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.USERS}!A${absRow}:K${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [updatedRow] },
    });

    log.info(route, 'user updated', { userId });
    return res.json({ ok: true });
  } catch (err) {
    log.error(route, 'exception', { message: err?.message });
    return res.status(err.statusCode || 500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

/* ---------- パスワードリセット ---------- */
router.post('/reset-password',
  verifyToken,
  requireAdmin,
  validateBody({
    user_id: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  const route = 'POST /reset-password';
  const { user_id } = req.body || {};

  try {
    ensureSheetId();
    const rows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
    if (rows.length < 2) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const found = findUserRow(rows.slice(1), user_id);
    if (!found) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const { row, absRow } = found;
    const plainPassword = generatePassword(PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(plainPassword);
    const timestamp = new Date().toISOString();

    const updatedRow = [...row];
    updatedRow[USER_COL.password] = hashedPassword;
    updatedRow[USER_COL.updated_at] = timestamp;

    const sheets = await getSheetsClient(false);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.USERS}!A${absRow}:K${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [updatedRow] },
    });

    log.info(route, 'password reset', { user_id });
    return res.json({ ok: true, user_id, password: plainPassword });
  } catch (err) {
    log.error(route, 'exception', { message: err?.message });
    return res.status(err.statusCode || 500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

/* ---------- パート別ミス数取得 ---------- */
router.get('/failure-stats', verifyToken, requireAdmin, async (req, res) => {
  const route = 'GET /failure-stats';

  try {
    ensureSheetId();

    // 1. usersシートから非管理者ユーザーを取得
    const uRows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K', { valueRenderOption: 'UNFORMATTED_VALUE' });
    if (uRows.length < 2) {
      return res.json({ ok: true, users: [], parts: [], stats: {} });
    }

    const nonAdminUsers = uRows.slice(1)
      .filter(row => !toBool(row[USER_COL.is_admin]))
      .map(row => ({
        user_id: String(row[USER_COL.user_id] || ''),
        real_name: String(row[USER_COL.real_name] || ''),
      }));

    // 2. partsシートからpart_idリストを取得
    const pRows = await fetchSheet(SHEET_NAMES.PARTS, 'A1:A', { valueRenderOption: 'UNFORMATTED_VALUE' });
    const parts = pRows.slice(1).map(row => String(row[0] || '')).filter(Boolean);

    // 3. scoresシートから失敗データを取得
    const sRows = await fetchSheet(SHEET_NAMES.SCORES, 'A1:F');
    const failureScores = sRows.slice(1).filter(row => !toBool(row[4]));

    // 4. 失敗数を集計（ユーザー/パートごとにインデックスを事前構築）
    const failureMap = new Map();
    for (const row of failureScores) {
      const key = `${String(row[1])}|${String(row[2])}`;
      failureMap.set(key, (failureMap.get(key) || 0) + 1);
    }

    const stats = {};
    for (const user of nonAdminUsers) {
      stats[user.real_name] = {};
      for (const part of parts) {
        stats[user.real_name][part] = failureMap.get(`${user.user_id}|${part}`) || 0;
      }
    }

    return res.json({
      ok: true,
      users: nonAdminUsers.map(u => u.real_name),
      parts,
      stats,
    });
  } catch (err) {
    log.error(route, 'exception', { message: err?.message });
    return res.status(err.statusCode || 500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
