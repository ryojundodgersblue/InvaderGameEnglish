// backend/src/routes/playGame.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/google');
const { authenticateToken } = require('../middleware/auth');
const { validateQuery, validateBody } = require('../middleware/validation');
const { getCache, setCache, getSheetsKey, DEFAULT_TTL } = require('../services/redis');

const PARTS_SHEET     = 'parts';           // part_id | grade_id | part_no | subpart_no | requirement
const QUESTIONS_SHEET = 'questions';       // question_id | part_id | display_order | is_demo | question_text | image_url
const ANSWERS_SHEET   = 'answer_patterns'; // id | question_id | expected_text
const SCORES_SHEET    = 'scores';          // score_id | user_id | part_id | scores | clear | play_date
const USERS_SHEET     = 'users';           // id | user_id | password | nickname | real_name | current_grade | current_part | current_subpart | is_admin | created_at | updated_at

const PARTS_HEADER     = ['part_id','grade_id','part_no','subpart_no','requirement'];
const QUESTIONS_HEADER = ['question_id','part_id','display_order','is_demo','question_text','image_url'];
const ANSWERS_HEADER   = ['id','question_id','expected_text'];
const SCORES_HEADER    = ['score_id','user_id','part_id','scores','clear','play_date'];
const USERS_HEADER     = ['id','user_id','password','nickname','real_name','current_grade','current_part','current_subpart','is_admin','created_at','updated_at'];

// ★ 10回挑戦で解放
const REQUIRED_ATTEMPTS = 10;

