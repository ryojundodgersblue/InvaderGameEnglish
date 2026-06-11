// Google Sheets データソース(既定)
// 読み取りは utils/sheets の fetchSheet をそのまま使用し、
// 書き込みは従来ルート内に散在していた values.append / values.update を
// セマンティックなメソッドとして集約する(挙動は従来と同一)。
const {
  SHEET_NAMES, HEADERS, USER_COL, USER_ID_PAD_LENGTH,
  ensureSheetId, fetchSheet, fetchSheetWithValidation,
  findUserRow, nowTimestamp, headerIndexMap,
  getSheetsClient, SPREADSHEET_ID,
} = require('../utils/sheets');

function ensureReady() {
  ensureSheetId();
}

async function appendScore({ user_id, part_id, scores, clear, avg_answer_time }) {
  const sRows = await fetchSheet(SHEET_NAMES.SCORES, 'A1:G');
  let nextId = 1;
  if (sRows.length >= 2) {
    const ids = sRows.slice(1).map(r => Number(r[0] || 0)).filter(n => Number.isFinite(n));
    if (ids.length) nextId = Math.max(...ids) + 1;
  }
  const play_date = nowTimestamp();
  const row = [String(nextId), String(user_id), String(part_id), Number(scores), Boolean(clear), play_date];

  // avg_answer_time 列が存在するシートにのみ7列目を書き込む(後方互換)
  const header = headerIndexMap(sRows[0] || []);
  const hasAvgCol = header.has('avg_answer_time');
  if (hasAvgCol) {
    row.push(Number.isFinite(avg_answer_time) ? avg_answer_time : '');
  }

  const sheets = await getSheetsClient(false);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.SCORES}!A:${hasAvgCol ? 'G' : 'F'}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  return { score_id: nextId, play_date };
}

async function findUserAbsRow(userId) {
  const rows = await fetchSheetWithValidation(SHEET_NAMES.USERS, 'A1:K', HEADERS.USERS);
  if (rows.length < 2) return null;
  return findUserRow(rows.slice(1), userId);
}

async function updateUserProgress(userId, { current_grade, current_part, current_subpart }) {
  const found = await findUserAbsRow(userId);
  if (!found) return false;
  const { row, absRow } = found;

  const grade = current_grade !== undefined ? Number(current_grade) : Number(row[USER_COL.current_grade] || 1);
  const part = current_part !== undefined ? Number(current_part) : Number(row[USER_COL.current_part] || 1);
  const subpart = current_subpart !== undefined ? Number(current_subpart) : Number(row[USER_COL.current_subpart] || 1);

  const sheets = await getSheetsClient(false);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.USERS}!F${absRow}:H${absRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[grade, part, subpart]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.USERS}!K${absRow}:K${absRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nowTimestamp()]] },
  });
  return true;
}

async function updateUserPassword(userId, hashedPassword) {
  const found = await findUserAbsRow(userId);
  if (!found) return false;
  const { absRow } = found;

  const sheets = await getSheetsClient(false);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.USERS}!C${absRow}:C${absRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[String(hashedPassword)]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.USERS}!K${absRow}:K${absRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nowTimestamp()]] },
  });
  return true;
}

async function createUser({ hashedPassword, nickname, real_name }) {
  const rows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
  if (rows.length < 1) {
    const err = new Error('usersシートにヘッダーがありません');
    err.statusCode = 500;
    throw err;
  }
  let nextId = 1;
  for (const r of rows.slice(1)) {
    const id = Number(r[USER_COL.id] || 0);
    if (Number.isFinite(id) && id >= nextId) nextId = id + 1;
  }
  const user_id = String(nextId).padStart(USER_ID_PAD_LENGTH, '0');
  const now = nowTimestamp();
  const newRow = [
    nextId, user_id, String(hashedPassword), String(nickname), String(real_name),
    1, 1, 1, false, now, now,
  ];

  const sheets = await getSheetsClient(false);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.USERS}!A:K`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [newRow] },
  });
  return { id: nextId, user_id };
}

module.exports = {
  name: 'sheets',
  ensureReady,
  fetchSheet,
  fetchSheetWithValidation,
  appendScore,
  updateUserProgress,
  updateUserPassword,
  createUser,
};
