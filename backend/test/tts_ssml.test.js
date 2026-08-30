// 仕様(Data Specs E24): 問題文は「読み上げ・表示」共通 — 表示は変えず、発音はSSML層で補正する。
// 要望No.155/182: readの過去形・過去分詞は /red/、現在形・原形は /riːd/(No.152)を「文単位」で両立させる。
// 要望No.156(Botchan)/No.181(does not)/No.183(drank)の発音補正。
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSsml, TTS_CACHE_VERSION } = require('../src/routes/tts');

test('キャッシュ版数が上がっている(旧音声を引き当てない)', () => {
  assert.equal(TTS_CACHE_VERSION, '3');
});

test('過去形の read は /red/ で読む (No.155対象文)', () => {
  const pastSentences = [
    'I read a book about the history.',                          // 3-24-2-4 解答
    'It is a book read by many students.',                       // 3-26-1-6 解答(過去分詞)
    'She read a letter. The letter was written in English.',     // 3-26-2-3
    'He read a book written by a famous writer.',                // 3-26-2-6 解答
    'The book I read was interesting.',                          // 3-27-2-1 解答
    'This is a book that I read yesterday.',                     // 3-30-1-1 解答
    'They read a book yesterday.',                               // 1-46-2-2 解答 (No.182)
  ];
  for (const s of pastSentences) {
    const ssml = buildSsml(s);
    assert.match(ssml, /ph="red"/, `過去形/redになっていない: ${s}`);
    assert.doesNotMatch(ssml, /ph="riːd"/, `現在形が混入: ${s}`);
  }
});

test('現在形・原形の read は /riːd/ のまま (No.152の維持=デグレ防止)', () => {
  const presentSentences = [
    'They read a book.',                    // 1-46-2-2 問題文(現在形の出題プロンプト)
    'What kind of book did you read?',      // did + 原形
    'I usually read comics.',
    'Can you read this?',
    'I have to read this book.',
  ];
  for (const s of presentSentences) {
    const ssml = buildSsml(s);
    assert.match(ssml, /ph="riːd"/, `原形がriːdになっていない: ${s}`);
    assert.doesNotMatch(ssml, /ph="red"/, `過去形が誤適用: ${s}`);
  }
});

test('現在完了・受け身のreadも /red/ (文法上の正しさ)', () => {
  assert.match(buildSsml('Have you ever read "Harry Potter"?'), /ph="red"/);
  assert.match(buildSsml('This book is read by many students.'), /ph="red"/);
  assert.match(buildSsml('He has already read this book.'), /ph="red"/);
});

test('Botchan は発音指定される (No.156・カタログ反映後に効く)', () => {
  const ssml = buildSsml('This is a book called Botchan.');
  assert.match(ssml, /<(phoneme|sub)[^>]*>Botchan<\/(phoneme|sub)>/);
});

test('drank は /dræŋk/ 指定 (No.183: drinkに聞こえる対策)', () => {
  assert.match(buildSsml('He drank milk this morning.'), /ph="dræŋk"/);
});

test('does not の連結対策 (No.181: 対象文のみ間を空ける)', () => {
  const ssml = buildSsml('He does not play golf.');
  assert.match(ssml, /does\s*<break[^>]*\/>\s*not/);
  // 他の文には影響しない
  assert.doesNotMatch(buildSsml('She does not like math.'), /does\s*<break/);
});

test('XMLエスケープと冒頭200ms無音は維持(既存仕様のデグレ検知)', () => {
  const ssml = buildSsml('Tom & "Jerry" <3');
  assert.match(ssml, /^<speak><break time="200ms"\/>/);
  assert.match(ssml, /&amp;/);
  assert.match(ssml, /&quot;|&#34;/);
  assert.doesNotMatch(ssml, /<3/); // 生の < が残らない
});
