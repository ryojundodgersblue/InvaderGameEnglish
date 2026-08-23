// Google Sheets操作の共通ユーティリティ
const { getSheetsClient, SPREADSHEET_ID, IS_LOCAL_MODE } = require('../services/google');

// ===== シート名定数 =====
const SHEET_NAMES = {
  USERS: 'users',
  PARTS: 'parts',
  QUESTIONS: 'questions',
  ANSWERS: 'answer_patterns',
  SCORES: 'scores',
};

// ===== ヘッダー定数 =====
const HEADERS = {
  USERS: ['id', 'user_id', 'password', 'nickname', 'real_name', 'current_grade', 'current_part', 'current_subpart', 'is_admin', 'created_at', 'updated_at'],
  PARTS: ['part_id', 'grade_id', 'part_no', 'subpart_no', 'requirement'],
  QUESTIONS: ['question_id', 'part_id', 'display_order', 'is_demo', 'question_text', 'image_url'],
  ANSWERS: ['id', 'question_id', 'expected_text'],
  SCORES: ['score_id', 'user_id', 'part_id', 'scores', 'clear', 'play_date'],
};

// ===== usersシートの列インデックス =====
const USER_COL = {
  id: 0,
  user_id: 1,
  password: 2,
  nickname: 3,
  real_name: 4,
  current_grade: 5,
  current_part: 6,
  current_subpart: 7,
  is_admin: 8,
  created_at: 9,
  updated_at: 10,
};

// ===== ゲーム定数 =====
const MAX_QUESTIONS = 8;
// 未クリアでも次ステージを解放する挑戦回数 (2026-08-11 Mukaさん依頼で10回→3回)
const REQUIRED_ATTEMPTS = 3;
const RANKING_TOP_N = 3;
const PASSWORD_LENGTH = 8;
const USER_ID_PAD_LENGTH = 5;

// ===== 共通関数 =====

/**
 * SPREADSHEET_IDが設定されているか確認
 */
function ensureSheetId() {
  if (IS_LOCAL_MODE) return; // ローカルデータモードではSHEET_ID不要
  if (!SPREADSHEET_ID) {
    const err = new Error('SHEET_ID が未設定です');
    err.statusCode = 500;
    throw err;
  }
}

/**
 * ヘッダー行を検証する
 * @param {Array} rows - シートの行データ
 * @param {Array} expectedHeader - 期待するヘッダー配列
 * @param {string} sheetName - シート名（エラーメッセージ用）
 */
function validateHeader(rows, expectedHeader, sheetName) {
  const header = (rows[0] || []).map(v => String(v ?? '').trim());
  const ok = header.length === expectedHeader.length &&
    expectedHeader.every((h, i) => h === header[i]);
  if (!ok) {
    const err = new Error(`${sheetName} ヘッダ不一致`);
    err.statusCode = 500;
    err.details = { expected: expectedHeader, actual: header };
    throw err;
  }
}

/**
 * シートからデータを取得する
 * @param {string} sheetName - シート名
 * @param {string} range - 列範囲 (例: 'A1:K')
 * @param {Object} opts - オプション
 * @param {boolean} opts.readonly - 読み取り専用か (default: true)
 * @param {string} opts.valueRenderOption - 値のレンダリングオプション (default: 'FORMATTED_VALUE')
 */
async function fetchSheet(sheetName, range, opts = {}) {
  const {
    readonly = true,
    valueRenderOption = 'FORMATTED_VALUE',
  } = opts;

  ensureSheetId();
  const sheets = await getSheetsClient(readonly);
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
    valueRenderOption,
  });
  return resp.data.values || [];
}

/**
 * シートのデータを取得し、ヘッダーを検証する
 */
async function fetchSheetWithValidation(sheetName, range, expectedHeader, opts = {}) {
  const rows = await fetchSheet(sheetName, range, opts);
  if (rows.length > 0) {
    validateHeader(rows, expectedHeader, sheetName);
  }
  return rows;
}

/**
 * user_idでユーザー行を検索する
 * @returns {{ rowIndex: number, row: Array, absRow: number }} - rowIndex: dataRows内のindex, absRow: シート上の行番号
 */
function findUserRow(dataRows, userId) {
  const rowIndex = dataRows.findIndex(
    r => String(r[USER_COL.user_id] || '') === String(userId)
  );
  if (rowIndex === -1) return null;
  return {
    rowIndex,
    row: dataRows[rowIndex],
    absRow: rowIndex + 2, // ヘッダー行 + 0始まり補正
  };
}

/**
 * user_id を突合用に正規化する（数字のみの場合は先頭ゼロを除去）。
 * usersシートは "00007" のようなゼロ埋め文字列だが、scoresシートには
 * USER_ENTERED書き込みで数値化された 7 が混在しているため、
 * 両者を同じ表現に揃えてから比較する。
 */
function canonUserId(value) {
  const s = String(value ?? '').trim();
  return /^\d+$/.test(s) ? String(Number(s)) : s;
}

/**
 * 値をbooleanに変換する（Sheetsのデータはstring/number/booleanが混在するため）
 */
function toBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
    || (typeof value === 'string' && value.toLowerCase() === 'true');
}

/**
 * 現在のタイムスタンプ（Sheets書き込み用フォーマット）
 */
function nowTimestamp() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${z(d.getMonth() + 1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

module.exports = {
  SHEET_NAMES,
  HEADERS,
  USER_COL,
  MAX_QUESTIONS,
  REQUIRED_ATTEMPTS,
  RANKING_TOP_N,
  PASSWORD_LENGTH,
  USER_ID_PAD_LENGTH,
  ensureSheetId,
  validateHeader,
  fetchSheet,
  fetchSheetWithValidation,
  findUserRow,
  canonUserId,
  toBool,
  nowTimestamp,
  getSheetsClient,
  SPREADSHEET_ID,
};
