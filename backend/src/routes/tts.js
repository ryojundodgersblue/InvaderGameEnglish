// backend/src/routes/tts.js
const express = require('express');
const { getTTSClient } = require('../services/google');
const { getCache, setCache, getTTSKey, DEFAULT_TTL } = require('../services/redis');

const router = express.Router();

// Google TTS エンドポイント
router.post('/synthesize', async (req, res) => {
  try {
    const {
      text,
      languageCode = 'en-US',
      voiceName = 'en-US-Neural2-D',
      speakingRate = 0.95,
      pitch = 0
    } = req.body;

    // 入力バリデーション（セキュリティ強化）
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string' });
    }

    // テキスト長の制限（Google TTS APIの制限は5000文字）
    const maxTextLength = parseInt(process.env.TTS_MAX_TEXT_LENGTH || '1000', 10);
    if (text.length > maxTextLength) {
      return res.status(400).json({
        error: 'Text is too long',
        maxLength: maxTextLength,
        actualLength: text.length
      });
    }

    // speakingRateの範囲チェック（Google TTS APIの有効範囲: 0.25 - 4.0）
    const rate = Number(speakingRate);
    if (!Number.isFinite(rate) || rate < 0.25 || rate > 4.0) {
      return res.status(400).json({
        error: 'Invalid speakingRate',
        validRange: '0.25 - 4.0'
      });
    }

    // pitchの範囲チェック（Google TTS APIの有効範囲: -20.0 - 20.0）
    const p = Number(pitch);
    if (!Number.isFinite(p) || p < -20.0 || p > 20.0) {
      return res.status(400).json({
        error: 'Invalid pitch',
        validRange: '-20.0 - 20.0'
      });
    }

    // Redisキャッシュをチェック
    const cacheKey = getTTSKey(text, languageCode, voiceName);
    const cachedAudio = await getCache(cacheKey);

    if (cachedAudio) {
      console.log('[TTS] Cache hit for:', text.substring(0, 50));
      return res.json({
        audioContent: cachedAudio.audioContent,
        contentType: 'audio/mp3',
        cached: true
      });
    }

    const tts = await getTTSClient();

    // ✅ 正しいAPI呼び出し方法
    const [response] = await tts.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate,
        pitch,
      },
    });

    // Redisキャッシュに保存（24時間）
    const audioData = {
      audioContent: response.audioContent
    };
    await setCache(cacheKey, audioData, DEFAULT_TTL.TTS_AUDIO);
    console.log('[TTS] Cache miss - fetched and cached:', text.substring(0, 50));

    // Base64エンコードされた音声データを返す
    res.json({
      audioContent: response.audioContent,
      contentType: 'audio/mp3',
      cached: false
    });

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ 
      error: 'Text-to-Speech synthesis failed',
      details: error.message 
    });
  }
});

// 利用可能な音声リストを取得(オプション)
router.get('/voices', async (req, res) => {
  try {
    const { languageCode = 'en-US' } = req.query;
    const tts = await getTTSClient();

    // ✅ 正しいAPI呼び出し方法
    const [response] = await tts.listVoices({
      languageCode,
    });

    res.json({ voices: response.voices });
  } catch (error) {
    console.error('Get Voices Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      details: error.message 
    });
  }
});

module.exports = router;