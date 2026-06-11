// backend/src/routes/logInPage.js
const express = require('express');
const router = express.Router();
const { verifyPassword, isPasswordHashed } = require('../utils/password');
const { generateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { getCache, setCache, getSheetsKey } = require('../services/redis');
const { createLogger } = require('../utils/logger');
const {
  SHEET_NAMES, HEADERS, USER_COL, SHEET_RANGES,
  validateHeader, findUserRow, toBool,
} = require('../utils/sheets');
const ds = require('../dataSources');

const log = createLogger('auth');

const maskUser = (u) => {
  const s = String(u || '');
  if (s.length <= 2) return '*'.repeat(s.length);
  return s.slice(0, 1) + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1);
};

router.post('/login',
  validateBody({
    userId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    password: { type: 'string', required: true, minLength: 1, maxLength: 200 },
  }),
  async (req, res) => {
    const reqId = log.rid();
    const route = reqId;

    const { userId, password } = req.body || {};
    log.info(route, 'request received', { userId: maskUser(userId) });

    try {
      ds.ensureReady();

      // Redisキャッシュを確認
      const cacheKey = getSheetsKey(SHEET_NAMES.USERS, SHEET_RANGES.USERS);
      let rows = await getCache(cacheKey);

      if (!rows) {
        rows = await ds.fetchSheet(SHEET_NAMES.USERS, SHEET_RANGES.USERS);
        if (rows.length > 0) {
          await setCache(cacheKey, rows, 60);
        }
      }

      if (rows.length < 2) {
        return res.status(500).json({ ok: false, message: 'ユーザーデータが存在しません' });
      }

      validateHeader(rows, HEADERS.USERS, SHEET_NAMES.USERS);

      const found = findUserRow(rows.slice(1), userId);
      if (!found) {
        log.warn(route, 'user not found', { userId: maskUser(userId) });
        return res.status(401).json({ ok: false, message: '認証に失敗しました' });
      }
      const { row } = found;

      // パスワード検証
      const storedPassword = String(row[USER_COL.password] || '');
      let passwordMatch = false;

      if (isPasswordHashed(storedPassword)) {
        try {
          passwordMatch = await verifyPassword(String(password), storedPassword);
        } catch (err) {
          log.error(route, 'password verification error', { message: err?.message });
          return res.status(500).json({ ok: false, message: 'サーバーエラーが発生しました' });
        }
      } else {
        passwordMatch = storedPassword === String(password);
        log.warn(route, 'plain-text password detected', { userId: maskUser(userId) });
      }

      if (!passwordMatch) {
        log.warn(route, 'password mismatch', { userId: maskUser(userId) });
        return res.status(401).json({ ok: false, message: '認証に失敗しました' });
      }

      const name = String(row[USER_COL.nickname] || '');
      const current_grade = Number(row[USER_COL.current_grade] ?? 0) || 0;
      const current_part = Number(row[USER_COL.current_part] ?? 0) || 0;
      const current_subpart = Number(row[USER_COL.current_subpart] ?? 0) || 0;
      const is_admin = toBool(row[USER_COL.is_admin]);

      log.info(route, 'login success', { userId: maskUser(userId), nickname: name });

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
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.json({
        ok: true,
        user: { userId: String(userId), name, current_grade, current_part, current_subpart, is_admin },
      });
    } catch (err) {
      log.error(route, 'exception', { message: err?.message });
      return res.status(err.statusCode || 500).json({
        ok: false,
        message: err.statusCode ? err.message : 'サーバーエラーが発生しました'
      });
    }
  },
);

module.exports = router;
