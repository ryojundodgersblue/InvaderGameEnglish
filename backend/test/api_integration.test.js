// ローカルデータモードでAPIを実際に起動し、仕様どおりの振る舞いをHTTPレベルで検証する。
// 対象仕様:
//  - ログイン(Function List I4改訂: トークン7日) / 401(C19)
//  - スコア保存でuser_idのゼロ埋めが保持される(8-24反映の回帰)
//  - 3回挑戦で次ステージ解放(D15)・新旧user_id形式の混在を合算して数える
//  - ランキングの表示名がニックネームになる(混在データでも合算・8-24反映の回帰)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// ===== フィクスチャ(最小データ)を一時ディレクトリに用意 =====
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'invader-test-'));
const write = (name, data) => fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2));

write('users', [
  { id: 1, user_id: '10001', password: 'adminpw1', nickname: 'マリナーズ', real_name: '管理 太郎',
    current_grade: 1, current_part: 1, current_subpart: 1, is_admin: true,
    created_at: '2026/01/01 00:00:00', updated_at: '2026/01/01 00:00:00' },
  { id: 42, user_id: '00042', password: 'test1234', nickname: 'テストゼロ42', real_name: '零埋 太郎',
    current_grade: 1, current_part: 1, current_subpart: 1, is_admin: false,
    created_at: '2026/01/01 00:00:00', updated_at: '2026/01/01 00:00:00' },
]);
write('parts', [
  { part_id: 1011, grade_id: 1, part_no: 1, subpart_no: 1, requirement: 'テスト用' },
  { part_id: 1012, grade_id: 1, part_no: 1, subpart_no: 2, requirement: 'テスト用2' },
]);
write('questions', [
  { question_id: 10111, part_id: 1011, display_order: 1, is_demo: true, question_text: 'Demo.', image_url: '' },
  { question_id: 10112, part_id: 1011, display_order: 2, is_demo: false, question_text: 'Hello.', image_url: '' },
]);
write('answer_patterns', [
  { id: 1, question_id: 10111, expected_text: 'Demo answer.' },
  { id: 2, question_id: 10112, expected_text: 'Hello answer.' },
]);
// 過去に数値化されて保存された挑戦2回分(壊れた既存データの再現)+今月のランキング用
write('scores', [
  { score_id: 1, user_id: 42, part_id: 1011, scores: 2, clear: false, play_date: '2026/08/20 10:00:00' },
  { score_id: 2, user_id: 42, part_id: 1011, scores: 3, clear: false, play_date: '2026/08/21 10:00:00' },
]);

process.env.DATA_SOURCE = 'local';
process.env.LOCAL_DATA_DIR = dir;
process.env.JWT_SECRET = 'test-secret';
delete process.env.REDIS_HOST;

const app = require('../src/app');

let server;
let base;
let cookie;

test.before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise(resolve => server.close(resolve)));

const post = (p, body, extra = {}) => fetch(base + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
  body: JSON.stringify(body),
});
const get = (p, withCookie = true) => fetch(base + p, {
  headers: withCookie && cookie ? { Cookie: cookie } : {},
});

test('未認証のゲームAPIは401(C19: 再ログイン誘導の前提)', async () => {
  const res = await get('/game/questions?part_id=1011', false);
  assert.equal(res.status, 401);
});

test('ログイン成功でauthTokenが7日のCookieで発行される(No.169)', async () => {
  const res = await post('/auth/login', { userId: '00042', password: 'test1234' });
  assert.equal(res.status, 200);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie && setCookie.includes('authToken='), 'authToken cookieがない');
  assert.match(setCookie, /Max-Age=604800/, `7日(604800秒)になっていない: ${setCookie}`);
  assert.match(setCookie, /HttpOnly/i);
  cookie = setCookie.split(';')[0];
  const body = await res.json();
  assert.equal(body.user.name, 'テストゼロ42');
});

test('スコア保存でゼロ埋めuser_idが保持される(ランキング表示名バグの再発防止)', async () => {
  const res = await post('/game/score', { userId: '00042', part_id: '1011', scores: 3, clear: false });
  assert.equal(res.status, 200);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'scores.json'), 'utf8'));
  const last = saved[saved.length - 1];
  assert.equal(last.user_id, '00042'); // 文字列のまま・先頭ゼロ保持
  assert.equal(typeof last.part_id, 'number'); // 既存セル型に合わせ数値のまま
});

test('3回目の挑戦で未クリアでも解放される(D15: 10回→3回)・新旧形式を合算', async () => {
  // 既存の数値42×2回 + いまの"00042"×1回 = 3回
  const res = await post('/game/advance', {
    userId: '00042',
    current: { grade: 1, part: 1, subpart: 1 },
    part_id: '1011',
    clear: false,
  });
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.attempts, 3, '数値42と"00042"が合算されていない');
  assert.equal(body.required, 3);
  assert.equal(body.advanced, true);
  assert.deepEqual(body.next, { grade_id: 1, part_no: 1, subpart_no: 2 });
});

test('ランキングは数値user_idの行でもニックネーム表示・1人に合算(8-24反映の回帰)', async () => {
  const res = await get('/ranking');
  const body = await res.json();
  const names = body.items.challenge.map(x => x.name);
  assert.ok(names.includes('テストゼロ42'), `ニックネームが出ていない: ${JSON.stringify(names)}`);
  // 42(数値)と"00042"(文字列)が別人として2行にならない
  const zeroEntries = body.items.challenge.filter(x => x.name === 'テストゼロ42');
  assert.equal(zeroEntries.length, 1);
});

test('advance応答のrequiredは結果画面の文言の情報源(定数の二重管理なし)', async () => {
  // 進捗が1-1-2に進んだ状態で、進捗不一致応答にもrequiredが含まれる
  const res = await post('/game/advance', {
    userId: '00042',
    current: { grade: 1, part: 1, subpart: 1 }, // 既に1-1-2なので不一致
    part_id: '1011',
    clear: true,
  });
  const body = await res.json();
  assert.equal(body.required, 3);
});
