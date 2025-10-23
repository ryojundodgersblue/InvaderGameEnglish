// frontend/src/utils/audioCache.ts
/**
 * IndexedDBを使用した音声キャッシュユーティリティ
 */

const DB_NAME = 'TTSAudioCache';
const STORE_NAME = 'audioData';
const DB_VERSION = 1;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7日間

interface CachedAudio {
  key: string;
  audioContent: string;
  timestamp: number;
}

/**
 * IndexedDBを初期化
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[AudioCache] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[AudioCache] Database created');
      }
    };
  });
}

/**
 * キャッシュキーを生成
 */
export function generateCacheKey(text: string, languageCode: string, voiceName: string): string {
  // 簡単なハッシュ関数（実際の本番環境では適切なハッシュライブラリを使用）
  const str = `${text}|${languageCode}|${voiceName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `tts_${Math.abs(hash).toString(36)}`;
}

/**
 * 音声データをキャッシュから取得
 */
export async function getAudioFromCache(
  text: string,
  languageCode: string,
  voiceName: string
): Promise<string | null> {
  try {
    const db = await openDatabase();
    const key = generateCacheKey(text, languageCode, voiceName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedAudio | undefined;

        if (!result) {
          console.log('[AudioCache] Cache miss:', text.substring(0, 50));
          resolve(null);
          return;
        }

        // 有効期限をチェック
        const now = Date.now();
        if (now - result.timestamp > CACHE_EXPIRY_MS) {
          console.log('[AudioCache] Cache expired:', text.substring(0, 50));
          // 期限切れのデータを削除
          deleteAudioFromCache(text, languageCode, voiceName);
          resolve(null);
          return;
        }

        console.log('[AudioCache] Cache hit:', text.substring(0, 50));
        resolve(result.audioContent);
      };

      request.onerror = () => {
        console.error('[AudioCache] Error reading cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[AudioCache] Error accessing cache:', error);
    return null;
  }
}

/**
 * 音声データをキャッシュに保存
 */
export async function saveAudioToCache(
  text: string,
  languageCode: string,
  voiceName: string,
  audioContent: string
): Promise<boolean> {
  try {
    const db = await openDatabase();
    const key = generateCacheKey(text, languageCode, voiceName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const data: CachedAudio = {
        key,
        audioContent,
        timestamp: Date.now(),
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log('[AudioCache] Audio saved to cache:', text.substring(0, 50));
        resolve(true);
      };

      request.onerror = () => {
        console.error('[AudioCache] Error saving to cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[AudioCache] Error saving to cache:', error);
    return false;
  }
}

/**
 * 音声データをキャッシュから削除
 */
export async function deleteAudioFromCache(
  text: string,
  languageCode: string,
  voiceName: string
): Promise<boolean> {
  try {
    const db = await openDatabase();
    const key = generateCacheKey(text, languageCode, voiceName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log('[AudioCache] Audio deleted from cache:', text.substring(0, 50));
        resolve(true);
      };

      request.onerror = () => {
        console.error('[AudioCache] Error deleting from cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[AudioCache] Error deleting from cache:', error);
    return false;
  }
}

/**
 * キャッシュ全体をクリア
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[AudioCache] All cache cleared');
        resolve(true);
      };

      request.onerror = () => {
        console.error('[AudioCache] Error clearing cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[AudioCache] Error clearing cache:', error);
    return false;
  }
}

/**
 * 期限切れのキャッシュエントリを削除
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const db = await openDatabase();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const data = cursor.value as CachedAudio;

          if (now - data.timestamp > CACHE_EXPIRY_MS) {
            cursor.delete();
            deletedCount++;
          }

          cursor.continue();
        } else {
          console.log(`[AudioCache] Cleaned ${deletedCount} expired entries`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('[AudioCache] Error cleaning cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[AudioCache] Error cleaning cache:', error);
    return 0;
  }
}