// ログヘルパー
const log = {
  info: (route, message, data = {}) => {
    console.log(`[${new Date().toISOString()}] [INFO] [${route}] ${message}`, data);
  },
  error: (route, message, error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] [${route}] ${message}`, error?.message || error);
  },
  warn: (route, message, data = {}) => {
    console.warn(`[${new Date().toISOString()}] [WARN] [${route}] ${message}`, data);
  }
};

function nowTS() {
  const d = new Date();
  const z = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}/${z(d.getMonth()+1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

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
  const routeName = 'GET /game/part';
  try {
    const { grade, part, subpart } = req.query;
    log.info(routeName, 'Request received', { grade, part, subpart });

    if (!SPREADSHEET_ID) {
      log.error(routeName, 'SHEET_ID not configured');
      return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    }
    if (!grade || !part || !subpart) {
      log.warn(routeName, 'Missing required parameters', { grade, part, subpart });
      return res.status(400).json({ ok:false, message:'grade/part/subpart は必須' });
    }

    // Redisキャッシュをチェック
    const cacheKey = getSheetsKey(PARTS_SHEET, `${grade}-${part}-${subpart}`);
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      log.info(routeName, 'Returning cached data', { grade, part, subpart });
      return res.json(cachedData);
    }

    const sheets = await getSheetsClient(true);
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PARTS_SHEET}!A1:E`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const rows = resp.data.values || [];
    log.info(routeName, 'Parts data fetched', { totalRows: rows.length });

    const header = (rows[0]||[]).map(v=>String(v??'').trim());
    const ok = header.length===PARTS_HEADER.length && PARTS_HEADER.every((h,i)=>h===header[i]);
    if (!ok) {
      log.error(routeName, 'Header mismatch', { expected: PARTS_HEADER, actual: header });
      return res.status(500).json({ ok:false, message:'parts ヘッダ不一致' });
    }

    const hit = rows.slice(1).find(r =>
      String(r[1])===String(grade) &&
      String(r[2])===String(part)  &&
      String(r[3])===String(subpart)
    );
    if (!hit) {
      log.warn(routeName, 'Part not found', { grade, part, subpart });
      return res.status(404).json({ ok:false, message:'該当 part が見つかりません' });
    }

    const part_id = String(hit[0]);
    const requirement = String(hit[4] ?? '');

    log.info(routeName, 'Part found successfully', { part_id, requirement });

    // Redisキャッシュに保存
    const result = { ok:true, part:{ part_id, requirement } };
    await setCache(cacheKey, result, DEFAULT_TTL.SHEETS_DATA);

    res.json(result);
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    const message = process.env.NODE_ENV === 'production'
      ? 'part 取得に失敗'
      : 'part 取得に失敗';
    res.status(500).json({ ok:false, message });
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
  const routeName = 'GET /game/questions';
  try {
    const { part_id } = req.query;
    log.info(routeName, 'Request received', { part_id });

    if (!SPREADSHEET_ID) {
      log.error(routeName, 'SHEET_ID not configured');
      return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    }
    if (!part_id) {
      log.warn(routeName, 'Missing part_id');
      return res.status(400).json({ ok:false, message:'part_id は必須' });
    }

    // Redisキャッシュをチェック
    const cacheKey = getSheetsKey(QUESTIONS_SHEET, part_id);
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      log.info(routeName, 'Returning cached questions', { part_id });
      return res.json(cachedData);
    }

    const sheets = await getSheetsClient(true);

    // 問題
    const q = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${QUESTIONS_SHEET}!A1:F`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const qRows = q.data.values || [];
    log.info(routeName, 'Questions data fetched', { totalRows: qRows.length });

    const qHeader = (qRows[0]||[]).map(v=>String(v??'').trim());
    const qOk = qHeader.length===QUESTIONS_HEADER.length && QUESTIONS_HEADER.every((h,i)=>h===qHeader[i]);
    if (!qOk) {
      log.error(routeName, 'Questions header mismatch', { expected: QUESTIONS_HEADER, actual: qHeader });
      return res.status(500).json({ ok:false, message:'questions ヘッダ不一致' });
    }

    let questions = qRows.slice(1)
      .filter(r => String(r[1])===String(part_id))
      .map(r => ({
        question_id: String(r[0]),
        part_id: String(r[1]),
        display_order: Number(r[2] ?? 0),
        is_demo: String(r[3] ?? '').toLowerCase()==='true',
        question_text: String(r[4] ?? ''),
        image_url: String(r[5] ?? ''),
      }))
      .sort((a,b)=>a.display_order-b.display_order);

    // 8問に調整
    if (questions.length > 8) {
      log.warn(routeName, 'Too many questions, trimming to 8', { original: questions.length });
      questions = questions.slice(0, 8);
    } else if (questions.length < 8) {
      log.warn(routeName, 'Less than 8 questions found', { actual: questions.length });
    }

    // 解答
    const a = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ANSWERS_SHEET}!A1:C`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const aRows = a.data.values || [];
    const aHeader = (aRows[0]||[]).map(v=>String(v??'').trim());
    const aOk = aHeader.length===ANSWERS_HEADER.length && ANSWERS_HEADER.every((h,i)=>h===aHeader[i]);
    if (!aOk) {
      log.error(routeName, 'Answers header mismatch', { expected: ANSWERS_HEADER, actual: aHeader });
      return res.status(500).json({ ok:false, message:'answer_patterns ヘッダ不一致' });
    }

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

    log.info(routeName, 'Questions prepared successfully', {
      totalQuestions: withAns.length,
      demoQuestions: withAns.filter(q => q.is_demo).length,
    });

    // Redisキャッシュに保存
    const result = { ok:true, questions: withAns };
    await setCache(cacheKey, result, DEFAULT_TTL.SHEETS_DATA);

    res.json(result);
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    const message = process.env.NODE_ENV === 'production'
      ? 'questions 取得に失敗'
      : 'questions 取得に失敗';
    res.status(500).json({ ok:false, message });
  }
});

