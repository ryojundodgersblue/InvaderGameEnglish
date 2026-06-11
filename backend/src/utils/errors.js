// エラーコード体系
// すべてのAPIエラーレスポンスは {ok:false, code, message} 形式で返す。
// コードの意味・対処は リポジトリ直下の「エラーコード一覧.md」を参照。
//
// コード体系:
//   AUTH-xxx  認証・認可
//   VAL-xxx   入力検証
//   DATA-xxx  データ取得・整合性
//   GAME-xxx  ゲーム進行(スコア・進捗)
//   TTS-xxx   音声合成
//   ADMIN-xxx 管理機能
//   SYS-xxx   システム内部・設定

const ERROR_CODES = {
  'AUTH-001': '認証に失敗しました',
  'AUTH-002': '認証が必要です',
  'AUTH-003': 'この操作を行う権限がありません',
  'AUTH-004': 'ログインの有効期限が切れています',
  'VAL-001': '入力値が不正です',
  'DATA-001': 'データの取得に失敗しました',
  'DATA-002': 'データのヘッダー構成が想定と異なります',
  'DATA-003': 'ローカルデータファイルが見つかりません',
  'DATA-004': '該当するデータが見つかりません',
  'GAME-001': 'スコアの保存に失敗しました',
  'GAME-002': '進捗の更新に失敗しました',
  'GAME-003': '問題データの取得に失敗しました',
  'TTS-001': '音声の合成に失敗しました',
  'ADMIN-001': 'ユーザー管理の操作に失敗しました',
  'SYS-001': 'サーバーエラーが発生しました',
  'SYS-002': 'サーバーの設定に不備があります',
  'SYS-404': '指定されたAPIが存在しません',
  'SYS-429': 'アクセスが集中しています。しばらく待ってからお試しください',
};

class AppError extends Error {
  /**
   * @param {string} code - ERROR_CODES のキー
   * @param {number} statusCode - HTTPステータス
   * @param {string} [message] - 省略時はコードの既定メッセージ
   * @param {Error} [cause] - 元エラー(ログ用)
   */
  constructor(code, statusCode, message, cause) {
    super(message || ERROR_CODES[code] || 'エラーが発生しました');
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    if (cause) this.cause = cause;
  }
}

/**
 * ルートのcatch節で使う共通エラーレスポンス。
 * - AppError / statusCode付きエラー: そのコード・ステータスで返す
 * - それ以外: fallbackCode(既定SYS-001)の500で返す(内部詳細は隠す)
 * 常に code を含めるので、利用者からのコード報告だけで発生箇所を特定できる。
 */
function sendError(res, log, route, err, fallbackCode = 'SYS-001') {
  const finalCode = err.code && ERROR_CODES[err.code] ? err.code : fallbackCode;
  const statusCode = err.statusCode || 500;
  // statusCode付き(=意図して投げたエラー)はそのメッセージを、想定外エラーは
  // 内部情報を出さず既定メッセージを返す
  const message = err.statusCode ? err.message : ERROR_CODES[fallbackCode];

  if (log && log.error) {
    log.error(route, `[${finalCode}]`, {
      message: err.message,
      cause: err.cause?.message,
    });
  } else {
    console.error(`[${finalCode}] ${route}:`, err.message, err.cause?.message || '');
  }

  return res.status(statusCode).json({ ok: false, code: finalCode, message });
}

module.exports = { AppError, ERROR_CODES, sendError };
