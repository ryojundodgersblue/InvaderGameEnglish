// backend/src/routes/tts.js
const express = require('express');
const { getTTSClient } = require('../services/google');

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

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
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

    // Base64エンコードされた音声データを返す
    res.json({ 
      audioContent: response.audioContent,
      contentType: 'audio/mp3'
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