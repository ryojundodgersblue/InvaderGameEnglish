const express = require('express');
const cors = require('cors');

const loginRouter   = require('./routes/logInPage');
const rankingRouter = require('./routes/ranking');
const playGameRouter = require('./routes/playGame');

const app = express();
app.use(cors());
app.use(express.json());

// 動作確認用
app.get('/health', (req, res) => res.json({ ok: true }));

// ルーターをマウント
app.use('/auth',    loginRouter);   // 例: POST /auth/login
app.use('/ranking', rankingRouter); // 例: GET  /ranking
app.use('/game',    playGameRouter);

module.exports = app;
