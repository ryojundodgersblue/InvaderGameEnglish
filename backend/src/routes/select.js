// backend/src/routes/select.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/google');
const { authenticateToken } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');

const PARTS_SHEET = 'parts';
const PARTS_HEADER = ['part_id', 'grade_id', 'part_no', 'subpart_no', 'requirement'];

// デバッグ用のログヘルパー
const log = {
  info: (message, data = {}) => {
    console.log(`[${new Date().toISOString()}] [INFO] [/select] ${message}`, data);
  },
  error: (message, error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] [/select] ${message}`, error?.message || error);
  },
  warn: (message, data = {}) => {
    console.warn(`[${new Date().toISOString()}] [WARN] [/select] ${message}`, data);
  }
};

// GET /select/options?user_id=xxx
// 学年・パート・サブパートの選択可能なオプションを階層構造で返す
// ユーザーの現在の進捗以下のみを返す
router.get('/options',
  authenticateToken,
  validateQuery({
    user_id: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  try {
    const { user_id } = req.query;

    // 認証されたユーザーと要求されたuser_idが一致するか確認
    if (req.user.userId !== user_id) {
      log.warn('User ID mismatch', {
        authenticated: req.user.userId,
        requested: user_id
      });
      return res.status(403).json({
        ok: false,
        message: '権限がありません'
      });
    }

    log.info('Options request received', { user_id });
    
    if (!SPREADSHEET_ID) {
      log.error('SHEET_ID not configured');
      return res.status(500).json({ 
        ok: false, 
        message: 'SHEET_ID が未設定です' 
      });
    }

    const sheets = await getSheetsClient(true);
    
    // 1. usersシートからユーザーの現在の進捗を取得
    // ★ FORMATTED_VALUE を使用して user_id の先頭ゼロを保持（例: 00002）
    const userResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A:K',
      valueRenderOption: 'FORMATTED_VALUE',
    });
    
    const userRows = userResponse.data.values || [];
    const userHeader = userRows[0] || [];
    const userData = userRows.slice(1).find(row => String(row[1]) === String(user_id));
    
    if (!userData) {
      log.warn('User not found', { user_id });
      return res.status(404).json({ 
        ok: false, 
        message: 'ユーザーが見つかりません' 
      });
    }
    
    // 列インデックスは logInPage.js の COL 定義に基づく
    // COL.current_grade: 5, COL.current_part: 6, COL.current_subpart: 7
    const currentGrade = Number(userData[5] ?? 0);
    const currentPart = Number(userData[6] ?? 0);
    const currentSubpart = Number(userData[7] ?? 0);
    
    log.info('User progress fetched', { 
      user_id, 
      currentGrade, 
      currentPart, 
      currentSubpart 
    });
    
    // 2. partsシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PARTS_SHEET}!A1:E`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    
    const rows = response.data.values || [];
    log.info('Parts data fetched', { totalRows: rows.length });
    
    // ヘッダーチェック
    const header = (rows[0] || []).map(v => String(v ?? '').trim());
    const headerValid = header.length === PARTS_HEADER.length && 
                       PARTS_HEADER.every((h, i) => h === header[i]);
    
    if (!headerValid) {
      log.error('Header mismatch', { 
        expected: PARTS_HEADER, 
        actual: header 
      });
      return res.status(500).json({ 
        ok: false, 
        message: 'parts ヘッダが想定と異なります' 
      });
    }

    // データ行を構造化
    const parts = rows.slice(1).map(row => ({
      part_id: String(row[0] ?? ''),
      grade_id: Number(row[1] ?? 0),
      part_no: Number(row[2] ?? 0),
      subpart_no: Number(row[3] ?? 0),
      requirement: String(row[4] ?? '')
    }));

    // 3. 有効なデータで、かつ現在の進捗以下のもののみフィルタ
    const validParts = parts.filter(p => {
      if (!p.part_id || p.grade_id <= 0 || p.part_no <= 0 || p.subpart_no <= 0) {
        return false;
      }
      
      // 進捗制限のロジック
      if (p.grade_id < currentGrade) {
        // 過去の学年は全て選択可能
        return true;
      } else if (p.grade_id === currentGrade) {
        // 現在の学年の場合
        if (p.part_no < currentPart) {
          // 過去のパートは全て選択可能
          return true;
        } else if (p.part_no === currentPart) {
          // 現在のパートの場合、現在のサブパート以下のみ選択可能
          return p.subpart_no <= currentSubpart;
        } else {
          // 未来のパートは選択不可
          return false;
        }
      } else {
        // 未来の学年は選択不可
        return false;
      }
    });

    log.info('Valid parts filtered with progress limit', { 
      total: parts.length, 
      valid: validParts.length,
      currentProgress: { currentGrade, currentPart, currentSubpart }
    });

    // 4. 階層構造を構築
    const structure = {};
    
    const grades = [...new Set(validParts.map(p => p.grade_id))].sort((a, b) => a - b);
    
    for (const gradeId of grades) {
      const gradeParts = validParts.filter(p => p.grade_id === gradeId);
      const partStructure = {};
      
      const partNos = [...new Set(gradeParts.map(p => p.part_no))].sort((a, b) => a - b);
      
      for (const partNo of partNos) {
        const subpartNos = gradeParts
          .filter(p => p.part_no === partNo)
          .map(p => p.subpart_no)
          .sort((a, b) => a - b);
        
        partStructure[partNo] = [...new Set(subpartNos)];
      }
      
      structure[gradeId] = partStructure;
    }
    
    log.info('Options structure created successfully', {
      grades: grades.length,
      totalCombinations: validParts.length,
      structure: JSON.stringify(structure)
    });
    
    res.json({
      ok: true,
      options: structure,
      currentProgress: {
        grade: currentGrade,
        part: currentPart,
        subpart: currentSubpart
      }
    });
    
  } catch (error) {
    log.error('Unexpected error in /options', error);
    res.status(500).json({ 
      ok: false, 
      message: 'オプション取得中にエラーが発生しました' 
    });
  }
});

