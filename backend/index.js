// backend/index.js
require('dotenv').config();            // .env 読み込み
const app = require('./src/app');
const { getSheetsClient, getTTSClient } = require('./src/services/google');
const { getCache, setCache, getSheetsKey } = require('./src/services/redis');
const { SHEET_NAMES, fetchSheet } = require('./src/utils/sheets');

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`APIサーバー起動中 → http://localhost:${PORT}`);

  // ウォームアップ: 初回ログインを高速化するためにクライアントとデータを事前読み込み
  try {
    console.log('[Warmup] Google APIクライアント初期化中...');
    await getSheetsClient(true);
    await getSheetsClient(false);
    await getTTSClient();
    console.log('[Warmup] Google APIクライアント初期化完了');

    // ユーザーデータをRedisにプリキャッシュ
    const cacheKey = getSheetsKey(SHEET_NAMES.USERS, 'A1:K');
    const cached = await getCache(cacheKey);
    if (!cached) {
      const rows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
      if (rows.length > 0) {
        await setCache(cacheKey, rows, 60);
        console.log(`[Warmup] ユーザーデータをキャッシュ (${rows.length} 行)`);
      }
    } else {
      console.log('[Warmup] ユーザーデータはキャッシュ済み');
    }
  } catch (err) {
    console.warn('[Warmup] 事前読み込みに失敗（サービスは正常に起動）:', err.message);
  }
});
