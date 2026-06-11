#!/usr/bin/env node
// backend/data/*.json を Google Sheets へ反映するスクリプト。
//
// ⚠️ 本番データを全面的に書き換えるため、デフォルトは dry-run。
//    実際に書き込むには --execute を明示すること。
//
// 使い方:
//   cd backend
//   node scripts/sync_to_sheets.js            # dry-run(差分サマリ表示のみ)
//   node scripts/sync_to_sheets.js --execute  # 実際にSheetsへ書き込み
//
// 前提:
//   - .env に SHEET_ID と Google認証情報(GOOGLE_KEYFILE or GOOGLE_CREDENTIALS_JSON)
//   - scoresシートに avg_answer_time 列(G列)が追加される(本スクリプトが書き込む)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const { getSheetsClient, SPREADSHEET_ID } = require('../src/services/google');
const { SHEET_NAMES, HEADERS } = require('../src/utils/sheets');

const DATA_DIR = path.join(__dirname, '..', 'data');

// シート名 → (JSONファイル, ヘッダー定義)
const TARGETS = [
  { sheet: SHEET_NAMES.USERS, file: 'users', header: HEADERS.USERS },
  { sheet: SHEET_NAMES.PARTS, file: 'parts', header: HEADERS.PARTS },
  { sheet: SHEET_NAMES.QUESTIONS, file: 'questions', header: HEADERS.QUESTIONS },
  { sheet: SHEET_NAMES.ANSWERS, file: 'answer_patterns', header: HEADERS.ANSWERS },
  { sheet: SHEET_NAMES.SCORES, file: 'scores', header: HEADERS.SCORES },
];

function loadRows(file, header) {
  const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${file}.json`), 'utf8'));
  const rows = json.map(obj => header.map(col => {
    const v = obj[col];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v;
    return v;
  }));
  return [header, ...rows];
}

async function main() {
  const execute = process.argv.includes('--execute');

  if (!SPREADSHEET_ID) {
    console.error('ERROR: SHEET_ID が設定されていません(.envを確認)');
    process.exit(1);
  }

  console.log(`モード: ${execute ? '★ 実書き込み (--execute)' : 'dry-run(書き込みなし)'}`);
  console.log(`対象スプレッドシート: ${SPREADSHEET_ID}`);
  console.log('');

  const sheets = await getSheetsClient(execute ? false : true);

  for (const t of TARGETS) {
    const matrix = loadRows(t.file, t.header);
    const newRows = matrix.length - 1;
    const newCols = t.header.length;

    // 現在のシート状態を取得して差分サマリを出す
    let curRows = '?';
    let curHeader = [];
    try {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${t.sheet}!A1:Z`,
      });
      const values = resp.data.values || [];
      curRows = Math.max(0, values.length - 1);
      curHeader = values[0] || [];
    } catch (e) {
      console.warn(`  ${t.sheet}: 現状取得に失敗 (${e.message})`);
    }

    const headerChanged = JSON.stringify(curHeader) !== JSON.stringify(t.header);
    console.log(`[${t.sheet}]`);
    console.log(`  現在: ${curRows}行 / 反映後: ${newRows}行 (${newCols}列)`);
    if (headerChanged) {
      console.log(`  ヘッダー変更: ${JSON.stringify(curHeader)} → ${JSON.stringify(t.header)}`);
    }

    if (execute) {
      const writer = await getSheetsClient(false);
      await writer.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${t.sheet}!A:Z`,
      });
      await writer.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${t.sheet}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: matrix },
      });
      console.log('  ✅ 書き込み完了');
    }
    console.log('');
  }

  if (!execute) {
    console.log('dry-run完了。実際に反映する場合は --execute を付けて実行してください。');
    console.log('⚠️ 実行前にスプレッドシートのバックアップ(コピー作成)を推奨します。');
  } else {
    console.log('全シートの反映が完了しました。Redisキャッシュがある場合はTTL(最大10分)で自然更新されます。');
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
