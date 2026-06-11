// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const { hashPassword, generatePassword } = require('../utils/password');
const { validateBody } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const {
  SHEET_NAMES, USER_COL, SHEET_RANGES,
  PASSWORD_LENGTH,
  toBool,
} = require('../utils/sheets');
const ds = require('../dataSources');

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
    ds.ensureReady();
    const rows = await ds.fetchSheet(SHEET_NAMES.USERS, SHEET_RANGES.USERS);
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
    ds.ensureReady();

    const plainPassword = generatePassword(PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(plainPassword);

    const created = await ds.createUser({ hashedPassword, nickname, real_name });

    log.info(route, 'user registered', { user_id: created.user_id });
    return res.json({ ok: true, user_id: created.user_id, password: plainPassword });
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
    ds.ensureReady();
    const updated = await ds.updateUserProgress(userId, {
      current_grade, current_part, current_subpart,
    });
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

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
    ds.ensureReady();
    const plainPassword = generatePassword(PASSWORD_LENGTH);
    const hashedPassword = await hashPassword(plainPassword);

    const updated = await ds.updateUserPassword(user_id, hashedPassword);
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

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
    ds.ensureReady();

    // 1. usersシートから非管理者ユーザーを取得
    const uRows = await ds.fetchSheet(SHEET_NAMES.USERS, SHEET_RANGES.USERS, { valueRenderOption: 'UNFORMATTED_VALUE' });
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
    const pRows = await ds.fetchSheet(SHEET_NAMES.PARTS, 'A1:A', { valueRenderOption: 'UNFORMATTED_VALUE' });
    const parts = pRows.slice(1).map(row => String(row[0] || '')).filter(Boolean);

    // 3. scoresシートから失敗データを取得
    const sRows = await ds.fetchSheet(SHEET_NAMES.SCORES, SHEET_RANGES.SCORES);
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
