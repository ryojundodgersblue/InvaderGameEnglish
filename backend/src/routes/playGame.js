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

function nowTS() {
  const d = new Date();
  const z = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}/${z(d.getMonth()+1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

// GET /game/part?grade=1&part=2&subpart=1
router.get('/part', async (req, res) => {
  try {
    const { grade, part, subpart } = req.query;
    if (!SPREADSHEET_ID) return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    if (!grade || !part || !subpart) return res.status(400).json({ ok:false, message:'grade/part/subpart は必須' });

    const sheets = await getSheetsClient(true);
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PARTS_SHEET}!A1:E`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const rows = resp.data.values || [];
    const header = (rows[0]||[]).map(v=>String(v??'').trim());
    const ok = header.length===PARTS_HEADER.length && PARTS_HEADER.every((h,i)=>h===header[i]);
    if (!ok) return res.status(500).json({ ok:false, message:'parts ヘッダ不一致' });

    const hit = rows.slice(1).find(r =>
      String(r[1])===String(grade) &&
      String(r[2])===String(part)  &&
      String(r[3])===String(subpart)
    );
    if (!hit) return res.status(404).json({ ok:false, message:'該当 part が見つかりません' });

    const part_id = String(hit[0]);
    const requirement = String(hit[4] ?? '');
    res.json({ ok:true, part:{ part_id, requirement } });
  } catch (e) {
    console.error('[game/part] error:', e);
    res.status(500).json({ ok:false, message:'part 取得に失敗' });
  }
});

// GET /game/questions?part_id=xxx
router.get('/questions', async (req, res) => {
  try {
    const { part_id } = req.query;
    if (!SPREADSHEET_ID) return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    if (!part_id) return res.status(400).json({ ok:false, message:'part_id は必須' });

    const sheets = await getSheetsClient(true);

    const q = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${QUESTIONS_SHEET}!A1:F`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const qRows = q.data.values || [];
    const qHeader = (qRows[0]||[]).map(v=>String(v??'').trim());
    const qOk = qHeader.length===QUESTIONS_HEADER.length && QUESTIONS_HEADER.every((h,i)=>h===qHeader[i]);
    if (!qOk) return res.status(500).json({ ok:false, message:'questions ヘッダ不一致' });

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

    // 回数は 16 問に丸める
    if (questions.length > 16) questions = questions.slice(0,16);

    const a = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ANSWERS_SHEET}!A1:C`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const aRows = a.data.values || [];
    const aHeader = (aRows[0]||[]).map(v=>String(v??'').trim());
    const aOk = aHeader.length===ANSWERS_HEADER.length && ANSWERS_HEADER.every((h,i)=>h===aHeader[i]);
    if (!aOk) return res.status(500).json({ ok:false, message:'answer_patterns ヘッダ不一致' });

    const answersByQ = new Map();
    for (const r of aRows.slice(1)) {
      const qid = String(r[1] ?? '');
      const txt = String(r[2] ?? '');
      if (!qid) continue;
      (answersByQ.get(qid) ?? answersByQ.set(qid, []).get(qid)).push(txt);
    }

    const withAns = questions.map(q => ({ ...q, answers: answersByQ.get(q.question_id) || [] }));
    res.json({ ok:true, questions: withAns });
  } catch (e) {
    console.error('[game/questions] error:', e);
    res.status(500).json({ ok:false, message:'questions 取得に失敗' });
  }
});

// POST /game/score { userId, part_id, scores, clear }
router.post('/score', async (req, res) => {
  try {
    const { userId, part_id, scores, clear } = req.body || {};
    if (!SPREADSHEET_ID) return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    if (!userId || !part_id) return res.status(400).json({ ok:false, message:'userId/part_id は必須' });

    const sheets = await getSheetsClient(false);
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
    const row = [ String(nextId), String(userId), String(part_id), Number(scores||0), String(!!clear), nowTS() ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A:F`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
    res.json({ ok:true, score_id: nextId });
  } catch (e) {
    console.error('[game/score] error:', e);
    res.status(500).json({ ok:false, message:'score 追加に失敗' });
  }
});

// POST /game/advance { userId, current:{grade,part,subpart}, part_id, clear }
router.post('/advance', async (req, res) => {
  try {
    const { userId, current, part_id, clear } = req.body || {};
    if (!clear) return res.json({ ok:true, skipped:true });
    if (!SPREADSHEET_ID) return res.status(500).json({ ok:false, message:'SHEET_ID 未設定' });
    if (!userId || !current || !part_id) return res.status(400).json({ ok:false, message:'必要情報不足' });

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
    if (!uOk) return res.status(500).json({ ok:false, message:'users ヘッダ不一致' });

    const rowIdx = uRows.slice(1).findIndex(r => String(r[1]) === String(userId));
    if (rowIdx < 0) return res.status(404).json({ ok:false, message:'ユーザーが見つかりません' });

    const absRow = rowIdx + 2;
    const row = uRows[rowIdx+1];
    const cg = String(row[5] ?? '');
    const cp = String(row[6] ?? '');
    const cs = String(row[7] ?? '');
    if (!(cg===String(current.grade) && cp===String(current.part) && cs===String(current.subpart))) {
      return res.json({ ok:true, advanced:false, reason:'progress mismatch' });
    }

    // parts 全件 → 現在 part_id の次へ
    const p = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PARTS_SHEET}!A1:E`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const pRows = p.data.values || [];
    const pHeader = (pRows[0]||[]).map(v=>String(v??'').trim());
    const pOk = pHeader.length===PARTS_HEADER.length && PARTS_HEADER.every((h,i)=>h===pHeader[i]);
    if (!pOk) return res.status(500).json({ ok:false, message:'parts ヘッダ不一致' });

    const parts = pRows.slice(1).map(r => ({
      part_id: String(r[0]),
      grade_id: Number(r[1]||0),
      part_no: Number(r[2]||0),
      subpart_no: Number(r[3]||0),
    }))
    .sort((a,b)=> (a.grade_id-b.grade_id) || (a.part_no-b.part_no) || (a.subpart_no-b.subpart_no));

    const idx = parts.findIndex(p => p.part_id === String(part_id));
    if (idx < 0 || idx === parts.length-1) return res.json({ ok:true, advanced:false, reason:'no next part' });
    const next = parts[idx+1];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!F${absRow}:H${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[ String(next.grade_id), String(next.part_no), String(next.subpart_no) ]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!K${absRow}:K${absRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[ nowTS() ]] },
    });

    res.json({ ok:true, advanced:true, next });
  } catch (e) {
    console.error('[game/advance] error:', e);
    res.status(500).json({ ok:false, message:'進捗更新に失敗' });
  }
});

module.exports = router;
