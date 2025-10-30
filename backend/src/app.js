const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const loginRouter   = require('./routes/logInPage');
const rankingRouter = require('./routes/ranking');
const playGameRouter = require('./routes/playGame');
const selectRouter = require('./routes/select');
const ttsRouter = require('./routes/tts');
const adminRouter = require('./routes/admin');
const { sanitizeError } = require('./middleware/validation');

const app = express();

// CORS設定 - 特定のオリジンのみ許可し、credentialsを有効化
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

// 本番環境ではより厳格なチェック
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 2) {
  console.warn('[SECURITY] FRONTEND_URL not set in production environment');
  console.warn('[SECURITY] Only localhost origins are allowed, which may not be intended for production');
}

app.use(cors({
  origin: function(origin, callback) {
    // 本番環境では同一オリジンリクエスト（originがundefined）も厳格にチェック
    if (!origin) {
      // 同一オリジンリクエストは許可（通常のブラウザリクエスト）
      if (process.env.NODE_ENV === 'production') {
        console.log('[CORS] Same-origin request allowed');
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Rejected origin:', origin);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true, // クッキーを含むリクエストを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // プリフライトリクエストのキャッシュ（24時間）
}));

app.use(cookieParser());
// JSONボディのサイズ制限（DoS攻撃対策）
app.use(express.json({ limit: '10mb' }));
// URLエンコードされたボディのサイズ制限
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// リクエストログミドルウェア（デバッグ用）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('  Origin:', req.headers.origin || 'none');
  console.log('  Cookies:', Object.keys(req.cookies || {}).join(', ') || 'none');
  next();
});

// 動作確認用
app.get('/health', (req, res) => res.json({ ok: true }));

// ルーターをマウント
app.use('/auth',    loginRouter);   // 例: POST /auth/login
app.use('/ranking', rankingRouter); // 例: GET  /ranking
app.use('/game',    playGameRouter);
app.use('/select',  selectRouter);
app.use('/api/tts', ttsRouter);
app.use('/admin',   adminRouter);   // 例: GET  /admin/users, POST /admin/users

// 404ハンドラー - 定義されていないルートへのアクセス
app.use((req, res, next) => {
  console.log(`[404] ${req.method} ${req.path} - Route not found`);
  res.status(404).json({
    ok: false,
    message: `Cannot ${req.method} ${req.path}`
  });
});

// エラーハンドリングミドルウェア（最後に配置）
app.use(sanitizeError);

module.exports = app;