// backend/data/*.json の読み込み・永続化(ローカルデータモード用)
// - 起動時に全シート相当のJSONをメモリへロード
// - 書き込みはメモリ更新後、一時ファイル+rename で原子的に永続化
// - 書き込みはファイルごとに直列化(同時書き込みによる破損防止)
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.LOCAL_DATA_DIR || path.join(__dirname, '..', '..', 'data');

const FILES = ['users', 'parts', 'questions', 'answer_patterns', 'scores'];

let cache = null; // { users: [...], parts: [...], ... }
const writeQueues = new Map(); // name -> Promise(直列化用)

function dataDir() {
  return DATA_DIR;
}

function ensureLoaded() {
  if (cache) return cache;
  cache = {};
  for (const name of FILES) {
    const file = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(file)) {
      const err = new Error(
        `ローカルデータファイルがありません: ${file}（scripts/build_from_question_sheet.py を実行してください）`);
      err.statusCode = 500;
      throw err;
    }
    cache[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return cache;
}

function getRows(name) {
  const data = ensureLoaded();
  if (!data[name]) {
    const err = new Error(`未知のローカルデータ: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return data[name];
}

async function persist(name) {
  const prev = writeQueues.get(name) || Promise.resolve();
  const next = prev.then(async () => {
    const file = path.join(DATA_DIR, `${name}.json`);
    const tmp = `${file}.tmp`;
    const json = JSON.stringify(cache[name], null, 2) + '\n';
    await fsp.writeFile(tmp, json, 'utf8');
    await fsp.rename(tmp, file);
  });
  // エラーでもキューを止めない
  writeQueues.set(name, next.catch(() => {}));
  return next;
}

// テスト用: メモリキャッシュ破棄(次回アクセスで再ロード)
function resetCache() {
  cache = null;
}

module.exports = { dataDir, ensureLoaded, getRows, persist, resetCache };
