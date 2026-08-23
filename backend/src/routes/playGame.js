// backend/src/routes/playGame.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateQuery, validateBody } = require('../middleware/validation');
const { getCache, setCache, getSheetsKey, DEFAULT_TTL } = require('../services/redis');
const { createLogger } = require('../utils/logger');
const {
  SHEET_NAMES, HEADERS, USER_COL,
  MAX_QUESTIONS, REQUIRED_ATTEMPTS,
  ensureSheetId, validateHeader, fetchSheet, fetchSheetWithValidation,
  findUserRow, canonUserId, toBool, nowTimestamp,
  getSheetsClient, SPREADSHEET_ID,
} = require('../utils/sheets');

const log = createLogger('game');

/* =========================
   GET /game/part?grade=&part=&subpart=
   ========================= */
router.get('/part',
  authenticateToken,
  validateQuery({
    grade: { type: 'number', required: true, min: 1, max: 100 },
    part: { type: 'number', required: true, min: 1, max: 100 },
    subpart: { type: 'number', required: true, min: 1, max: 100 }
  }),
  async (req, res) => {
  const route = 'GET /part';
  try {
    ensureSheetId();
    const { grade, part, subpart } = req.query;

    // Redisキャッシュ
    const cacheKey = getSheetsKey(SHEET_NAMES.PARTS, `${grade}-${part}-${subpart}`);
    const cachedData = await getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    const rows = await fetchSheetWithValidation(
      SHEET_NAMES.PARTS, 'A1:E', HEADERS.PARTS,
      { valueRenderOption: 'UNFORMATTED_VALUE' }
    );

    const hit = rows.slice(1).find(r =>
      String(r[1]) === String(grade) &&
      String(r[2]) === String(part) &&
      String(r[3]) === String(subpart)
    );
    if (!hit) {
      return res.status(404).json({ ok: false, message: '該当 part が見つかりません' });
    }

    const result = { ok: true, part: { part_id: String(hit[0]), requirement: String(hit[4] ?? '') } };
    await setCache(cacheKey, result, DEFAULT_TTL.SHEETS_DATA);
    res.json(result);
  } catch (e) {
    log.error(route, 'Error', { message: e.message });
    res.status(e.statusCode || 500).json({ ok: false, message: e.statusCode ? e.message : 'part 取得に失敗' });
  }
});

/* =========================
   GET /game/questions?part_id=
   ========================= */
