// backend/src/middleware/validation.js

/**
 * クエリパラメータの検証
 * @param {Object} schema - 検証スキーマ { paramName: { type: 'string'|'number', required: true|false, min: number, max: number } }
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = req.query[key];

      // 必須チェック
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} は必須です`);
        continue;
      }

      // 値が存在する場合のみ型と範囲をチェック
      if (value !== undefined && value !== null && value !== '') {
        // 型チェック
        if (rules.type === 'number') {
          const num = Number(value);
          if (!Number.isFinite(num)) {
            errors.push(`${key} は数値である必要があります`);
            continue;
          }

          // 範囲チェック
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`${key} は${rules.min}以上である必要があります`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`${key} は${rules.max}以下である必要があります`);
          }
        } else if (rules.type === 'string') {
          const str = String(value);

          // 長さチェック
          if (rules.minLength !== undefined && str.length < rules.minLength) {
            errors.push(`${key} は${rules.minLength}文字以上である必要があります`);
          }
          if (rules.maxLength !== undefined && str.length > rules.maxLength) {
            errors.push(`${key} は${rules.maxLength}文字以下である必要があります`);
          }

          // パターンチェック
          if (rules.pattern && !rules.pattern.test(str)) {
            errors.push(`${key} の形式が正しくありません`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        message: '入力値が不正です',
        errors: process.env.NODE_ENV === 'production' ? undefined : errors
      });
    }

    next();
  };
}

/**
 * リクエストボディの検証
 * @param {Object} schema - 検証スキーマ
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [key, rules] of Object.entries(schema)) {
      const value = body[key];

      // 必須チェック
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} は必須です`);
        continue;
      }

      // 値が存在する場合のみ型と範囲をチェック
      if (value !== undefined && value !== null && value !== '') {
        // 型チェック
        if (rules.type === 'number') {
          const num = Number(value);
          if (!Number.isFinite(num)) {
            errors.push(`${key} は数値である必要があります`);
            continue;
          }

          // 範囲チェック
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`${key} は${rules.min}以上である必要があります`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`${key} は${rules.max}以下である必要があります`);
          }
        } else if (rules.type === 'string') {
          const str = String(value);

          // 長さチェック
          if (rules.minLength !== undefined && str.length < rules.minLength) {
            errors.push(`${key} は${rules.minLength}文字以上である必要があります`);
          }
          if (rules.maxLength !== undefined && str.length > rules.maxLength) {
            errors.push(`${key} は${rules.maxLength}文字以下である必要があります`);
          }

          // パターンチェック
          if (rules.pattern && !rules.pattern.test(str)) {
            errors.push(`${key} の形式が正しくありません`);
          }
        } else if (rules.type === 'boolean') {
          if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
            errors.push(`${key} はboolean型である必要があります`);
          }
        } else if (rules.type === 'object') {
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`${key} はオブジェクトである必要があります`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        message: '入力値が不正です',
        errors: process.env.NODE_ENV === 'production' ? undefined : errors
      });
    }

    next();
  };
}

/**
 * エラーレスポンスのサニタイズ
 * 本番環境では詳細なエラーメッセージを隠す
 */
function sanitizeError(err, req, res, next) {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      ok: false,
      message: 'サーバーエラーが発生しました'
    });
  }

  // 開発環境では詳細を返す
  res.status(500).json({
    ok: false,
    message: 'サーバーエラーが発生しました',
    error: err.message,
    stack: err.stack
  });
}

module.exports = {
  validateQuery,
  validateBody,
  sanitizeError
};
