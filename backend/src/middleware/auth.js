// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 本番環境では環境変数が必須、開発環境ではランダム生成
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET is not set in production environment!');
    throw new Error('JWT_SECRET must be set in production environment');
  } else {
    // 開発環境では警告を出してランダム生成
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    console.warn('[SECURITY] JWT_SECRET not set, using randomly generated key for development');
    console.warn('[SECURITY] This key will change on restart. Set JWT_SECRET in .env for consistency');
  }
}

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
  console.log('[AUTH] Request to:', req.method, req.path);
  console.log('[AUTH] Cookies:', Object.keys(req.cookies || {}));

  const token = req.cookies?.authToken;

  if (!token) {
    console.log('[AUTH] No token found in cookies');
    return res.status(401).json({
      ok: false,
      message: '認証が必要です'
    });
  }

  console.log('[AUTH] Token found, verifying...');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // デコードしたユーザー情報をreq.userに格納
    req.user = decoded;
    console.log('[AUTH] Token verified successfully for user:', decoded.userId);
    next();
  } catch (err) {
    console.log('[AUTH] Token verification failed:', err.name, err.message);
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
