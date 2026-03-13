// 統一ログヘルパー
function createLogger(namespace) {
  const now = () => new Date().toISOString();
  const rid = () => Math.random().toString(36).slice(2, 8);

  return {
    rid,
    info: (route, message, data) =>
      console.info(`[${now()}] [${namespace}] [INFO] [${route}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`),
    warn: (route, message, data) =>
      console.warn(`[${now()}] [${namespace}] [WARN] [${route}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`),
    error: (route, message, data) =>
      console.error(`[${now()}] [${namespace}] [ERROR] [${route}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`),
  };
}

module.exports = { createLogger };
