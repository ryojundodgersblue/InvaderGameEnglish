#!/usr/bin/env node
// backend/data/*.json を Google Sheets へ反映するスクリプト。
//
// ⚠️ 既定では「静的データ」(parts / questions / answer_patterns)のみを同期する。
//    users / scores は本番で増え続ける運用データのため、既定では触らない
//    (スナップショット由来のJSONで上書きすると、その後に増えたユーザー・スコア・
//     パスワード変更が消えるため)。scoresはavg_answer_time列のヘッダーだけ追記する。
//
// 使い方:
//   cd backend
//   node scripts/sync_to_sheets.js                         # dry-run(差分サマリ表示のみ)
//   node scripts/sync_to_sheets.js --execute               # 静的データを実反映
//   node scripts/sync_to_sheets.js --execute --include-operational
//       # users/scoresも反映(初期構築時のみ。現在より行数が減る場合は--forceが必要)
//
// 前提:
//   - .env に SHEET_ID と Google認証情報(GOOGLE_KEYFILE or GOOGLE_CREDENTIALS_JSON)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const { getSheetsClient, SPREADSHEET_ID } = require('../src/services/google');
const { SHEET_NAMES, HEADERS } = require('../src/utils/sheets');

const DATA_DIR = path.join(__dirname, '..', 'data');

// 静的データ(問題・パート・解答): 全面置換してよい
const STATIC_TARGETS = [
  { sheet: SHEET_NAMES.PARTS, file: 'parts', header: HEADERS.PARTS },
  { sheet: SHEET_NAMES.QUESTIONS, file: 'questions', header: HEADERS.QUESTIONS },
  { sheet: SHEET_NAMES.ANSWERS, file: 'answer_patterns', header: HEADERS.ANSWERS },
];

// 運用データ(ユーザー・スコア): --include-operational 指定時のみ
const OPERATIONAL_TARGETS = [
  { sheet: SHEET_NAMES.USERS, file: 'users', header: HEADERS.USERS },
  { sheet: SHEET_NAMES.SCORES, file: 'scores', header: HEADERS.SCORES },
];

function loadRows(file, header) {
  const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${file}.json`), 'utf8'));
  const rows = json.map(obj => header.map(col => {
    const v = obj[col];
    if (v === null || v === undefined) return '';
    return v;
  }));
  return [header, ...rows];
}

async function getCurrent(sheets, sheetName) {
  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z`,
    });
    const values = resp.data.values || [];
    return { rows: Math.max(0, values.length - 1), header: values[0] || [] };
  } catch (e) {
    return { rows: null, header: [], error: e.message };
  }
}

async function replaceSheet(sheetName, matrix) {
  const writer = await getSheetsClient(false);
  await writer.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  await writer.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: matrix },
  });
}

async function main() {
  const execute = process.argv.includes('--execute');
  const includeOperational = process.argv.includes('--include-operational');
  const force = process.argv.includes('--force');

  if (!SPREADSHEET_ID) {
    console.error('ERROR: SHEET_ID が設定されていません(.envを確認)');
    process.exit(1);
  }

  console.log(`モード: ${execute ? '★ 実書き込み (--execute)' : 'dry-run(書き込みなし)'}`);
  console.log(`対象: 静的データ(parts/questions/answer_patterns)${includeOperational ? ' + 運用データ(users/scores)' : ''}`);
  console.log(`対象スプレッドシート: ${SPREADSHEET_ID}`);
  console.log('');

  const sheets = await getSheetsClient(true);
  const targets = [...STATIC_TARGETS, ...(includeOperational ? OPERATIONAL_TARGETS : [])];

  for (const t of targets) {
    const matrix = loadRows(t.file, t.header);
    const newRows = matrix.length - 1;
    const cur = await getCurrent(sheets, t.sheet);
    const isOperational = OPERATIONAL_TARGETS.some(o => o.sheet === t.sheet);

    console.log(`[${t.sheet}]`);
    console.log(`  現在: ${cur.rows ?? '取得失敗'}行 / 反映後: ${newRows}行 (${t.header.length}列)`);
    if (cur.error) console.log(`  注意: 現状取得エラー (${cur.error})`);
    const headerChanged = JSON.stringify(cur.header) !== JSON.stringify(t.header);
    if (headerChanged) {
      console.log(`  ヘッダー変更: ${JSON.stringify(cur.header)} → ${JSON.stringify(t.header)}`);
    }

    // 運用データの巻き戻りガード: 行数が減る場合は --force がない限り中断
    if (isOperational && cur.rows !== null && newRows < cur.rows && !force) {
      console.error(`  ❌ 中断: ${t.sheet} の行数が減ります(${cur.rows}→${newRows})。`);
      console.error('     スナップショット以降に追加されたデータが消える可能性があります。');
      console.error('     本当に上書きする場合は --force を付けてください。');
      process.exit(1);
    }

    if (execute) {
      await replaceSheet(t.sheet, matrix);
      console.log('  ✅ 書き込み完了');
    }
    console.log('');
  }

  // scores: 全面置換はしないが、avg_answer_time列のヘッダーだけは追記する
  // (バックエンドは列が無くても動くが、列があれば速さランキングの記録が保存される)
  if (!includeOperational) {
    const cur = await getCurrent(sheets, SHEET_NAMES.SCORES);
    const hasAvg = cur.header.map(h => String(h).trim()).includes('avg_answer_time');
    console.log(`[${SHEET_NAMES.SCORES}] (データは保持・ヘッダーのみ確認)`);
    if (hasAvg) {
      console.log('  avg_answer_time列: 追加済み');
    } else {
      console.log(`  avg_answer_time列: 未追加 → G1へ追記${execute ? 'します' : '(dry-run)'}`);
      if (execute) {
        const writer = await getSheetsClient(false);
        await writer.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAMES.SCORES}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [HEADERS.SCORES] },
        });
        console.log('  ✅ ヘッダー行を更新(データ行は無変更)');
      }
    }
    console.log('');
  }

  if (!execute) {
    console.log('dry-run完了。実際に反映する場合は --execute を付けて実行してください。');
    console.log('⚠️ 実行前にスプレッドシートのバックアップ(コピー作成)を推奨します。');
  } else {
    console.log('反映が完了しました。Redisキャッシュがある場合はTTL(最大10分)で自然更新されます。');
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
