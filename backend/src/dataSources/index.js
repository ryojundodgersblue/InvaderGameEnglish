// データソースの選択
//   DATA_SOURCE=local  → backend/data/*.json を読み書き(Google認証不要)
//   それ以外(既定)     → Google Sheets
const isLocalMode = () => String(process.env.DATA_SOURCE || '').toLowerCase() === 'local';

const source = isLocalMode()
  ? require('./localSource')
  : require('./sheetsSource');

module.exports = { ...source, isLocalMode };
