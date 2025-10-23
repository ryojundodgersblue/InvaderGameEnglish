// backend/src/routes/ranking.js
const express = require('express');
const router = express.Router();
const { getSheetsClient, SPREADSHEET_ID } = require('../services/google');
const { optionalAuth } = require('../middleware/auth');

const USERS_SHEET  = 'users';
const SCORES_SHEET = 'scores';

// ---- 超シンプルキャッシュ ----
let usersCache   = { data: null, fetchedAt: 0 };         // 10分
let rankingCache = { monthKey: '', data: null, at: 0 };  // 60秒

const nowMonthKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}/${m}`; // 例 "2025/08"
};

const toMonthKey = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const parts = s.split(/[\/\-\.]/);
  if (parts.length >= 2) {
    const y = parts[0];
    const m = String(parts[1]).padStart(2, '0');
    return `${y}/${m}`;
  }
  return '';
};

const isUsersCacheFresh   = () => Date.now() - usersCache.fetchedAt < 10 * 60 * 1000;
const isRankingCacheFresh = (mk) => rankingCache.monthKey === mk && (Date.now() - rankingCache.at < 60 * 1000);

// ヘッダ配列から大小無視・前後空白無視で列位置を取る
function idxOf(header, name) {
  const target = String(name).trim().toLowerCase();
  return header.findIndex(h => String(h ?? '').trim().toLowerCase() === target);
}

router.get('/', optionalAuth, async (_req, res) => {
  try {
    if (!SPREADSHEET_ID) {
      return res.status(500).json({ ok: false, message: 'SHEET_ID が未設定です' });
    }

    const mk = nowMonthKey();

    // 直近60秒はキャッシュ
    if (isRankingCacheFresh(mk) && rankingCache.data) {
      return res.json(rankingCache.data);
    }

    const sheets = await getSheetsClient(true);

    // ===== users 読み込み（user_id と nickname だけ使う）=====
    let usersMap = usersCache.data; // user_id -> nickname
    if (!isUsersCacheFresh() || !usersMap) {
      const uResp = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${USERS_SHEET}!A1:K`, // 幅広く取得（id〜updated_at まで想定）
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });
      const uRows = uResp.data.values || [];
      if (uRows.length < 2) {
        console.error('[ranking] users: rows < 2');
        return res.json({ month: mk, items: { challenge: [], accuracy: [] } });
      }

      const uHeader = uRows[0].map(v => String(v ?? ''));
      const idxUid  = idxOf(uHeader, 'user_id');
      const idxNick = idxOf(uHeader, 'nickname');

      if (idxUid < 0 || idxNick < 0) {
        console.error('[ranking] users header not found', { uHeader });
        return res.json({ month: mk, items: { challenge: [], accuracy: [] } });
      }

      usersMap = new Map();
      for (const r of uRows.slice(1)) {
        const uid  = String(r[idxUid] ?? '').trim();
        const nick = String(r[idxNick] ?? '').trim();
        if (uid) usersMap.set(uid, nick);
      }
      usersCache = { data: usersMap, fetchedAt: Date.now() };
    }

    // ===== scores 読み込み（当月抽出）=====
    const sResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SCORES_SHEET}!A1:Z`, // 念のため広めに取得
      valueRenderOption: 'FORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    const sRows = sResp.data.values || [];
    if (sRows.length < 2) {
      return res.json({ month: mk, items: { challenge: [], accuracy: [] } });
    }

    const sHeader = sRows[0].map(v => String(v ?? ''));
    const idxUser = idxOf(sHeader, 'user_id');
    const idxScore = idxOf(sHeader, 'scores');
    let idxDate = idxOf(sHeader, 'play_date');
    if (idxDate < 0) idxDate = idxOf(sHeader, 'play date'); // 表記ゆれ吸収

    if (idxUser < 0 || idxScore < 0 || idxDate < 0) {
      console.error('[ranking] scores header not found', { sHeader });
      return res.json({ month: mk, items: { challenge: [], accuracy: [] } });
    }

    const monthRows = sRows.slice(1).filter(r => toMonthKey(r[idxDate]) === mk);

    // ① 挑戦回数（多い順）
    const countByUser = new Map();
    for (const r of monthRows) {
      const uid = String(r[idxUser] ?? '').trim();
      if (!uid) continue;
      countByUser.set(uid, (countByUser.get(uid) || 0) + 1);
    }
    const challenge = [...countByUser.entries()]
      .map(([uid, cnt]) => ({ userId: uid, name: usersMap.get(uid) || uid, _cnt: cnt }))
      .sort((a, b) =>
        b._cnt - a._cnt ||
        (a.name || '').localeCompare(b.name || '') ||
        a.userId.localeCompare(b.userId)
      )
      .slice(0, 3)
      .map(({ userId, name }) => ({ userId, name }));

    // ② 正答率（平均 scores の高い順）
    const sum = new Map();
    const cnt = new Map();
    for (const r of monthRows) {
      const uid = String(r[idxUser] ?? '').trim();
      if (!uid) continue;
      const val = Number(r[idxScore] ?? 0);
      sum.set(uid, (sum.get(uid) || 0) + (Number.isFinite(val) ? val : 0));
      cnt.set(uid, (cnt.get(uid) || 0) + 1);
    }
    const accuracy = [...sum.entries()]
      .map(([uid, total]) => {
        const plays = cnt.get(uid) || 1;
        const avg   = total / plays;
        return { userId: uid, name: usersMap.get(uid) || uid, _avg: avg, _plays: plays };
      })
      .sort((a, b) =>
        b._avg - a._avg ||
        b._plays - a._plays ||
        (a.name || '').localeCompare(b.name || '') ||
        a.userId.localeCompare(b.userId)
      )
      .slice(0, 3)
      .map(({ userId, name }) => ({ userId, name }));

    const payload = { month: mk, items: { challenge, accuracy } };
    rankingCache = { monthKey: mk, data: payload, at: Date.now() };
    res.json(payload);
  } catch (e) {
    console.error('[ranking] error:', e);
    res.status(500).json({ ok: false, message: 'ランキング取得でエラーが発生しました' });
  }
});

module.exports = router;
