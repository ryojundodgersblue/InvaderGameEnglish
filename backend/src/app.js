const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const loginRouter   = require('./routes/logInPage');
const rankingRouter = require('./routes/ranking');
const playGameRouter = require('./routes/playGame');
const selectRouter = require('./routes/select');
const ttsRouter = require('./routes/tts');
const { sanitizeError } = require('./middleware/validation');

const app = express();

// CORS設定 - 特定のオリジンのみ許可し、credentialsを有効化
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // originがundefinedの場合（同一オリジン）またはallowedOriginsに含まれる場合は許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true, // クッキーを含むリクエストを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json());

// 動作確認用
app.get('/health', (req, res) => res.json({ ok: true }));

// ルーターをマウント
app.use('/auth',    loginRouter);   // 例: POST /auth/login
app.use('/ranking', rankingRouter); // 例: GET  /ranking
app.use('/game',    playGameRouter);
app.use('/select',  selectRouter);
app.use('/api/tts', ttsRouter);

// エラーハンドリングミドルウェア（最後に配置）
app.use(sanitizeError);

module.exports = app;