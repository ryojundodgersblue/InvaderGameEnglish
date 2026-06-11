#!/usr/bin/env node
// ローカルモードAPIの一括検証スクリプト。
//
// 前提: DATA_SOURCE=local でAPIサーバーが起動していること
//   cd backend && npm run start:local
// 実行:
//   node scripts/verify_api.mjs --pass <ログインパスワード> [--base http://localhost:4000] [--user 10001]
//   (パスワードは VERIFY_PASS 環境変数でも指定可。コードには埋め込まない)
//
// 検証内容:
//   1. ログイン(Cookie認証)
//   2. 全partについて GET /game/part + /game/questions → 8問・問題文・解答の存在
//      (No148「No Data」再発チェック)
//   3. 画像URLの実ファイル存在(frontend/public/questions)
//   4. POST /game/score (avg_answer_time付き) → GET /ranking のspeed反映
//   5. /select/options の取得
// ※ 4で追加したスコアは終了時に backend/data/scores.json から取り除く
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const BASE = arg('base', 'http://localhost:4000');
const USER = arg('user', '10001');
const PASS = arg('pass', process.env.VERIFY_PASS || '');
if (!PASS) {
  console.error('ERROR: パスワードを --pass または VERIFY_PASS で指定してください(コードに埋め込まない)');
  process.exit(1);
}
const IMG_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'questions');
const SCORES_JSON = path.join(__dirname, '..', 'data', 'scores.json');

let cookie = '';
const errors = [];
const warnings = [];

async function api(method, p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

function fail(msg) { errors.push(msg); console.error('  ERROR:', msg); }
function warn(msg) { warnings.push(msg); console.warn('  WARN:', msg); }

// ---- 1. login ----
console.log(`[1] ログイン (${USER})`);
{
  const { status, data } = await api('POST', '/auth/login', { userId: USER, password: PASS });
  if (status !== 200 || !data?.ok) {
    console.error(`ログイン失敗 (HTTP ${status}): ${JSON.stringify(data)}`);
    process.exit(1);
  }
  console.log(`  OK (${data.user.name})`);
}

// ---- 2. all parts ----
console.log('[2] 全パートの問題取得チェック');
const parts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'parts.json'), 'utf8'));
console.log(`  対象: ${parts.length}パート`);
let checkedImages = 0;
const EMPTY_TEXT_OK_PARTS = new Set([1441]); // イラストのみ出題(要望No102で確認済み)

for (const p of parts) {
  const q1 = await api('GET', `/game/part?grade=${p.grade_id}&part=${p.part_no}&subpart=${p.subpart_no}`);
  if (q1.status !== 200 || !q1.data?.ok) {
    fail(`part ${p.part_id}: /game/part 失敗 (HTTP ${q1.status} ${q1.data?.code || ''})`);
    continue;
  }
  if (String(q1.data.part.part_id) !== String(p.part_id)) {
    fail(`part ${p.part_id}: part_id不一致 (${q1.data.part.part_id})`);
  }
  const q2 = await api('GET', `/game/questions?part_id=${p.part_id}`);
  if (q2.status !== 200 || !q2.data?.ok) {
    fail(`part ${p.part_id}: /game/questions 失敗 (HTTP ${q2.status} ${q2.data?.code || ''})`);
    continue;
  }
  const qs = q2.data.questions || [];
  if (qs.length !== 8) {
    fail(`part ${p.part_id}: 問題数 ${qs.length} (8問必要) ← No Data/欠落の可能性`);
    continue;
  }
  for (const q of qs) {
    if (!q.question_text && !EMPTY_TEXT_OK_PARTS.has(p.part_id)) {
      fail(`question ${q.question_id}: 問題文が空`);
    }
    if (!q.answers || q.answers.length === 0 || !q.answers[0]) {
      fail(`question ${q.question_id}: 解答なし`);
    }
    if (q.image_url) {
      checkedImages++;
      const file = q.image_url.split('/').pop();
      if (!fs.existsSync(path.join(IMG_DIR, file))) {
        fail(`question ${q.question_id}: 画像ファイル不存在 ${q.image_url}`);
      }
    }
  }
}
console.log(`  完了 (画像参照チェック: ${checkedImages}件)`);

// ---- 3. select/options ----
console.log('[3] /select/options');
{
  const { status, data } = await api('GET', `/select/options?user_id=${USER}`);
  if (status !== 200 || !data?.ok) fail(`/select/options 失敗 (HTTP ${status})`);
  else console.log(`  OK (進捗: ${JSON.stringify(data.currentProgress)})`);
}

// ---- 4. score + ranking ----
console.log('[4] スコア送信(avg_answer_time付き) → ランキングspeed反映');
let addedScoreId = null;
{
  const post = await api('POST', '/game/score', {
    userId: USER, part_id: '1011', scores: 6, clear: true, avg_answer_time: 3.5,
  });
  if (post.status !== 200 || !post.data?.ok) {
    fail(`/game/score 失敗 (HTTP ${post.status} ${post.data?.code || ''})`);
  } else {
    addedScoreId = post.data.score_id;
    if (post.data.saved.avg_answer_time !== 3.5) fail('avg_answer_timeが保存応答に含まれない');
    const rank = await api('GET', '/ranking');
    const speed = rank.data?.items?.speed || [];
    if (!speed.some(s => s.userId === USER)) {
      fail('ランキングspeedにテストユーザーが反映されていない');
    } else {
      console.log(`  OK (speed: ${JSON.stringify(speed)})`);
    }
  }
}

// ---- cleanup: テストスコアを除去 ----
if (addedScoreId !== null) {
  const scores = JSON.parse(fs.readFileSync(SCORES_JSON, 'utf8'));
  const filtered = scores.filter(s => s.score_id !== addedScoreId);
  if (filtered.length === scores.length) {
    warn(`テストスコア(score_id=${addedScoreId})がscores.jsonに見つからない`);
  } else {
    fs.writeFileSync(SCORES_JSON, JSON.stringify(filtered, null, 2) + '\n');
    console.log(`  テストスコア(score_id=${addedScoreId})を除去`);
  }
}

// ---- summary ----
console.log('');
console.log(`検証結果: エラー ${errors.length}件 / 警告 ${warnings.length}件`);
if (errors.length > 0) process.exit(1);
console.log('✅ 全チェック合格');
