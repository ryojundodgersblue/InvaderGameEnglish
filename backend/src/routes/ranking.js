// backend/src/routes/ranking.js
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { getCache, setCache, getRankingKey, getSheetsKey, DEFAULT_TTL } = require('../services/redis');
const {
  SHEET_NAMES, RANKING_TOP_N,
  ensureSheetId, fetchSheet, canonUserId,
} = require('../utils/sheets');

const nowMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const toMonthKey = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const parts = s.split(/[\/\-\.]/);
  if (parts.length >= 2) {
    return `${parts[0]}/${String(parts[1]).padStart(2, '0')}`;
  }
  return '';
};

function idxOf(header, name) {
  const target = String(name).trim().toLowerCase();
  return header.findIndex(h => String(h ?? '').trim().toLowerCase() === target);
}

router.get('/', optionalAuth, async (_req, res) => {
  try {
    ensureSheetId();
    const mk = nowMonthKey();

    // Redisキャッシュ
    const rankingCacheKey = getRankingKey(mk);
    const cachedRanking = await getCache(rankingCacheKey);
    if (cachedRanking) return res.json(cachedRanking);

    // ===== users =====
    // キーは canonUserId で正規化して保持する。scoresシートには
    // ゼロ埋めが落ちた user_id (例: "00007"→7) が混在するため (キー名はv2で更新)
    const usersCacheKey = getSheetsKey(SHEET_NAMES.USERS, 'all_v2');
    let usersMap = await getCache(usersCacheKey);

    if (!usersMap) {
      const uRows = await fetchSheet(SHEET_NAMES.USERS, 'A1:K');
      if (uRows.length < 2) {
        return res.json({ month: mk, items: { challenge: [], accuracy: [] } });
      }

      const uHeader = uRows[0].map(v => String(v ?? ''));
      const idxUserId = idxOf(uHeader, 'user_id');
      const idxNick = idxOf(uHeader, 'nickname');

      if (idxUserId < 0 || idxNick < 0) {
        return res.status(500).json({ ok: false, message: 'users ヘッダ不一致' });
      }

      usersMap = new Map();
      for (const r of uRows.slice(1)) {
        const userId = String(r[idxUserId] ?? '').trim();
        const nick = String(r[idxNick] ?? '').trim();
        if (userId) usersMap.set(canonUserId(userId), nick || userId);
      }

      await setCache(usersCacheKey, Object.fromEntries(usersMap), DEFAULT_TTL.SHEETS_DATA);
    } else {
      usersMap = new Map(Object.entries(usersMap));
    }

    // ===== scores =====
    const sRows = await fetchSheet(SHEET_NAMES.SCORES, 'A1:F');
    if (sRows.length < 2) {
      return res.json({ month: mk, items: { challenge: [], accuracy: [] } });
    }

    const sHeader = sRows[0].map(v => String(v ?? ''));
    const idxUser = idxOf(sHeader, 'user_id');
    const idxScore = idxOf(sHeader, 'scores');
    let idxDate = idxOf(sHeader, 'play_date');
    if (idxDate < 0) idxDate = idxOf(sHeader, 'play date');

    if (idxUser < 0 || idxScore < 0 || idxDate < 0) {
      return res.status(500).json({ ok: false, message: 'scores ヘッダ不一致' });
    }

    const monthRows = sRows.slice(1).filter(r => toMonthKey(r[idxDate]) === mk);

    // ① 挑戦回数
    // 集計キーも正規化する: 同一ユーザーの記録が "00007" と 7 の両形式で
    // 混在していても1人分として合算されるようにする
    const countByUser = new Map();
    for (const r of monthRows) {
      const uid = canonUserId(r[idxUser]);
      if (!uid) continue;
      countByUser.set(uid, (countByUser.get(uid) || 0) + 1);
    }
    const challenge = [...countByUser.entries()]
      .map(([uid, cnt]) => ({ userId: uid, name: usersMap.get(uid) || uid, _cnt: cnt }))
      .sort((a, b) => b._cnt - a._cnt || (a.name || '').localeCompare(b.name || ''))
      .slice(0, RANKING_TOP_N)
      .map(({ userId, name }) => ({ userId, name }));

    // ② 正答率
    const sum = new Map();
    const cnt = new Map();
    for (const r of monthRows) {
      const uid = canonUserId(r[idxUser]);
      if (!uid) continue;
      const val = Number(r[idxScore] ?? 0);
      sum.set(uid, (sum.get(uid) || 0) + (Number.isFinite(val) ? val : 0));
      cnt.set(uid, (cnt.get(uid) || 0) + 1);
    }
    const accuracy = [...sum.entries()]
      .map(([uid, total]) => {
        const plays = cnt.get(uid) || 1;
        return { userId: uid, name: usersMap.get(uid) || uid, _avg: total / plays, _plays: plays };
      })
      .sort((a, b) => b._avg - a._avg || b._plays - a._plays || (a.name || '').localeCompare(b.name || ''))
      .slice(0, RANKING_TOP_N)
      .map(({ userId, name }) => ({ userId, name }));

    const payload = { month: mk, items: { challenge, accuracy } };
    await setCache(rankingCacheKey, payload, DEFAULT_TTL.RANKING_DATA);
    res.json(payload);
  } catch (e) {
    console.error('[ranking] error:', e);
    res.status(e.statusCode || 500).json({ ok: false, message: 'ランキング取得でエラーが発生しました' });
  }
});

module.exports = router;
