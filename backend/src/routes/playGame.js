// backend/src/routes/game.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/sheets');

const PARTS_SHEET     = 'parts';        // part_id | grade_id | part_no | subpart_no | requirement
const QUESTIONS_SHEET = 'questions';    // question_id | part_id | display_order | is_demo | question_text | image_url
const ANSWERS_SHEET   = 'answer_patterns'; // id | question_id | expected_text
const SCORES_SHEET    = 'scores';       // score_id | user_id | part_id | scores | clear | play_date
const USERS_SHEET     = 'users';        // id | user_id | password | nickname | real_name | current_grade | current_part | current_subpart | is_admin | created_at | updated_at

const PARTS_HEADER     = ['part_id','grade_id','part_no','subpart_no','requirement'];
const QUESTIONS_HEADER = ['question_id','part_id','display_order','is_demo','question_text','image_url'];
const ANSWERS_HEADER   = ['id','question_id','expected_text'];
const USERS_HEADER     = ['id','user_id','password','nickname','real_name','current_grade','current_part','current_subpart','is_admin','created_at','updated_at'];

// デバッグ用のログヘルパー
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

// GET /game/part?grade=1&part=2&subpart=1
router.get('/part', async (req, res) => {
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
    res.json({ ok:true, part:{ part_id, requirement } });
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    res.status(500).json({ ok:false, message:'part 取得に失敗' });
  }
});