router.get('/questions',
  authenticateToken,
  validateQuery({
    part_id: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  const route = 'GET /questions';
  try {
    ensureSheetId();
    const { part_id } = req.query;

    const cacheKey = getSheetsKey(SHEET_NAMES.QUESTIONS, part_id);
    const cachedData = await getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    // 問題
    const qRows = await fetchSheetWithValidation(
      SHEET_NAMES.QUESTIONS, 'A1:F', HEADERS.QUESTIONS,
      { valueRenderOption: 'UNFORMATTED_VALUE' }
    );

    let questions = qRows.slice(1)
      .filter(r => String(r[1]) === String(part_id))
      .map(r => ({
        question_id: String(r[0]),
        part_id: String(r[1]),
        display_order: Number(r[2] ?? 0),
        is_demo: String(r[3] ?? '').toLowerCase() === 'true',
        question_text: String(r[4] ?? ''),
        image_url: String(r[5] ?? ''),
      }))
      .sort((a, b) => a.display_order - b.display_order);

    if (questions.length > MAX_QUESTIONS) {
      questions = questions.slice(0, MAX_QUESTIONS);
    }

    // 解答
    const aRows = await fetchSheetWithValidation(
      SHEET_NAMES.ANSWERS, 'A1:C', HEADERS.ANSWERS,
      { valueRenderOption: 'UNFORMATTED_VALUE' }
    );

    const answersByQ = new Map();
    for (const r of aRows.slice(1)) {
      const qid = String(r[1] ?? '');
      const txt = String(r[2] ?? '');
      if (!qid) continue;
      (answersByQ.get(qid) ?? answersByQ.set(qid, []).get(qid)).push(txt);
    }

    const withAns = questions.map(q => ({
      ...q,
      answers: answersByQ.get(q.question_id) || []
    }));

    const result = { ok: true, questions: withAns };
    await setCache(cacheKey, result, DEFAULT_TTL.SHEETS_DATA);
    res.json(result);
  } catch (e) {
    log.error(route, 'Error', { message: e.message });
    res.status(e.statusCode || 500).json({ ok: false, message: e.statusCode ? e.message : 'questions 取得に失敗' });
  }
});

/* =========================
   POST /game/score
   ========================= */
router.post('/score',
  authenticateToken,
  validateBody({
    userId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    part_id: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    scores: { type: 'number', required: true, min: 0, max: 1000 },
    clear: { type: 'boolean', required: false }
  }),
  async (req, res) => {
  const route = 'POST /score';
  try {
    ensureSheetId();
    const { userId, part_id, scores, clear } = req.body || {};

    if (req.user.userId !== userId) {
      return res.status(403).json({ ok: false, message: '権限がありません' });
    }

    const scoreValue = Number(scores);
    const clearValue = toBool(clear);

    const sRows = await fetchSheetWithValidation(
      SHEET_NAMES.SCORES, 'A1:F', HEADERS.SCORES
    );

    let nextId = 1;
    if (sRows.length >= 2) {
      const ids = sRows.slice(1).map(r => Number(r[0] || 0)).filter(n => Number.isFinite(n));
      if (ids.length) nextId = Math.max(...ids) + 1;
    }

    // valueInputOption は RAW を使う。USER_ENTERED だと "00007" のような
    // ゼロ埋め user_id が数値7に変換され、usersシートと突合できなくなる
    // (ランキングの表示名が番号になる不具合の原因)。
    // score_id / part_id は従来どおり数値セルになるよう数値型で渡す
    const partIdCell = /^\d+$/.test(String(part_id)) ? Number(part_id) : String(part_id);
    const row = [nextId, String(userId), partIdCell, scoreValue, clearValue, nowTimestamp()];

    const sheets = await getSheetsClient(false);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.SCORES}!A:F`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });

    res.json({
      ok: true,
      score_id: nextId,
      saved: { userId, part_id, scores: scoreValue, clear: clearValue, play_date: row[5] }
    });
  } catch (e) {
    log.error(route, 'Error', { message: e.message });
    res.status(e.statusCode || 500).json({ ok: false, message: e.statusCode ? e.message : 'score 追加に失敗' });
  }
});

/* =========================
   POST /game/advance
   ========================= */
router.post('/advance',
  authenticateToken,
  validateBody({
    userId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    current: { type: 'object', required: true },
    part_id: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    clear: { type: 'boolean', required: false }
  }),
  async (req, res) => {
  const route = 'POST /advance';
  try {
    ensureSheetId();
    const { userId, current, part_id, clear } = req.body || {};

    if (req.user.userId !== userId) {
      return res.status(403).json({ ok: false, message: '権限がありません' });
    }

    if (!current.grade || !current.part || current.subpart === undefined) {
      return res.status(400).json({ ok: false, message: 'current に grade/part/subpart が必要です' });
    }

    // 1) attempts をカウント
    const sRows = await fetchSheet(SHEET_NAMES.SCORES, 'A1:F');
    const sHeader = (sRows[0] || []).map(v => String(v ?? '').trim().toLowerCase());
    const idxUser = sHeader.indexOf('user_id');
    const idxPart = sHeader.indexOf('part_id');
    if (idxUser < 0 || idxPart < 0) {
      return res.status(500).json({ ok: false, message: 'scores ヘッダ不一致' });
    }
    // user_id はゼロ埋めの有無が混在するため正規化して突合する
    // ("00007"のユーザーの挑戦回数が0のままになる不具合の対策)
    const attempts = sRows.slice(1).filter(r =>
      canonUserId(r[idxUser]) === canonUserId(userId) &&
      String(r[idxPart] || '') === String(part_id)
    ).length;

    const clearValue = toBool(clear);
    const canAdvance = clearValue || attempts >= REQUIRED_ATTEMPTS;

    if (!canAdvance) {
      return res.json({
        ok: true, advanced: false, reason: 'not enough attempts',
        attempts, required: REQUIRED_ATTEMPTS,
        remaining: Math.max(0, REQUIRED_ATTEMPTS - attempts),
      });
    }

    // 2) users 読み込み
    const uRows = await fetchSheetWithValidation(
      SHEET_NAMES.USERS, 'A1:K', HEADERS.USERS
    );

    const found = findUserRow(uRows.slice(1), userId);
    if (!found) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }
    const { row, absRow } = found;
    const cg = String(row[USER_COL.current_grade] ?? '');
    const cp = String(row[USER_COL.current_part] ?? '');
    const cs = String(row[USER_COL.current_subpart] ?? '');

    // 現在位置一致確認
    if (cg !== String(current.grade) || cp !== String(current.part) || cs !== String(current.subpart)) {
      return res.json({
        ok: true, advanced: false, reason: 'progress mismatch',
        attempts, required: REQUIRED_ATTEMPTS,
        remaining: Math.max(0, REQUIRED_ATTEMPTS - attempts),
        current_in_db: { grade: cg, part: cp, subpart: cs },
        current_sent: current
      });
    }

    // 3) parts から次を決定
    const pRows = await fetchSheetWithValidation(
      SHEET_NAMES.PARTS, 'A1:E', HEADERS.PARTS,
      { valueRenderOption: 'UNFORMATTED_VALUE' }
    );

    const parts = pRows.slice(1).map(r => ({
      part_id: String(r[0]),
      grade_id: Number(r[1] || 0),
      part_no: Number(r[2] || 0),
      subpart_no: Number(r[3] || 0),
    })).sort((a, b) =>
      (a.grade_id - b.grade_id) || (a.part_no - b.part_no) || (a.subpart_no - b.subpart_no)
    );

    const curIdx = parts.findIndex(p => p.part_id === String(part_id));
    if (curIdx < 0) {
      return res.status(404).json({ ok: false, message: '現在のpartが見つかりません' });
    }

    if (curIdx === parts.length - 1) {
      return res.json({
        ok: true, advanced: false, reason: 'last part reached',
        attempts, required: REQUIRED_ATTEMPTS, remaining: 0,
        message: '最終ステージをクリアしました！'
      });
    }

    const next = parts[curIdx + 1];

    // 4) users を更新
    const sheetsWrite = await getSheetsClient(false);
    await sheetsWrite.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.USERS}!F${absRow}:H${absRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[next.grade_id, next.part_no, next.subpart_no]] },
    });
    await sheetsWrite.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.USERS}!K${absRow}:K${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[nowTimestamp()]] },
    });

    res.json({
      ok: true, advanced: true,
      reason: clearValue ? 'cleared' : 'attempts',
      attempts, required: REQUIRED_ATTEMPTS,
      remaining: Math.max(0, REQUIRED_ATTEMPTS - attempts),
      previous: { grade: cg, part: cp, subpart: cs },
      next: { grade_id: next.grade_id, part_no: next.part_no, subpart_no: next.subpart_no }
    });
  } catch (e) {
    log.error(route, 'Error', { message: e.message });
    res.status(e.statusCode || 500).json({ ok: false, message: e.statusCode ? e.message : '進捗更新に失敗' });
  }
});

module.exports = router;
