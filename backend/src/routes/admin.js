// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/google');
const { hashPassword, generatePassword } = require('../utils/password');
const { validateBody } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');

const USER_SHEET_NAME = 'users';

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
const NS = 'admin';
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 8);
const logInfo  = (id, msg, extra) => console.info(`[${now()}] [${NS}] [${id}] INFO  ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
const logWarn  = (id, msg, extra) => console.warn(`[${now()}] [${NS}] [${id}] WARN  ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
const logError = (id, msg, extra) => console.error(`[${now()}] [${NS}] [${id}] ERROR ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);

/* ---------- ミドルウェア：管理者チェック ---------- */
const requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || !user.is_admin) {
    return res.status(403).json({ ok: false, message: '管理者権限が必要です' });
  }
  next();
};

/* ---------- ルート ---------- */

// ユーザー一覧取得
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  const reqId = rid();
  logInfo(reqId, 'get users request');

  try {
    const sheets = await getSheetsClient(true);

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      return res.json({ ok: true, users: [] });
    }

    const dataRows = rows.slice(1);
    const users = dataRows.map((row) => ({
      id: Number(row[COL.id] || 0),
      user_id: String(row[COL.user_id] || ''),
      password: String(row[COL.password] || ''),
      nickname: String(row[COL.nickname] || ''),
      real_name: String(row[COL.real_name] || ''),
      current_grade: Number(row[COL.current_grade] || 1),
      current_part: Number(row[COL.current_part] || 1),
      current_subpart: Number(row[COL.current_subpart] || 1),
      is_admin: row[COL.is_admin] === true || String(row[COL.is_admin] || '').toLowerCase() === 'true',
      created_at: String(row[COL.created_at] || ''),
      updated_at: String(row[COL.updated_at] || ''),
    }));

    logInfo(reqId, 'users fetched', { count: users.length });
    return res.json({ ok: true, users });
  } catch (err) {
    logError(reqId, 'exception', { message: err?.message, stack: err?.stack });
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

// 新規ユーザー登録
router.post('/users',
  verifyToken,
  requireAdmin,
  validateBody({
    nickname: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    real_name: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  const reqId = rid();
  const { nickname, real_name } = req.body || {};

  logInfo(reqId, 'register user request', { nickname, real_name });

  if (!nickname || !real_name) {
    logWarn(reqId, 'missing params');
    return res.status(400).json({ ok: false, message: 'nickname と real_name は必須です' });
  }

  try {
    const sheets = await getSheetsClient(false);

    // 既存のユーザーを取得
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    if (rows.length < 1) {
      logError(reqId, 'no header row');
      return res.status(500).json({ ok: false, message: 'usersシートにヘッダーがありません' });
    }

    const dataRows = rows.slice(1);

    // 次のIDとuser_idを計算
    let nextId = 1;
    let nextUserId = '00001';

    if (dataRows.length > 0) {
      const lastRow = dataRows[dataRows.length - 1];
      const lastId = Number(lastRow[COL.id] || 0);
      nextId = lastId + 1;
      nextUserId = String(nextId).padStart(5, '0');
    }

    // パスワードを自動生成
    const plainPassword = generatePassword(8);
    const hashedPassword = await hashPassword(plainPassword);

    // タイムスタンプ
    const timestamp = new Date().toISOString();

    // 新しい行を追加
    const newRow = [
      nextId,                 // id
      nextUserId,             // user_id
      hashedPassword,         // password (ハッシュ化)
      nickname,               // nickname
      real_name,              // real_name
      1,                      // current_grade
      1,                      // current_part
      1,                      // current_subpart
      false,                  // is_admin
      timestamp,              // created_at
      timestamp,              // updated_at
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [newRow],
      },
    });

    logInfo(reqId, 'user registered', { user_id: nextUserId });

    return res.json({
      ok: true,
      user_id: nextUserId,
      password: plainPassword, // 平文パスワードを返す（1回だけ表示される）
    });
  } catch (err) {
    logError(reqId, 'exception', { message: err?.message, stack: err?.stack });
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

// ユーザー情報更新
router.put('/users/:userId',
  verifyToken,
  requireAdmin,
  validateBody({
    current_grade: { type: 'number', required: false },
    current_part: { type: 'number', required: false }
  }),
  async (req, res) => {
  const reqId = rid();
  const { userId } = req.params;
  const { current_grade, current_part } = req.body || {};

  logInfo(reqId, 'update user request', { userId, current_grade, current_part });

  if (!userId) {
    return res.status(400).json({ ok: false, message: 'userId が必要です' });
  }

  try {
    const sheets = await getSheetsClient(false);

    // 既存のユーザーを取得
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const dataRows = rows.slice(1);

    // user_idが一致する行を探す
    const rowIndex = dataRows.findIndex(r => String(r[COL.user_id] || '') === String(userId));
    if (rowIndex === -1) {
      logWarn(reqId, 'user not found', { userId });
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    // 更新する行（実際のシートの行番号は2から始まる + rowIndex）
    const sheetRowNumber = rowIndex + 2;
    const row = dataRows[rowIndex];

    // 更新値を設定
    const updatedGrade = current_grade !== undefined ? current_grade : Number(row[COL.current_grade] || 1);
    const updatedPart = current_part !== undefined ? current_part : Number(row[COL.current_part] || 1);
    const timestamp = new Date().toISOString();

    // 行全体を更新
    const updatedRow = [...row];
    updatedRow[COL.current_grade] = updatedGrade;
    updatedRow[COL.current_part] = updatedPart;
    updatedRow[COL.updated_at] = timestamp;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A${sheetRowNumber}:K${sheetRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    logInfo(reqId, 'user updated', { userId });

    return res.json({ ok: true });
  } catch (err) {
    logError(reqId, 'exception', { message: err?.message, stack: err?.stack });
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

// パスワード変更
router.post('/reset-password',
  verifyToken,
  requireAdmin,
  validateBody({
    user_id: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  const reqId = rid();
  const { user_id } = req.body || {};

  logInfo(reqId, 'reset password request', { user_id });

  if (!user_id) {
    return res.status(400).json({ ok: false, message: 'user_id が必要です' });
  }

  try {
    const sheets = await getSheetsClient(false);

    // 既存のユーザーを取得
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const dataRows = rows.slice(1);

    // user_idが一致する行を探す
    const rowIndex = dataRows.findIndex(r => String(r[COL.user_id] || '') === String(user_id));
    if (rowIndex === -1) {
      logWarn(reqId, 'user not found', { user_id });
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    // 更新する行（実際のシートの行番号は2から始まる + rowIndex）
    const sheetRowNumber = rowIndex + 2;
    const row = dataRows[rowIndex];

    // 新しいパスワードを生成
    const plainPassword = generatePassword(8);
    const hashedPassword = await hashPassword(plainPassword);
    const timestamp = new Date().toISOString();

    // パスワードとupdated_atを更新
    const updatedRow = [...row];
    updatedRow[COL.password] = hashedPassword;
    updatedRow[COL.updated_at] = timestamp;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A${sheetRowNumber}:K${sheetRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    logInfo(reqId, 'password reset', { user_id });

    return res.json({
      ok: true,
      user_id,
      password: plainPassword, // 平文パスワードを返す
    });
  } catch (err) {
    logError(reqId, 'exception', { message: err?.message, stack: err?.stack });
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

// パート別ミス数取得
router.get('/failure-stats', verifyToken, requireAdmin, async (req, res) => {
  const reqId = rid();
  logInfo(reqId, 'get failure-stats request');

  try {
    const sheets = await getSheetsClient(true);

    // 1. usersシートから非管理者ユーザーを取得
    const uResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const uRows = uResp.data.values || [];
    if (uRows.length < 2) {
      return res.json({ ok: true, users: [], parts: [], stats: {} });
    }

    const nonAdminUsers = uRows.slice(1)
      .filter(row => {
        const isAdmin = row[COL.is_admin] === true || String(row[COL.is_admin] || '').toLowerCase() === 'true';
        return !isAdmin;
      })
      .map(row => ({
        user_id: String(row[COL.user_id] || ''),
        real_name: String(row[COL.real_name] || ''),
      }));

    // 2. partsシートからpart_idリストを取得
    const pResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'parts!A1:A',
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const pRows = pResp.data.values || [];
    const parts = pRows.slice(1).map(row => String(row[0] || '')).filter(p => p);

    // 3. scoresシートから失敗データを取得
    // ★ FORMATTED_VALUE を使用して user_id の先頭ゼロを保持（例: 00002）
    const sResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'scores!A1:F',
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const sRows = sResp.data.values || [];

    // scoresの列インデックス: 0:score_id, 1:user_id, 2:part_id, 3:scores, 4:clear, 5:play_date
    const failureScores = sRows.slice(1).filter(row => {
      const clear = row[4] === true || String(row[4] || '').toLowerCase() === 'true';
      return !clear; // clearがfalseのもののみ
    });

    // 4. 統計データを作成
    const stats = {};
    for (const user of nonAdminUsers) {
      stats[user.real_name] = {};
      for (const part of parts) {
        const count = failureScores.filter(
          row => String(row[1]) === user.user_id && String(row[2]) === part
        ).length;
        stats[user.real_name][part] = count;
      }
    }

    logInfo(reqId, 'failure-stats fetched', { userCount: nonAdminUsers.length, partCount: parts.length });

    return res.json({
      ok: true,
      users: nonAdminUsers.map(u => u.real_name),
      parts,
      stats,
    });
  } catch (err) {
    logError(reqId, 'exception', { message: err?.message, stack: err?.stack });
    return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
