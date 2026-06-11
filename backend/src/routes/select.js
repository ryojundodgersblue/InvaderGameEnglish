// backend/src/routes/select.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');
const { createLogger } = require('../utils/logger');
const {
  SHEET_NAMES, HEADERS, USER_COL, SHEET_RANGES,
} = require('../utils/sheets');
const ds = require('../dataSources');

const log = createLogger('select');

// GET /select/options?user_id=xxx
router.get('/options',
  authenticateToken,
  validateQuery({
    user_id: { type: 'string', required: true, minLength: 1, maxLength: 100 }
  }),
  async (req, res) => {
  const route = 'GET /options';
  try {
    ds.ensureReady();
    const { user_id } = req.query;

    if (req.user.userId !== user_id) {
      return res.status(403).json({ ok: false, message: '権限がありません' });
    }

    // 1. usersシートからユーザーの進捗を取得
    const userRows = await ds.fetchSheet(SHEET_NAMES.USERS, SHEET_RANGES.USERS);
    const userData = userRows.slice(1).find(row => String(row[USER_COL.user_id]) === String(user_id));

    if (!userData) {
      return res.status(404).json({ ok: false, message: 'ユーザーが見つかりません' });
    }

    const currentGrade = Number(userData[USER_COL.current_grade] ?? 0);
    const currentPart = Number(userData[USER_COL.current_part] ?? 0);
    const currentSubpart = Number(userData[USER_COL.current_subpart] ?? 0);

    // 2. partsシートからデータを取得
    const rows = await ds.fetchSheetWithValidation(
      SHEET_NAMES.PARTS, SHEET_RANGES.PARTS, HEADERS.PARTS,
      { valueRenderOption: 'UNFORMATTED_VALUE' }
    );

    const parts = rows.slice(1).map(row => ({
      part_id: String(row[0] ?? ''),
      grade_id: Number(row[1] ?? 0),
      part_no: Number(row[2] ?? 0),
      subpart_no: Number(row[3] ?? 0),
      requirement: String(row[4] ?? '')
    }));

    // 3. 進捗以下のもののみフィルタ
    const validParts = parts.filter(p => {
      if (!p.part_id || p.grade_id <= 0 || p.part_no <= 0 || p.subpart_no <= 0) return false;

      if (p.grade_id < currentGrade) return true;
      if (p.grade_id === currentGrade) {
        if (p.part_no < currentPart) return true;
        if (p.part_no === currentPart) return p.subpart_no <= currentSubpart;
        return false;
      }
      return false;
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

    res.json({
      ok: true,
      options: structure,
      currentProgress: { grade: currentGrade, part: currentPart, subpart: currentSubpart }
    });

  } catch (error) {
    log.error(route, 'Error', { message: error.message });
    res.status(error.statusCode || 500).json({ ok: false, message: error.statusCode ? error.message : 'オプション取得中にエラーが発生しました' });
  }
});

// GET /select/validate
router.get('/validate',
  authenticateToken,
  validateQuery({
    grade: { type: 'number', required: true, min: 1, max: 100 },
    part: { type: 'number', required: true, min: 1, max: 100 },
    subpart: { type: 'number', required: true, min: 1, max: 100 }
  }),
  async (req, res) => {
  const route = 'GET /validate';
  try {
    ds.ensureReady();
    const { grade, part, subpart } = req.query;

    const rows = await ds.fetchSheet(SHEET_NAMES.PARTS, SHEET_RANGES.PARTS, { valueRenderOption: 'UNFORMATTED_VALUE' });

    const exists = rows.slice(1).some(row =>
      String(row[1]) === String(grade) &&
      String(row[2]) === String(part) &&
      String(row[3]) === String(subpart)
    );

    res.json({
      ok: true,
      valid: exists,
      message: exists ? '有効な組み合わせです' : '無効な組み合わせです'
    });
  } catch (error) {
    log.error(route, 'Error', { message: error.message });
    res.status(error.statusCode || 500).json({ ok: false, message: error.statusCode ? error.message : '検証中にエラーが発生しました' });
  }
});

module.exports = router;
