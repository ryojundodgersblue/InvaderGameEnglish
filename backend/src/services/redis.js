// backend/src/services/redis.js
const redis = require('redis');
const crypto = require('crypto');

// Redisクライアントの設定
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  // オプション: TLS設定（本番環境で必要な場合）
  // tls: process.env.NODE_ENV === 'production' ? {} : undefined,
};

// キャッシュのデフォルトTTL（秒）
// 環境変数で調整可能（性能最適化）
const DEFAULT_TTL = {
  SHEETS_DATA: parseInt(process.env.CACHE_TTL_SHEETS || '600', 10),        // デフォルト10分
  TTS_AUDIO: parseInt(process.env.CACHE_TTL_TTS || '86400', 10),          // デフォルト24時間
  RANKING_DATA: parseInt(process.env.CACHE_TTL_RANKING || '60', 10),      // デフォルト60秒
};

// TTL値のバリデーション
Object.keys(DEFAULT_TTL).forEach(key => {
  if (!Number.isFinite(DEFAULT_TTL[key]) || DEFAULT_TTL[key] < 0) {
    console.warn(`[Redis] Invalid TTL for ${key}, using default`);
    DEFAULT_TTL[key] = key === 'SHEETS_DATA' ? 600 : key === 'TTS_AUDIO' ? 86400 : 60;
  }
});

let client = null;
let isConnected = false;
// Redis接続情報が設定されていない場合は最初から無効化
let redisAvailable = !!(process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost');

if (!redisAvailable && process.env.NODE_ENV === 'production') {
  console.log('[Redis] No REDIS_HOST configured - running without cache');
}

/**
 * Redisクライアントを取得または作成
 */
async function getRedisClient() {
  // Redisが利用できない場合はnullを返す
  if (!redisAvailable) {
    return null;
  }

  if (client && isConnected) {
    return client;
  }

  if (!client) {
    try {
      client = redis.createClient(REDIS_CONFIG);

      client.on('error', (err) => {
        console.error('[Redis] Client error:', err.message);
        isConnected = false;
      });

      client.on('connect', () => {
        console.log('[Redis] Client connected');
        isConnected = true;
        redisAvailable = true;
      });

      client.on('ready', () => {
        console.log('[Redis] Client ready');
        isConnected = true;
        redisAvailable = true;
      });

      client.on('end', () => {
        console.log('[Redis] Client disconnected');
        isConnected = false;
      });

      client.on('reconnecting', () => {
        console.log('[Redis] Client reconnecting...');
      });
    } catch (err) {
      console.warn('[Redis] Failed to create client:', err.message);
      console.warn('[Redis] Continuing without cache...');
      redisAvailable = false;
      return null;
    }
  }

  if (!isConnected) {
    try {
      await client.connect();
    } catch (err) {
      console.warn('[Redis] Failed to connect:', err.message);
      console.warn('[Redis] Continuing without cache...');
      redisAvailable = false;
      client = null;
      return null;
    }
  }

  return client;
}

/**
 * ハッシュ値を生成（キャッシュキー用）
 */
function generateHash(data) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * キャッシュから取得
 */
async function getCache(key) {
  try {
    const redisClient = await getRedisClient();

    // Redisが利用できない場合はnullを返す
    if (!redisClient) {
      return null;
    }

    const value = await redisClient.get(key);

    if (!value) {
      console.log(`[Redis] Cache miss: ${key}`);
      return null;
    }

    console.log(`[Redis] Cache hit: ${key}`);
    return JSON.parse(value);
  } catch (err) {
    console.error('[Redis] Error getting cache:', err.message);
    return null;
  }
}

/**
 * キャッシュに保存
 */
async function setCache(key, value, ttl = DEFAULT_TTL.SHEETS_DATA) {
  try {
    const redisClient = await getRedisClient();

    // Redisが利用できない場合は何もしない
    if (!redisClient) {
      return false;
    }

    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    console.log(`[Redis] Cache set: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (err) {
    console.error('[Redis] Error setting cache:', err.message);
    return false;
  }
}

/**
 * キャッシュを削除
 */
async function deleteCache(key) {
  try {
    const redisClient = await getRedisClient();

    // Redisが利用できない場合は何もしない
    if (!redisClient) {
      return false;
    }

    await redisClient.del(key);
    console.log(`[Redis] Cache deleted: ${key}`);
    return true;
  } catch (err) {
    console.error('[Redis] Error deleting cache:', err.message);
    return false;
  }
}

/**
 * パターンに一致するキーをすべて削除
 */
async function deleteCachePattern(pattern) {
  try {
    const redisClient = await getRedisClient();

    // Redisが利用できない場合は0を返す
    if (!redisClient) {
      return 0;
    }

    const keys = [];

    // スキャンしてキーを取得
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }

    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Redis] Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }

    return keys.length;
  } catch (err) {
    console.error('[Redis] Error deleting cache pattern:', err.message);
    return 0;
  }
}

/**
 * Redisクライアントを閉じる
 */
async function closeRedis() {
  if (client && isConnected) {
    try {
      await client.quit();
      console.log('[Redis] Client closed');
      isConnected = false;
    } catch (err) {
      console.warn('[Redis] Error closing client:', err.message);
    }
  }
}

/**
 * Google Sheetsデータ用のキャッシュキー生成
 */
function getSheetsKey(sheetName, range) {
  return `sheets:${sheetName}:${range}`;
}

/**
 * TTS音声データ用のキャッシュキー生成
 */
function getTTSKey(text, languageCode, voiceName) {
  const hash = generateHash({ text, languageCode, voiceName });
  return `tts:${hash}`;
}

/**
 * ランキングデータ用のキャッシュキー生成
 */
function getRankingKey(monthKey) {
  return `ranking:${monthKey}`;
}

module.exports = {
  getRedisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  closeRedis,
  getSheetsKey,
  getTTSKey,
  getRankingKey,
  DEFAULT_TTL,
  generateHash,
};
