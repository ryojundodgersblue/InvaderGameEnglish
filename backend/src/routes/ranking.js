// backend/src/routes/ranking.js
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { getCache, setCache, getRankingKey, getSheetsKey, DEFAULT_TTL } = require('../services/redis');
const { sendError } = require('../utils/errors');
const {
  SHEET_NAMES, RANKING_TOP_N, SHEET_RANGES,
} = require('../utils/sheets');
const ds = require('../dataSources');

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
    ds.ensureReady();
    const mk = nowMonthKey();

    // Redisキャッシュ
    const rankingCacheKey = getRankingKey(mk);
    const cachedRanking = await getCache(rankingCacheKey);
    if (cachedRanking) return res.json(cachedRanking);

    // ===== users =====
    const usersCacheKey = getSheetsKey(SHEET_NAMES.USERS, 'all');
    let usersMap = await getCache(usersCacheKey);

    if (!usersMap) {
      const uRows = await ds.fetchSheet(SHEET_NAMES.USERS, SHEET_RANGES.USERS);
      if (uRows.length < 2) {
        return res.json({ month: mk, items: { challenge: [], accuracy: [], speed: [] } });
      }

      const uHeader = uRows[0].map(v => String(v ?? ''));
      const idxUserId = idxOf(uHeader, 'user_id');
      const idxNick = idxOf(uHeader, 'nickname');

      if (idxUserId < 0 || idxNick < 0) {
        return res.status(500).json({ ok: false, code: 'DATA-002', message: 'users ヘッダ不一致' });
      }

      usersMap = new Map();
      for (const r of uRows.slice(1)) {
        const userId = String(r[idxUserId] ?? '').trim();
        const nick = String(r[idxNick] ?? '').trim();
        if (userId) usersMap.set(userId, nick || userId);
      }

      await setCache(usersCacheKey, Object.fromEntries(usersMap), DEFAULT_TTL.SHEETS_DATA);
    } else {
      usersMap = new Map(Object.entries(usersMap));
    }

    // ===== scores =====
    const sRows = await ds.fetchSheet(SHEET_NAMES.SCORES, SHEET_RANGES.SCORES);
    if (sRows.length < 2) {
      return res.json({ month: mk, items: { challenge: [], accuracy: [], speed: [] } });
    }

    const sHeader = sRows[0].map(v => String(v ?? ''));
    const idxUser = idxOf(sHeader, 'user_id');
    const idxScore = idxOf(sHeader, 'scores');
    let idxDate = idxOf(sHeader, 'play_date');
    if (idxDate < 0) idxDate = idxOf(sHeader, 'play date');
    const idxAvgTime = idxOf(sHeader, 'avg_answer_time'); // 列未追加のシートでは -1

    if (idxUser < 0 || idxScore < 0 || idxDate < 0) {
      return res.status(500).json({ ok: false, code: 'DATA-002', message: 'scores ヘッダ不一致' });
    }

    const monthRows = sRows.slice(1).filter(r => toMonthKey(r[idxDate]) === mk);

    // ① 挑戦回数
    const countByUser = new Map();
    for (const r of monthRows) {
      const uid = String(r[idxUser] ?? '').trim();
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
      const uid = String(r[idxUser] ?? '').trim();
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

    // ③ 回答の速さ（avg_answer_timeが記録されたプレイの平均秒。短いほど上位）
    const timeSum = new Map();
    const timeCnt = new Map();
    for (const r of monthRows) {
      if (idxAvgTime < 0) break;
      const uid = String(r[idxUser] ?? '').trim();
      if (!uid) continue;
      const t = Number(r[idxAvgTime]);
      if (!Number.isFinite(t) || t <= 0) continue;
      timeSum.set(uid, (timeSum.get(uid) || 0) + t);
      timeCnt.set(uid, (timeCnt.get(uid) || 0) + 1);
    }
    const speed = [...timeSum.entries()]
      .map(([uid, total]) => {
        const plays = timeCnt.get(uid) || 1;
        return {
          userId: uid,
          name: usersMap.get(uid) || uid,
          avgSeconds: Math.round((total / plays) * 10) / 10,
          _plays: plays,
        };
      })
      .sort((a, b) => a.avgSeconds - b.avgSeconds || b._plays - a._plays || (a.name || '').localeCompare(b.name || ''))
      .slice(0, RANKING_TOP_N)
      .map(({ userId, name, avgSeconds }) => ({ userId, name, avgSeconds }));

    const payload = { month: mk, items: { challenge, accuracy, speed } };
    await setCache(rankingCacheKey, payload, DEFAULT_TTL.RANKING_DATA);
    res.json(payload);
  } catch (e) {
    sendError(res, null, 'GET /ranking', e, 'DATA-001');
  }
});

module.exports = router;
