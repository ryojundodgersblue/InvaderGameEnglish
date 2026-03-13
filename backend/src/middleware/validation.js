// backend/src/middleware/validation.js

/**
 * 値を検証するコアロジック（validateQuery/validateBodyで共用）
 */
function validateValue(key, value, rules, errors) {
  // 必須チェック
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${key} は必須です`);
    return;
  }

  // 値が存在しない場合はスキップ
  if (value === undefined || value === null || value === '') return;

  switch (rules.type) {
    case 'number': {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        errors.push(`${key} は数値である必要があります`);
        return;
      }
      if (rules.min !== undefined && num < rules.min) {
        errors.push(`${key} は${rules.min}以上である必要があります`);
      }
      if (rules.max !== undefined && num > rules.max) {
        errors.push(`${key} は${rules.max}以下である必要があります`);
      }
      break;
    }
    case 'string': {
      const str = String(value);
      if (rules.minLength !== undefined && str.length < rules.minLength) {
        errors.push(`${key} は${rules.minLength}文字以上である必要があります`);
      }
      if (rules.maxLength !== undefined && str.length > rules.maxLength) {
        errors.push(`${key} は${rules.maxLength}文字以下である必要があります`);
      }
      if (rules.pattern && !rules.pattern.test(str)) {
        errors.push(`${key} の形式が正しくありません`);
      }
      break;
    }
    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
        errors.push(`${key} はboolean型である必要があります`);
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${key} はオブジェクトである必要があります`);
      }
      break;
  }
}

function createValidator(getSource) {
  return (schema) => (req, res, next) => {
    const errors = [];
    const source = getSource(req);

    for (const [key, rules] of Object.entries(schema)) {
      validateValue(key, source[key], rules, errors);
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

const validateQuery = createValidator(req => req.query);
const validateBody = createValidator(req => req.body || {});

/**
 * エラーレスポンスのサニタイズ
 */
function sanitizeError(err, req, res, _next) {
  console.error('[Error]', {
    message: err.message,
    path: req.path,
    method: req.method
  });

  const response = { ok: false, message: 'サーバーエラーが発生しました' };

  if (process.env.NODE_ENV !== 'production') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

module.exports = {
  validateQuery,
  validateBody,
  sanitizeError
};