// GET /game/questions?part_id=xxx
router.get('/questions', async (req, res) => {
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

    const sheets = await getSheetsClient(true);

    // 問題を取得
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

    log.info(routeName, 'Questions filtered and sorted', { 
      part_id, 
      foundQuestions: questions.length,
      demoQuestions: questions.filter(q => q.is_demo).length 
    });

    // 16問を超える場合は切り詰め、足りない場合は警告
    if (questions.length > 16) {
      log.warn(routeName, 'Too many questions, trimming to 16', { original: questions.length });
      questions = questions.slice(0, 16);
    } else if (questions.length < 16) {
      log.warn(routeName, 'Less than 16 questions found', { actual: questions.length });
    }

    // 答えを取得
    const a = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ANSWERS_SHEET}!A1:C`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const aRows = a.data.values || [];
    log.info(routeName, 'Answers data fetched', { totalRows: aRows.length });
    
    const aHeader = (aRows[0]||[]).map(v=>String(v??'').trim());
    const aOk = aHeader.length===ANSWERS_HEADER.length && ANSWERS_HEADER.every((h,i)=>h===aHeader[i]);
    if (!aOk) {
      log.error(routeName, 'Answers header mismatch', { expected: ANSWERS_HEADER, actual: aHeader });
      return res.status(500).json({ ok:false, message:'answer_patterns ヘッダ不一致' });
    }

    // 答えを問題IDごとにグループ化
    const answersByQ = new Map();
    for (const r of aRows.slice(1)) {
      const qid = String(r[1] ?? '');
      const txt = String(r[2] ?? '');
      if (!qid) continue;
      (answersByQ.get(qid) ?? answersByQ.set(qid, []).get(qid)).push(txt);
    }

    // 問題に答えを紐付け
    const withAns = questions.map(q => ({ 
      ...q, 
      answers: answersByQ.get(q.question_id) || [] 
    }));

    // デバッグ情報を詳細に出力
    log.info(routeName, 'Questions prepared successfully', {
      totalQuestions: withAns.length,
      demoQuestions: withAns.filter(q => q.is_demo).map(q => ({
        id: q.question_id,
        order: q.display_order,
        text: q.question_text.substring(0, 30) + '...'
      })),
      regularQuestions: withAns.filter(q => !q.is_demo).length,
      questionsWithoutAnswers: withAns.filter(q => q.answers.length === 0).map(q => q.question_id)
    });

    res.json({ ok:true, questions: withAns });
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    res.status(500).json({ ok:false, message:'questions 取得に失敗' });
  }
});

// POST /game/score { userId, part_id, scores, clear }
router.post('/score', async (req, res) => {
  const routeName = 'POST /game/score';
  try {
    const { userId, part_id, scores, clear } = req.body || {};
    log.info(routeName, 'Request received', { userId, part_id, scores, clear });
    
    if (!SPREADSHEET_ID) {
      log.error(routeName, 'SHEET_ID not configured');
      return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    }
    if (!userId || !part_id) {
      log.warn(routeName, 'Missing required parameters', { userId, part_id });
      return res.status(400).json({ ok:false, message:'userId/part_id は必須' });
    }

    const sheets = await getSheetsClient(false);
    
    // 既存のスコアを読み込んで次のIDを決定
    const s = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A1:F`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const sRows = s.data.values || [];
    let nextId = 1;
    if (sRows.length >= 2) {
      const ids = sRows.slice(1).map(r => Number(r[0]||0)).filter(n=>Number.isFinite(n));
      if (ids.length) nextId = Math.max(...ids)+1;
    }
    
    log.info(routeName, 'Next score ID determined', { nextId });
    
    // 新しいスコアを追加
    const row = [ String(nextId), String(userId), String(part_id), Number(scores||0), String(!!clear), nowTS() ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A:F`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
    
    log.info(routeName, 'Score saved successfully', { 
      score_id: nextId, 
      userId, 
      part_id, 
      scores, 
      clear: !!clear 
    });
    
    res.json({ ok:true, score_id: nextId });
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    res.status(500).json({ ok:false, message:'score 追加に失敗' });
  }
});

// POST /game/advance { userId, current:{grade,part,subpart}, part_id, clear }
router.post('/advance', async (req, res) => {
  const routeName = 'POST /game/advance';
  try {
    const { userId, current, part_id, clear } = req.body || {};
    log.info(routeName, 'Request received', { userId, current, part_id, clear });
    
    if (!clear) {
      log.info(routeName, 'Not cleared, skipping advance');
      return res.json({ ok:true, skipped:true });
    }
    if (!SPREADSHEET_ID) {
      log.error(routeName, 'SHEET_ID not configured');
      return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    }
    if (!userId || !current || !part_id) {
      log.warn(routeName, 'Missing required parameters', { userId, current, part_id });
      return res.status(400).json({ ok:false, message:'必要情報不足' });
    }

    const sheets = await getSheetsClient(false);

    // users 読み込み
    const u = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A1:K`,
      valueRenderOption: 'UNFORMATTED_VALUE',
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
    
    log.info(routeName, 'Current user progress', { 
      userId,
      currentInDB: { grade: cg, part: cp, subpart: cs },
      requestedCurrent: current 
    });
    
    // 現在の進捗が一致しているか確認
    if (!(cg===String(current.grade) && cp===String(current.part) && cs===String(current.subpart))) {
      log.warn(routeName, 'Progress mismatch', {
        expected: current,
        actual: { grade: cg, part: cp, subpart: cs }
      });
      return res.json({ ok:true, advanced:false, reason:'progress mismatch' });
    }

    // parts 全件を取得して次のパートを見つける
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
    }))
    .sort((a,b)=> (a.grade_id-b.grade_id) || (a.part_no-b.part_no) || (a.subpart_no-b.subpart_no));

    const idx = parts.findIndex(p => p.part_id === String(part_id));
    if (idx < 0 || idx === parts.length-1) {
      log.warn(routeName, 'No next part available', { part_id, currentIndex: idx, totalParts: parts.length });
      return res.json({ ok:true, advanced:false, reason:'no next part' });
    }
    
    const next = parts[idx+1];
    log.info(routeName, 'Next part determined', { currentPart: parts[idx], nextPart: next });

    // ユーザーの進捗を更新
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!F${absRow}:H${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[ String(next.grade_id), String(next.part_no), String(next.subpart_no) ]] },
    });
    
    // 更新日時を記録
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!K${absRow}:K${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[ nowTS() ]] },
    });

    log.info(routeName, 'User progress updated successfully', { 
      userId, 
      previousPart: { grade: cg, part: cp, subpart: cs },
      newPart: next 
    });
    
    res.json({ ok:true, advanced:true, next });
  } catch (e) {
    log.error(routeName, 'Unexpected error', e);
    res.status(500).json({ ok:false, message:'進捗更新に失敗' });
  }
});

module.exports = router;