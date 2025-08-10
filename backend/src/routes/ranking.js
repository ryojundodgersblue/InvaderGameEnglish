// backend/src/routes/ranking.js
const express = require('express');
const router = express.Router();
const { getSheets } = require('../lib/sheets');

const SHEET_ID = process.env.SHEET_ID;
const USERS_SHEET = 'users';
const SCORES_SHEET = 'scores';

// ---- 超シンプルキャッシュ ----
let usersCache = { data: null, fetchedAt: 0 };          // 10分TTL
let rankingCache = { monthKey: '', data: null, at: 0 }; // 60秒TTL

function monthKeyOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}/${m}`; // 例: "2025/08"
}
function isUsersCacheFresh() {
  return Date.now() - usersCache.fetchedAt < 10 * 60 * 1000;
}
function isRankingCacheFresh(mk) {
  return rankingCache.monthKey === mk && (Date.now() - rankingCache.at < 60 * 1000);
}
const toMonthKey = (v) => {
  const s = String(v || '').trim();
  const parts = s.split(/[\/\-\.]/);
  if (parts.length >= 2) {
    const y = parts[0];
    const m = String(parts[1]).padStart(2, '0');
    return `${y}/${m}`;
  }
  return '';
};

router.get('/', async (req, res) => {
  try {
    if (!SHEET_ID) return res.status(500).json({ ok: false, message: 'SHEET_ID が未設定です' });

    const now = new Date();
    const mk  = monthKeyOf(now);

    // キャッシュがあれば即返す
    if (isRankingCacheFresh(mk) && rankingCache.data) {
      return res.json(rankingCache.data);
    }

    const sheets = await getSheets();

    // ----- users（10分キャッシュ）-----
    let users = usersCache.data;
    if (!isUsersCacheFresh() || !users) {
      const uResp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${USERS_SHEET}!A:E`,
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });
      const uRows   = uResp.data.values || [];
      const uHeader = (uRows[0] || []).map(h => String(h).trim().toLowerCase());
      const uData   = uRows.slice(1);

      const idxUid  = uHeader.indexOf('user_id');
      const idxName = uHeader.indexOf('name');
      if (idxUid < 0 || idxName < 0) {
        return res.status(500).json({ ok: false, message: 'users シートのヘッダが想定と異なります' });
      }

      const map = new Map();
      for (const r of uData) {
        const uid = r[idxUid];
        const nm  = r[idxName];
        if (uid) map.set(String(uid), String(nm || ''));
      }
      users = map;
      usersCache = { data: users, fetchedAt: Date.now() };
    }

    // ----- scores（今月抽出）-----
    const sResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SCORES_SHEET}!A:E`,
      valueRenderOption: 'FORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const sRows   = sResp.data.values || [];
    const sHeader = (sRows[0] || []).map(h => String(h).trim().toLowerCase());
    const sData   = sRows.slice(1);

    const idxUserId = sHeader.indexOf('user_id');
    const idxScore  = sHeader.indexOf('score');
    let idxDate     = sHeader.indexOf('play_date');
    if (idxDate < 0) idxDate = sHeader.indexOf('play date');

    if (idxUserId < 0 || idxScore < 0 || idxDate < 0) {
      return res.status(500).json({ ok: false, message: 'scores シートのヘッダが想定と異なります' });
    }

    const monthRows = sData.filter(r => toMonthKey(r[idxDate]) === mk);

    // ① Fastest Players（挑戦数：件数多い順）
    const countByUser = new Map();
    for (const r of monthRows) {
      const uid = String(r[idxUserId] || '');
      if (!uid) continue;
      countByUser.set(uid, (countByUser.get(uid) || 0) + 1);
    }
    const challenge = [...countByUser.entries()]
      .map(([uid, attempts]) => ({ userId: uid, name: users.get(uid) || uid, attempts }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 3);

    // ② Best Scores（平均スコア：合計/件数 の大きい順）
    const sum = new Map();
    const cnt = new Map();
    for (const r of monthRows) {
      const uid = String(r[idxUserId] || '');
      const sc  = Number(r[idxScore] || 0);
      if (!uid) continue;
      sum.set(uid, (sum.get(uid) || 0) + sc);
      cnt.set(uid, (cnt.get(uid) || 0) + 1);
    }
    const accuracy = [...sum.entries()]
      .map(([uid, totalScore]) => {
        const plays    = cnt.get(uid) || 1;
        const avgScore = totalScore / plays;
        return { userId: uid, name: users.get(uid) || uid, avgScore, plays, totalScore };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    const payload = { ok: true, month: mk, items: { challenge, accuracy } };
    rankingCache = { monthKey: mk, data: payload, at: Date.now() }; // 60秒キャッシュ
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'ランキング取得でエラーが発生しました' });
  }
});

module.exports = router;
