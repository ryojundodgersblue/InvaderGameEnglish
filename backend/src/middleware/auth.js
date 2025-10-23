// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * JWTトークンを生成する
 * @param {Object} payload - トークンに含める情報（userId, nameなど）
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * JWTトークンを検証するミドルウェア
 * クッキーからトークンを読み取り、検証する
 */
function authenticateToken(req, res, next) {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: '認証が必要です'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // デコードしたユーザー情報をreq.userに格納
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        message: 'トークンの有効期限が切れています'
      });
    }
    return res.status(403).json({
      ok: false,
      message: '無効なトークンです'
    });
  }
}

/**
 * オプショナルな認証ミドルウェア
 * トークンがあれば検証するが、なくてもエラーにしない
 */
function optionalAuth(req, res, next) {
  const token = req.cookies?.authToken;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }

  next();
}

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
