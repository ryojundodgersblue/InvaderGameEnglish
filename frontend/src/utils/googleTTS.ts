// src/utils/googleTTS.tsx
import { API_URL } from '../config';

interface TTSOptions {
  text: string;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

interface Voice {
  languageCodes: string[];
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

class GoogleTTSService {
  private audioCache: Map<string, string> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  async speak(options: TTSOptions): Promise<void> {
    const { 
      text, 
      languageCode = 'en-US', 
      voiceName = 'en-US-Neural2-D',
      speakingRate = 0.95,
      pitch = 0
    } = options;
    
    const cacheKey = `${text}_${languageCode}_${voiceName}_${speakingRate}_${pitch}`;
    
    this.stop();

    try {
      let audioDataUrl: string;

      if (this.audioCache.has(cacheKey)) {
        audioDataUrl = this.audioCache.get(cacheKey)!;
      } else {
        const response = await fetch(`${this.baseUrl}/api/tts/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            languageCode,
            voiceName,
            speakingRate,
            pitch,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'TTS request failed');
        }

        const data = await response.json();
        audioDataUrl = `data:audio/mp3;base64,${data.audioContent}`;
        
        // キャッシュに保存（メモリ制限を考慮して最大100件まで）
        if (this.audioCache.size >= 100) {
          const firstKey = this.audioCache.keys().next().value;
          if (firstKey) {
            this.audioCache.delete(firstKey);
          }
        }
        this.audioCache.set(cacheKey, audioDataUrl);
      }

      return new Promise((resolve, reject) => {
        this.currentAudio = new Audio(audioDataUrl);
        this.currentAudio.onended = () => resolve();
        this.currentAudio.onerror = (error) => reject(error);
        this.currentAudio.play().catch(reject);
      });
    } catch (error) {
      console.error('Google TTS Error:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  clearCache(): void {
    this.audioCache.clear();
  }

  // 利用可能な音声を取得
  async getAvailableVoices(languageCode: string = 'en-US'): Promise<Voice[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/tts/voices?languageCode=${languageCode}`
      );
      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }
}

export const googleTTS = new GoogleTTSService();