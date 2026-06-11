const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const loginRouter   = require('./routes/logInPage');
const rankingRouter = require('./routes/ranking');
const playGameRouter = require('./routes/playGame');
const selectRouter = require('./routes/select');
const ttsRouter = require('./routes/tts');
const adminRouter = require('./routes/admin');
const { sanitizeError } = require('./middleware/validation');

const app = express();

// Render等のリバースプロキシ配下でクライアントIPを正しく取得する
// (レート制限のIP判定に必須。直接公開時も害はない)
app.set('trust proxy', 1);

// セキュリティヘッダ(JSON APIなのでhelmet既定値で問題なし)
app.use(helmet());

// レート制限の共通レスポンス({ok, code, message}形式に合わせる)
const rateLimitResponse = {
  ok: false,
  code: 'SYS-429',
  message: 'アクセスが集中しています。しばらく待ってからお試しください',
};

// ログイン: ブルートフォース対策。
// 教室では学校Wi-Fi等の同一グローバルIPからクラス全員が一斉ログインするため、
// 成功はカウントせず(skipSuccessfulRequests)、失敗のみIPごとに15分100回まで。
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
});

// TTS: Google Cloud TTSのコスト悪用対策。
// 同一IPで教室30人が同時プレイ(1問あたり最大3回合成)しても収まる上限にする
// (30人 × 6回/分 = 180 + リトライ余裕)
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
});

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
// JSONボディのサイズ制限（DoS攻撃対策。最大のリクエストはTTSテキスト1000字程度）
app.use(express.json({ limit: '100kb' }));
// URLエンコードされたボディのサイズ制限
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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
app.use('/auth',    loginLimiter, loginRouter);   // 例: POST /auth/login
app.use('/ranking', rankingRouter); // 例: GET  /ranking
app.use('/game',    playGameRouter);
app.use('/select',  selectRouter);
app.use('/api/tts', ttsLimiter, ttsRouter);
app.use('/admin',   adminRouter);   // 例: GET  /admin/users, POST /admin/users

// 404ハンドラー - 定義されていないルートへのアクセス
app.use((req, res, next) => {
  console.log(`[SYS-404] ${req.method} ${req.path} - Route not found`);
  res.status(404).json({
    ok: false,
    code: 'SYS-404',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// エラーハンドリングミドルウェア（最後に配置）
app.use(sanitizeError);

module.exports = app;