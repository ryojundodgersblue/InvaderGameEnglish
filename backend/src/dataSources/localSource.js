// ローカルデータソース(DATA_SOURCE=local)
// backend/data/*.json を読み書きし、Google Sheetsと同じ
// 「ヘッダー行つき2次元配列」契約で fetchSheet を提供する。
// Google認証情報・Redisなしで起動できる(動作確認・開発用)。
const { SHEET_NAMES, HEADERS, validateHeader, nowTimestamp, USER_ID_PAD_LENGTH } = require('../utils/sheets');
const store = require('./jsonStore');

// シート名 → JSONファイル名/ヘッダー定義
const SHEET_DEF = {
  [SHEET_NAMES.USERS]: { file: 'users', header: HEADERS.USERS },
  [SHEET_NAMES.PARTS]: { file: 'parts', header: HEADERS.PARTS },
  [SHEET_NAMES.QUESTIONS]: { file: 'questions', header: HEADERS.QUESTIONS },
  [SHEET_NAMES.ANSWERS]: { file: 'answer_patterns', header: HEADERS.ANSWERS },
  [SHEET_NAMES.SCORES]: { file: 'scores', header: HEADERS.SCORES },
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

// 'A1:K' / 'A:K' / 'A1:A' などの範囲文字列から列数を求める
function rangeWidth(range) {
  const m = /:([A-Z]+)\d*$/i.exec(String(range || ''));
  if (!m) return Infinity;
  let n = 0;
  for (const ch of m[1].toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

function ensureReady() {
  store.ensureLoaded();
}

async function fetchSheet(sheetName, range, _opts = {}) {
  const { file, header } = def(sheetName);
  const rows = store.getRows(file);
  const width = Math.min(rangeWidth(range), header.length);
  const head = header.slice(0, width);
  const body = rows.map(obj => head.map(col => {
    const v = obj[col];
    return v === null || v === undefined ? '' : v;
  }));
  return [head, ...body];
}

async function fetchSheetWithValidation(sheetName, range, expectedHeader, opts = {}) {
  const rows = await fetchSheet(sheetName, range, opts);
  if (rows.length > 0) {
    validateHeader(rows, expectedHeader, sheetName, opts);
  }
  return rows;
}

async function appendScore({ user_id, part_id, scores, clear, avg_answer_time }) {
  const rows = store.getRows('scores');
  let nextId = 1;
  for (const r of rows) {
    const id = Number(r.score_id || 0);
    if (Number.isFinite(id) && id >= nextId) nextId = id + 1;
  }
  const play_date = nowTimestamp();
  rows.push({
    score_id: nextId,
    user_id: String(user_id),
    part_id: Number(part_id) || String(part_id),
    scores: Number(scores),
    clear: Boolean(clear),
    play_date,
    avg_answer_time: Number.isFinite(avg_answer_time) ? avg_answer_time : null,
  });
  await store.persist('scores');
  return { score_id: nextId, play_date };
}

function findUser(userId) {
  return store.getRows('users').find(u => String(u.user_id) === String(userId)) || null;
}

async function updateUserProgress(userId, { current_grade, current_part, current_subpart }) {
  const user = findUser(userId);
  if (!user) return false;
  if (current_grade !== undefined) user.current_grade = Number(current_grade);
  if (current_part !== undefined) user.current_part = Number(current_part);
  if (current_subpart !== undefined) user.current_subpart = Number(current_subpart);
  user.updated_at = nowTimestamp();
  await store.persist('users');
  return true;
}

async function updateUserPassword(userId, hashedPassword) {
  const user = findUser(userId);
  if (!user) return false;
  user.password = String(hashedPassword);
  user.updated_at = nowTimestamp();
  await store.persist('users');
  return true;
}

async function createUser({ hashedPassword, nickname, real_name }) {
  const rows = store.getRows('users');
  let nextId = 1;
  for (const r of rows) {
    const id = Number(r.id || 0);
    if (Number.isFinite(id) && id >= nextId) nextId = id + 1;
  }
  const user_id = String(nextId).padStart(USER_ID_PAD_LENGTH, '0');
  const now = nowTimestamp();
  rows.push({
    id: nextId,
    user_id,
    password: String(hashedPassword),
    nickname: String(nickname),
    real_name: String(real_name),
    current_grade: 1,
    current_part: 1,
    current_subpart: 1,
    is_admin: false,
    created_at: now,
    updated_at: now,
  });
  await store.persist('users');
  return { id: nextId, user_id };
}

module.exports = {
  name: 'local',
  ensureReady,
  fetchSheet,
  fetchSheetWithValidation,
  appendScore,
  updateUserProgress,
  updateUserPassword,
  createUser,
};
