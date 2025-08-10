// backend/index.js
require('dotenv').config();            // .env 読み込み
const app = require('./src/app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`APIサーバー起動中 → http://localhost:${PORT}`);
});
