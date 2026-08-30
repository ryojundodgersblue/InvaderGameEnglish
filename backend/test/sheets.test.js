// 仕様: ステージ解放は「クリア or 3回挑戦」(2026-08-11 Mukaさん依頼で10回→3回)。
// user_id はゼロ埋め("00007")と数値(7)が混在するため正規化して突合する(8-24反映の回帰)。
const test = require('node:test');
const assert = require('node:assert/strict');
const { canonUserId, REQUIRED_ATTEMPTS, RANKING_TOP_N, MAX_QUESTIONS } = require('../src/utils/sheets');

test('REQUIRED_ATTEMPTS は3回(仕様書 Function List D15/I15)', () => {
  assert.equal(REQUIRED_ATTEMPTS, 3);
});

test('ゲーム定数のデグレ検知: 8問/上位3名', () => {
  assert.equal(MAX_QUESTIONS, 8);
  assert.equal(RANKING_TOP_N, 3);
});

test('canonUserId: ゼロ埋めと数値を同一視する', () => {
  assert.equal(canonUserId('00007'), '7');
  assert.equal(canonUserId(7), '7');
  assert.equal(canonUserId('10005'), '10005');
  assert.equal(canonUserId(' 00042 '), '42');
  assert.equal(canonUserId('0'), '0');
  assert.equal(canonUserId('abc'), 'abc'); // 数字以外はそのまま
  assert.equal(canonUserId(null), '');
});