/* =========================
   POST /game/score  { userId, part_id, scores, clear }
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
  const routeName = 'POST /game/score';
  try {
    const { userId, part_id, scores, clear } = req.body || {};

    // 認証されたユーザーと送信されたuserIdが一致するか確認
    if (req.user.userId !== userId) {
      log.warn(routeName, 'User ID mismatch', {
        authenticated: req.user.userId,
        requested: userId
      });
      return res.status(403).json({ ok:false, message:'権限がありません' });
    }

    log.info(routeName, 'Request received', { userId, part_id, scores, clear });

    if (!SPREADSHEET_ID) {
      log.error(routeName, 'SHEET_ID not configured');
      return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    }

    const scoreValue = Number(scores);

    const sheets = await getSheetsClient(false);

    // 次の score_id
    // ★ FORMATTED_VALUE を使用して user_id の先頭ゼロを保持（例: 00002）
    const s = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A1:F`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const sRows = s.data.values || [];
    
    // ★ ヘッダーチェックを追加
    if (sRows.length > 0) {
      const sHeader = (sRows[0]||[]).map(v=>String(v??'').trim());
      const sOk = sHeader.length===SCORES_HEADER.length && SCORES_HEADER.every((h,i)=>h===sHeader[i]);
      if (!sOk) {
        log.error(routeName, 'Scores header mismatch', { expected: SCORES_HEADER, actual: sHeader });
        return res.status(500).json({ ok:false, message:'scores ヘッダ不一致' });
      }
    }
    
    let nextId = 1;
    if (sRows.length >= 2) {
      const ids = sRows.slice(1).map(r => Number(r[0]||0)).filter(n=>Number.isFinite(n));
      if (ids.length) nextId = Math.max(...ids)+1;
    }

    // ★ clear を boolean として確実に処理
    const clearValue = clear === true || clear === 'true' || clear === 1 || clear === '1';
    const row = [ 
      String(nextId), 
      String(userId), 
      String(part_id), 
      scoreValue,  // ★ 数値として保存
      clearValue,  // ★ boolean として保存
      nowTS() 
    ];
    
    log.info(routeName, 'Appending score row', { row });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A:F`,
      valueInputOption: 'USER_ENTERED',  // ★ RAW から USER_ENTERED に変更（数値・booleanを適切に解釈）
      requestBody: { values: [row] },
    });

    log.info(routeName, 'Score saved successfully', { 
      score_id: nextId, 
      userId, 
      part_id, 
      scores: scoreValue, 
      clear: clearValue 
    });
    
    res.json({ 
      ok:true, 
      score_id: nextId,
      saved: {
        userId,
        part_id,
        scores: scoreValue,
        clear: clearValue,
        play_date: row[5]
      }
    });
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    const message = process.env.NODE_ENV === 'production'
      ? 'score 追加に失敗'
      : 'score 追加に失敗';
    res.status(500).json({ ok:false, message });
  }
});

/* =========================
   POST /game/advance
   body: { userId, current:{grade,part,subpart}, part_id, clear }
   クリア済み or 同partの attempts>=10 で進捗更新
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
  const routeName = 'POST /game/advance';
  try {
    const { userId, current, part_id, clear } = req.body || {};

    // 認証されたユーザーと送信されたuserIdが一致するか確認
    if (req.user.userId !== userId) {
      log.warn(routeName, 'User ID mismatch', {
        authenticated: req.user.userId,
        requested: userId
      });
      return res.status(403).json({ ok:false, message:'権限がありません' });
    }

    log.info(routeName, 'Request received', { userId, current, part_id, clear });

    if (!SPREADSHEET_ID) {
      log.error(routeName, 'SHEET_ID not configured');
      return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    }

    // current オブジェクトの検証
    if (!current.grade || !current.part || current.subpart === undefined) {
      log.warn(routeName, 'Invalid current object', { current });
      return res.status(400).json({ ok:false, message:'current に grade/part/subpart が必要です' });
    }

    const sheets = await getSheetsClient(true);

    // 1) attempts をカウント
    // ★ FORMATTED_VALUE を使用して user_id の先頭ゼロを保持（例: 00002）
    const sResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A1:F`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const sRows = sResp.data.values || [];
    const sHeader = (sRows[0]||[]).map(v=>String(v??'').trim().toLowerCase());
    const idxUser = sHeader.indexOf('user_id');
    const idxPart = sHeader.indexOf('part_id');
    if (idxUser < 0 || idxPart < 0) {
      log.error(routeName, 'scores header mismatch', { header: sHeader });
      return res.status(500).json({ ok:false, message:'scores ヘッダ不一致' });
    }
    const attempts = sRows.slice(1).filter(r =>
      String(r[idxUser]||'') === String(userId) &&
      String(r[idxPart]||'') === String(part_id)
    ).length;

    const clearValue = clear === true || clear === 'true' || clear === 1 || clear === '1';
    const canAdvanceByAttempts = attempts >= REQUIRED_ATTEMPTS;
    const canAdvance = clearValue || canAdvanceByAttempts;

    log.info(routeName, 'Advance decision', { 
      clear: clearValue, 
      attempts, 
      canAdvanceByAttempts, 
      canAdvance 
    });

    if (!canAdvance) {
      return res.json({
        ok:true,
        advanced:false,
        reason:'not enough attempts',
        attempts,
        required: REQUIRED_ATTEMPTS,
        remaining: Math.max(0, REQUIRED_ATTEMPTS - attempts),
      });
    }

    // 2) users 読み込み
    // ★ FORMATTED_VALUE を使用して user_id の先頭ゼロを保持（例: 00002）
    const u = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A1:K`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const uRows = u.data.values || [];
    const uHeader = (uRows[0]||[]).map(v=>String(v??'').trim());
    const uOk = uHeader.length===USERS_HEADER.length && USERS_HEADER.every((h,i)=>h===uHeader[i]);
    if (!uOk) {
      log.error(routeName, 'Users header mismatch', { expected: USERS_HEADER, actual: uHeader });
      return res.status(500).json({ ok:false, message:'users ヘッダ不一致' });
    }

    const rowIdx = uRows.slice(1).findIndex(r => String(r[1]) === String(userId));
    if (rowIdx < 0) {
      log.warn(routeName, 'User not found', { userId });
      return res.status(404).json({ ok:false, message:'ユーザーが見つかりません' });
    }

    const absRow = rowIdx + 2;
    const row = uRows[rowIdx+1];
    const cg = String(row[5] ?? '');
    const cp = String(row[6] ?? '');
    const cs = String(row[7] ?? '');

    // 現在位置一致確認（ズレている場合は更新しない）
    const isSameProgress =
      cg===String(current.grade) && cp===String(current.part) && cs===String(current.subpart);
    if (!isSameProgress) {
      log.warn(routeName, 'Progress mismatch', {
        expected: current, actual: { grade: cg, part: cp, subpart: cs }
      });
      return res.json({
        ok:true, advanced:false, reason:'progress mismatch',
        attempts, required: REQUIRED_ATTEMPTS,
        remaining: Math.max(0, REQUIRED_ATTEMPTS - attempts),
        current_in_db: { grade: cg, part: cp, subpart: cs },
        current_sent: current
      });
    }

    // 3) parts から次を決定
    const p = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PARTS_SHEET}!A1:E`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const pRows = p.data.values || [];
    const pHeader = (pRows[0]||[]).map(v=>String(v??'').trim());
    const pOk = pHeader.length===PARTS_HEADER.length && PARTS_HEADER.every((h,i)=>h===pHeader[i]);
    if (!pOk) {
      log.error(routeName, 'Parts header mismatch', { expected: PARTS_HEADER, actual: pHeader });
      return res.status(500).json({ ok:false, message:'parts ヘッダ不一致' });
    }

    const parts = pRows.slice(1).map(r => ({
      part_id: String(r[0]),
      grade_id: Number(r[1]||0),
      part_no: Number(r[2]||0),
      subpart_no: Number(r[3]||0),
    })).sort((a,b)=>
      (a.grade_id-b.grade_id) || (a.part_no-b.part_no) || (a.subpart_no-b.subpart_no)
    );

    const curIdx = parts.findIndex(p => p.part_id === String(part_id));
    if (curIdx < 0) {
      log.warn(routeName, 'Current part not found in parts list', { part_id });
      return res.status(404).json({ ok:false, message:'現在のpartが見つかりません' });
    }
    
    if (curIdx === parts.length-1) {
      log.info(routeName, 'Last part reached - no next part available', { part_id });
      return res.json({
        ok:true, advanced:false, reason:'last part reached',
        attempts, required: REQUIRED_ATTEMPTS, remaining: 0,
        message: '最終ステージをクリアしました！'
      });
    }

    const next = parts[curIdx+1];

    // 4) users を更新
    const sheetsWrite = await getSheetsClient(false);
    
    log.info(routeName, 'Updating user progress', {
      userId,
      absRow,
      previous: { grade: cg, part: cp, subpart: cs },
      next: { grade: next.grade_id, part: next.part_no, subpart: next.subpart_no }
    });
    
    await sheetsWrite.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!F${absRow}:H${absRow}`,
      valueInputOption: 'USER_ENTERED',  // ★ RAW から USER_ENTERED に変更
      requestBody: { values: [[ next.grade_id, next.part_no, next.subpart_no ]] },
    });
    await sheetsWrite.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!K${absRow}:K${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[ nowTS() ]] },
    });

    log.info(routeName, 'User progress updated successfully', {
      userId, 
      previous: { grade: cg, part: cp, subpart: cs }, 
      next: { grade: next.grade_id, part: next.part_no, subpart: next.subpart_no }, 
      reason: clearValue ? 'cleared' : 'attempts'
    });

    res.json({
      ok:true,
      advanced:true,
      reason: clearValue ? 'cleared' : 'attempts',
      attempts,
      required: REQUIRED_ATTEMPTS,
      remaining: Math.max(0, REQUIRED_ATTEMPTS - attempts),
      previous: { grade: cg, part: cp, subpart: cs },
      next: {
        grade_id: next.grade_id,
        part_no: next.part_no,
        subpart_no: next.subpart_no
      }
    });
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    const message = process.env.NODE_ENV === 'production'
      ? '進捗更新に失敗'
      : '進捗更新に失敗';
    res.status(500).json({ ok:false, message });
  }
});

module.exports = router;