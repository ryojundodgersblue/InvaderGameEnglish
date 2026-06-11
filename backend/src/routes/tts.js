// backend/src/routes/tts.js
const express = require('express');
const { getTTSClient } = require('../services/google');
const { authenticateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { getCache, setCache, getTTSKey, DEFAULT_TTL } = require('../services/redis');

const router = express.Router();

// 同音異義語の発音マッピング（現在形で読ませたい単語）
const PRONUNCIATION_OVERRIDES = {
  'read': { phoneme: 'riːd', comment: '現在形: /riːd/ (過去形 /red/ を避ける)' },
};

/**
 * テキスト内の同音異義語をSSML <phoneme> タグで置換する
 * @param {string} text - 元のテキスト
 * @returns {{ ssml: string, hasOverride: boolean }}
 */
function applyPronunciationOverrides(text) {
  let result = text;
  let hasOverride = false;

  for (const [word, { phoneme }] of Object.entries(PRONUNCIATION_OVERRIDES)) {
    // 単語境界でマッチ（大文字小文字を区別しない）
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(result)) {
      hasOverride = true;
      result = result.replace(regex, (match) =>
        `<phoneme alphabet="ipa" ph="${phoneme}">${match}</phoneme>`
      );
    }
  }

  if (hasOverride) {
    return { ssml: `<speak>${result}</speak>`, hasOverride: true };
  }
  return { ssml: result, hasOverride: false };
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
      return res.status(400).json({ ok: false, message: 'Invalid speakingRate (0.25 - 4.0)' });
    }

    // pitchの範囲チェック（Google TTS APIの有効範囲: -20.0 - 20.0）
    const p = Number(pitch);
    if (!Number.isFinite(p) || p < -20.0 || p > 20.0) {
      return res.status(400).json({ ok: false, message: 'Invalid pitch (-20.0 - 20.0)' });
    }

    // Redisキャッシュ
    const cacheKey = getTTSKey(text, languageCode, voiceName);
    const cachedAudio = await getCache(cacheKey);
    if (cachedAudio) {
      return res.json({ audioContent: cachedAudio.audioContent, contentType: 'audio/mp3', cached: true });
    }

    // 同音異義語の発音補正をチェック
    const { ssml, hasOverride } = applyPronunciationOverrides(text);

    const tts = await getTTSClient();
    const input = hasOverride ? { ssml } : { text };

    const [response] = await tts.synthesizeSpeech({
      input,
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate, pitch },
    });

    const audioData = { audioContent: response.audioContent };
    await setCache(cacheKey, audioData, DEFAULT_TTL.TTS_AUDIO);

    res.json({ audioContent: response.audioContent, contentType: 'audio/mp3', cached: false });
  } catch (error) {
    console.error('[TTS] Error:', error.message);
    res.status(500).json({ ok: false, message: 'Text-to-Speech synthesis failed' });
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
    console.error('[TTS] Get Voices Error:', error.message);
    res.status(500).json({ ok: false, message: 'Failed to fetch voices' });
  }
});

module.exports = router;
