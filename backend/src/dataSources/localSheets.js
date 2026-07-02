// Google Sheets APIクライアント互換のローカル実装(DATA_SOURCE=local用)
// backend/data/*.json を「ヘッダー行つき2次元配列」契約で読み書きする。
// services/google.js の getSheetsClient がローカルモード時にこれを返すため、
// ルート側のコードは一切変更せずに Google認証情報なしで動作確認ができる。
const store = require('./jsonStore');

// シート名 → JSONファイル名/ヘッダー定義
// (utils/sheets.js とは相互requireになるため、定義をここに持つ)
const SHEET_DEF = {
  users: {
    file: 'users',
    header: ['id', 'user_id', 'password', 'nickname', 'real_name', 'current_grade',
      'current_part', 'current_subpart', 'is_admin', 'created_at', 'updated_at'],
  },
  parts: {
    file: 'parts',
    header: ['part_id', 'grade_id', 'part_no', 'subpart_no', 'requirement'],
  },
  questions: {
    file: 'questions',
    header: ['question_id', 'part_id', 'display_order', 'is_demo', 'question_text', 'image_url'],
  },
  answer_patterns: {
    file: 'answer_patterns',
    header: ['id', 'question_id', 'expected_text'],
  },
  scores: {
    file: 'scores',
    header: ['score_id', 'user_id', 'part_id', 'scores', 'clear', 'play_date'],
  },
};

function def(sheetName) {
  const d = SHEET_DEF[sheetName];
  if (!d) {
    const err = new Error(`未知のシート名: ${sheetName}`);
    err.statusCode = 500;
    throw err;
  }
  return d;
}

function colToIndex(letters) {
  let n = 0;
  for (const ch of String(letters).toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1; // 0始まり
}

// 'users!A1:K' / 'scores!A:F' / 'users!F5:H5' を分解する
function parseRange(rangeStr) {
  const m = /^([^!]+)!([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/.exec(String(rangeStr));
  if (!m) {
    const err = new Error(`未対応のrange形式: ${rangeStr}`);
    err.statusCode = 500;
    throw err;
  }
  return {
    sheet: m[1],
    startCol: colToIndex(m[2]),
    startRow: m[3] ? Number(m[3]) : null,
    endCol: m[4] !== undefined ? colToIndex(m[4]) : null,
    endRow: m[5] ? Number(m[5]) : null,
  };
}

function toCell(v) {
  return v === null || v === undefined ? '' : v;
}

const values = {
  // 読み取り: ヘッダー行 + データ行を範囲幅で返す
  async get({ range }) {
    const r = parseRange(range);
    const { file, header } = def(r.sheet);
    const width = r.endCol !== null ? r.endCol + 1 : header.length;
    const head = header.slice(r.startCol, width);
    const body = store.getRows(file).map(obj => head.map(col => toCell(obj[col])));
    return { data: { values: [head, ...body] } };
  },

  // 追記: 行配列をヘッダーに対応づけてオブジェクト化し末尾に追加
  async append({ range, requestBody }) {
    const r = parseRange(range);
    const { file, header } = def(r.sheet);
    const rows = store.getRows(file);
    for (const rowValues of requestBody.values || []) {
      const obj = {};
      header.forEach((col, i) => {
        obj[col] = rowValues[i] !== undefined ? rowValues[i] : '';
      });
      rows.push(obj);
    }
    await store.persist(file);
    return { data: {} };
  },

  // 更新: 絶対行番号(1始まり・ヘッダー行込み)の指定列を書き換える
  async update({ range, requestBody }) {
    const r = parseRange(range);
    const { file, header } = def(r.sheet);
    const rows = store.getRows(file);
    const rowValues = (requestBody.values || [])[0] || [];
    if (r.startRow === null || r.startRow < 2) {
      const err = new Error(`updateには絶対行番号が必要です: ${range}`);
      err.statusCode = 500;
      throw err;
    }
    const target = rows[r.startRow - 2]; // ヘッダー行 + 1始まり補正
    if (!target) {
      const err = new Error(`update対象行がありません: ${range}`);
      err.statusCode = 500;
      throw err;
    }
    rowValues.forEach((v, i) => {
      const col = header[r.startCol + i];
      if (col) target[col] = v;
    });
    await store.persist(file);
    return { data: {} };
  },
};

// googleapis の sheets クライアントと同じ形
const localSheetsClient = { spreadsheets: { values } };

// ---- TTSスタブ ----
// ローカルモードではGoogle Cloud TTSを呼ばず、無音WAV(約300ms)を返す。
// ゲームの再生フロー(再生完了イベント等)はそのまま動作する。
function buildSilentWav(ms = 300, sampleRate = 8000) {
  const samples = Math.floor((ms / 1000) * sampleRate);
  const dataSize = samples * 2; // 16bit mono
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(1, 22);         // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

const SILENT_AUDIO_BASE64 = buildSilentWav().toString('base64');

const localTTSClient = {
  async synthesizeSpeech() {
    return [{ audioContent: SILENT_AUDIO_BASE64 }];
  },
  async listVoices() {
    return [{ voices: [] }];
  },
};

module.exports = { localSheetsClient, localTTSClient };