// GET /select/validate
// 選択された組み合わせが有効かチェック（オプション）
router.get('/validate',
  authenticateToken,
  validateQuery({
    grade: { type: 'number', required: true, min: 1, max: 100 },
    part: { type: 'number', required: true, min: 1, max: 100 },
    subpart: { type: 'number', required: true, min: 1, max: 100 }
  }),
  async (req, res) => {
  try {
    const { grade, part, subpart } = req.query;
    log.info('Validation request', { grade, part, subpart });
    
    if (!grade || !part || !subpart) {
      return res.json({ 
        ok: true, 
        valid: false, 
        message: '必須パラメータが不足しています' 
      });
    }
    
    if (!SPREADSHEET_ID) {
      log.error('SHEET_ID not configured');
      return res.status(500).json({ 
        ok: false, 
        message: 'SHEET_ID が未設定です' 
      });
    }

    const sheets = await getSheetsClient(true);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PARTS_SHEET}!A1:E`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    
    const rows = response.data.values || [];
    
    // 指定された組み合わせが存在するかチェック
    const exists = rows.slice(1).some(row => 
      String(row[1]) === String(grade) &&
      String(row[2]) === String(part) &&
      String(row[3]) === String(subpart)
    );
    
    log.info('Validation result', { 
      grade, part, subpart, 
      valid: exists 
    });
    
    res.json({
      ok: true,
      valid: exists,
      message: exists ? '有効な組み合わせです' : '無効な組み合わせです'
    });
    
  } catch (error) {
    log.error('Unexpected error in /validate', error);
    res.status(500).json({ 
      ok: false, 
      message: '検証中にエラーが発生しました' 
    });
  }
});

module.exports = router;