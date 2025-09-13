// backend/src/routes/select.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/sheets');

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

// GET /select/options
// 学年・パート・サブパートの選択可能なオプションを階層構造で返す
router.get('/options', async (req, res) => {
  try {
    log.info('Options request received');
    
    if (!SPREADSHEET_ID) {
      log.error('SHEET_ID not configured');
      return res.status(500).json({ 
        ok: false, 
        message: 'SHEET_ID が未設定です' 
      });
    }

    const sheets = await getSheetsClient(true);
    
    // partsシートからデータを取得
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

    // 有効なデータのみフィルタ
    const validParts = parts.filter(p => 
      p.part_id && p.grade_id > 0 && p.part_no > 0 && p.subpart_no > 0
    );

    log.info('Valid parts filtered', { 
      total: parts.length, 
      valid: validParts.length 
    });

    // 階層構造を構築
    const structure = {};
    
    // まず利用可能な学年を収集
    const grades = [...new Set(validParts.map(p => p.grade_id))].sort((a, b) => a - b);
    
    for (const gradeId of grades) {
      const gradeParts = validParts.filter(p => p.grade_id === gradeId);
      const partStructure = {};
      
      // この学年のパート番号を収集
      const partNos = [...new Set(gradeParts.map(p => p.part_no))].sort((a, b) => a - b);
      
      for (const partNo of partNos) {
        // このパートのサブパート番号を収集
        const subpartNos = gradeParts
          .filter(p => p.part_no === partNo)
          .map(p => p.subpart_no)
          .sort((a, b) => a - b);
        
        // 重複を除去
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
      options: structure
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
router.get('/validate', async (req, res) => {
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