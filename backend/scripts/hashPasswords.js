// backend/scripts/hashPasswords.js
// このスクリプトは、Google Sheetsに保存されている平文パスワードをbcryptハッシュに変換します
// 使用方法: node backend/scripts/hashPasswords.js

const bcrypt = require('bcrypt');
const { getSheetsClient, SPREADSHEET_ID } = require('../src/services/google');

const USER_SHEET_NAME = 'users';
const SALT_ROUNDS = 10; // bcryptのソルトラウンド数

// 列インデックス
const COL = {
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

async function hashPasswords() {
  console.log('[hashPasswords] 開始...');

  if (!SPREADSHEET_ID) {
    console.error('[hashPasswords] SPREADSHEET_ID が未設定です');
    process.exit(1);
  }

  try {
    const sheets = await getSheetsClient(true);
    console.log('[hashPasswords] Google Sheets クライアント取得完了');

    // A〜K列まで取得
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A1:K`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = resp.data.values || [];
    console.log(`[hashPasswords] 取得行数: ${rows.length}`);

    if (rows.length < 2) {
      console.log('[hashPasswords] ユーザーデータが存在しません');
      return;
    }

    const header = rows[0];
    const dataRows = rows.slice(1);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const userId = String(row[COL.user_id] || '');
      const password = String(row[COL.password] || '');

      if (!password) {
        console.log(`[hashPasswords] スキップ (パスワード空): ${userId}`);
        skippedCount++;
        continue;
      }

      // すでにハッシュ化されているかチェック
      if (password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$')) {
        console.log(`[hashPasswords] スキップ (すでにハッシュ化済み): ${userId}`);
        skippedCount++;
        continue;
      }

      // パスワードをハッシュ化
      console.log(`[hashPasswords] ハッシュ化中: ${userId}`);
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // 更新データを準備（シート行番号は i+2: ヘッダー行+0インデックス調整）
      const rowNumber = i + 2;
      updates.push({
        userId,
        rowNumber,
        hashedPassword,
      });

      updatedCount++;
    }

    if (updates.length === 0) {
      console.log('[hashPasswords] 更新対象のパスワードはありません');
      return;
    }

    // バッチ更新を実行
    console.log(`[hashPasswords] ${updates.length}件のパスワードを更新中...`);

    const batchUpdateData = updates.map(u => ({
      range: `${USER_SHEET_NAME}!C${u.rowNumber}`, // C列 = password列
      values: [[u.hashedPassword]],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: batchUpdateData,
      },
    });

    console.log(`[hashPasswords] 完了: ${updatedCount}件更新, ${skippedCount}件スキップ`);
    console.log('[hashPasswords] ユーザーIDリスト:', updates.map(u => u.userId).join(', '));

  } catch (err) {
    console.error('[hashPasswords] エラー:', err?.message);
    console.error(err?.stack);
    process.exit(1);
  }
}

// スクリプト実行
hashPasswords()
  .then(() => {
    console.log('[hashPasswords] 正常終了');
    process.exit(0);
  })
  .catch(err => {
    console.error('[hashPasswords] 異常終了:', err?.message);
    process.exit(1);
  });
