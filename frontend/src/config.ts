// 本番ビルドでは同一オリジンの /api を使い、Vercel の rewrite でバックエンドへプロキシ
// （iOS Safari の ITP による cross-site cookie ブロックを回避するため）。
// ローカル開発時は VITE_API_URL もしくは localhost:4000 を使う。
export const API_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:4000');

