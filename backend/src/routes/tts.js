// backend/src/routes/tts.js
const express = require('express');
const { getTTSClient } = require('../services/google');
const { authenticateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { getCache, setCache, getTTSKey, DEFAULT_TTL } = require('../services/redis');

const router = express.Router();

// 合成ロジックの版数。発音補正・SSML構造を変更したら上げる
// (キャッシュキーに混入し、旧ロジックで合成済みの音声を確実に無効化する)
// v3: readの文単位発音(No.155/182) + Botchan/drank/does not補正(No.156/181/183)
const TTS_CACHE_VERSION = '3';

// 全文一律で適用する単語の発音マッピング
// ※readは文脈で発音が変わるため、ここではなく下のPAST_READ_TEXTSで文単位に扱う
const PRONUNCIATION_OVERRIDES = {
  // No.183: drank が drink に聞こえる → 過去形の母音を明示
  'drank': { phoneme: 'dræŋk', comment: '過去形: /dræŋk/' },
  // No.156: 固有名詞 Botchan(坊っちゃん)。カタログ反映で登場した時点で効く。※要試聴
  'Botchan': { phoneme: 'ˈbɑːttʃɑːn', comment: '坊っちゃん(近似発音・要試聴)' },
};

// read を過去形/過去分詞 /red/ で読む文(完全一致・要望No.155/182)。
// デフォルトは No.152 どおり現在形 /riːd/。
// ※問題カタログの文言修正(482問)で本文が変わった場合はここも追随させること
// 2026-08-31: 発注者による問題文修正(コンテンツ修正一括反映)後の本番文面と同期済み。
// 旧文面(2-38-2-2/2-41-2-8/2-42-1-7の各read文・"about the history")は本番から消えたため削除
const PAST_READ_TEXTS = new Set([
  'They read a book yesterday.',                                // 1-46-2-2 解答 (No.182)
  'Has he read this book yet?',                                 // 2-47-1-7 問題文(現在完了)
  'He has already read this book.',                             // 2-47-1-7 解答(現在完了)
  'I read a book about history.',                               // 3-24-2-4 解答 (No.155・2026-08修正後の文面)
  'It is a book read by many students.',                        // 3-26-1-6 解答 (No.155)
  'She read a letter. The letter was written in English.',      // 3-26-2-3 問題文 (No.155)
  'She read a letter written in English.',                      // 3-26-2-3 解答 (No.155)
  'He read a book. The book was written by a famous writer.',   // 3-26-2-6 問題文 (No.155)
  'He read a book written by a famous writer.',                 // 3-26-2-6 解答 (No.155)
  'I read a book. The book was interesting.',                   // 3-27-2-1 問題文 (No.155)
  'The book I read was interesting.',                           // 3-27-2-1 解答 (No.155)
  'This is a book. I read it yesterday.',                       // 3-30-1-1 問題文 (No.155)
  'This is a book that I read yesterday.',                      // 3-30-1-1 解答 (No.155)
]);

// 文単位のSSML微調整(No.181: does not が連結して聞こえる)。
// キー=完全一致の原文、値=エスケープ後テキストへの置換関数。※要試聴
const SENTENCE_TWEAKS = new Map([
  ['He does not play golf.', (escaped) => escaped.replace('does not', 'does <break time="120ms"/>not')],
]);

// SSML用のXMLエスケープ
function escapeSsml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * テキストをSSMLに変換する。
 * - 先頭に200msの無音を入れる(再生開始時に冒頭の音が欠ける問題への対策)
 * - read: 文単位マップ(PAST_READ_TEXTS)にあれば /red/、なければ /riːd/ (No.152/155/182)
 * - その他の同音異義語・固有名詞を <phoneme> で補正
 * - 表示テキストは変えない(Data Specs E24: 読み上げ・表示は同一テキストが仕様)
 * @param {string} text - 元のテキスト
 * @returns {string} SSML
 */
function buildSsml(text) {
  const raw = String(text).trim();
  let result = escapeSsml(text);

  // read の文単位発音
  const readPhoneme = PAST_READ_TEXTS.has(raw) ? 'red' : 'riːd';
  result = result.replace(/\bread\b/gi, (match) =>
    `<phoneme alphabet="ipa" ph="${readPhoneme}">${match}</phoneme>`
  );

  // 全文一律の単語補正
  for (const [word, { phoneme }] of Object.entries(PRONUNCIATION_OVERRIDES)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, (match) =>
      `<phoneme alphabet="ipa" ph="${phoneme}">${match}</phoneme>`
    );
  }

  // 文単位の微調整
  const tweak = SENTENCE_TWEAKS.get(raw);
  if (tweak) result = tweak(result);

  return `<speak><break time="200ms"/>${result}</speak>`;
}

// Google TTS エンドポイント
router.post('/synthesize',
  authenticateToken,
  validateBody({
    text: { type: 'string', required: true, minLength: 1, maxLength: 1000 },
  }),
  async (req, res) => {
  try {
    const {
      text,
      languageCode = 'en-US',
      voiceName = 'en-US-Neural2-D',
      speakingRate = 0.95,
      pitch = 0
    } = req.body;

    // speakingRateの範囲チェック（Google TTS APIの有効範囲: 0.25 - 4.0）
    const rate = Number(speakingRate);
    if (!Number.isFinite(rate) || rate < 0.25 || rate > 4.0) {
      return res.status(400).json({ ok: false, code: 'VAL-001', message: 'Invalid speakingRate (0.25 - 4.0)' });
    }

    // pitchの範囲チェック（Google TTS APIの有効範囲: -20.0 - 20.0）
    const p = Number(pitch);
    if (!Number.isFinite(p) || p < -20.0 || p > 20.0) {
      return res.status(400).json({ ok: false, code: 'VAL-001', message: 'Invalid pitch (-20.0 - 20.0)' });
    }

    // Redisキャッシュ(版数つき: 合成ロジック変更時に旧音声を引き当てない)
    const cacheKey = getTTSKey(text, languageCode, voiceName, TTS_CACHE_VERSION);
    const cachedAudio = await getCache(cacheKey);
    if (cachedAudio) {
      return res.json({ audioContent: cachedAudio.audioContent, contentType: 'audio/mp3', cached: true });
    }

    const tts = await getTTSClient();

    const [response] = await tts.synthesizeSpeech({
      input: { ssml: buildSsml(text) },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate, pitch: p },
    });

    const audioData = { audioContent: response.audioContent };
    await setCache(cacheKey, audioData, DEFAULT_TTL.TTS_AUDIO);

    res.json({ audioContent: response.audioContent, contentType: 'audio/mp3', cached: false });
  } catch (error) {
    console.error('[TTS-001] synthesize error:', error.message);
    res.status(500).json({ ok: false, code: 'TTS-001', message: '音声の合成に失敗しました' });
  }
});

// 利用可能な音声リスト
router.get('/voices', authenticateToken, async (req, res) => {
  try {
    const { languageCode = 'en-US' } = req.query;
    const tts = await getTTSClient();
    const [response] = await tts.listVoices({ languageCode });
    res.json({ ok: true, voices: response.voices });
  } catch (error) {
    console.error('[TTS-001] voices error:', error.message);
    res.status(500).json({ ok: false, code: 'TTS-001', message: '音声リストの取得に失敗しました' });
  }
});

module.exports = router;
// テスト用エクスポート(ルーター関数のプロパティとして付与)
module.exports.buildSsml = buildSsml;
module.exports.TTS_CACHE_VERSION = TTS_CACHE_VERSION;
module.exports.PAST_READ_TEXTS = PAST_READ_TEXTS;
