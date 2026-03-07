# Render デプロイ用プロンプト（Claude for Chrome）

以下をそのままClaude for Chromeに貼り付けて使ってください。

---

## プロンプト

```
Renderのダッシュボード（https://dashboard.render.com）でこのプロジェクトのバックエンドをデプロイする手順を、画面を見ながら一つずつ案内してください。
既存のサービスには一切触れず、新規サービスとして追加します。

### プロジェクト情報

- **リポジトリ**: https://github.com/ryojundodgersblue/InvaderGameEnglish
- **バックエンドのルートディレクトリ**: `backend/`
- **ランタイム**: Node.js
- **ビルドコマンド**: `cd backend && npm install`
- **スタートコマンド**: `cd backend && npm start`
- **ポート**: 環境変数 PORT に従う（Renderが自動設定）
- **ヘルスチェック**: `GET /health` → `{ "ok": true }`

### 設定する環境変数

| 変数名 | 値 | 備考 |
|--------|-----|------|
| `NODE_ENV` | `production` | |
| `SHEET_ID` | （自分のGoogle SpreadsheetのID） | URLの `/d/` と `/edit` の間の文字列 |
| `GOOGLE_CREDENTIALS_JSON` | （サービスアカウントのJSONキーの中身をそのまま貼り付け） | credentials.jsonの中身全体 |
| `JWT_SECRET` | （64文字以上のランダム文字列） | `openssl rand -hex 32` で生成可能 |
| `FRONTEND_URL` | （Vercelにデプロイ済みのフロントエンドURL） | 例: `https://invader-game.vercel.app` 末尾スラッシュなし |

※ Redisは任意です。設定しなくてもバックエンドは正常に動作します（キャッシュなしで動く）。
Redis を使う場合は追加で `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` を設定してください。

### 手順の流れ

1. Renderダッシュボードで「New +」→「Web Service」を選択
2. GitHubリポジトリ `ryojundodgersblue/InvaderGameEnglish` を接続
3. 以下を設定:
   - **Name**: 任意（例: `invader-game-api`）
   - **Region**: 最寄りのリージョン（例: Singapore）
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free（または必要に応じて選択）
4. 「Environment」セクションで上記の環境変数をすべて追加
5. 「Create Web Service」をクリック

### デプロイ後の確認

1. デプロイ完了後、Renderが発行したURL（例: `https://invader-game-api.onrender.com`）の `/health` にアクセスして `{"ok":true}` が返ることを確認
2. フロントエンド側（Vercel）の環境変数 `VITE_API_URL` をRenderのバックエンドURLに更新してリデプロイ

### 注意事項

- 既存のRenderサービスには絶対に触れないでください。新規作成のみ行います
- 「Root Directory」を `backend` に設定することで、モノレポでもbackendだけがデプロイされます
- GOOGLE_CREDENTIALS_JSON は JSON 文字列をそのまま環境変数に入れてください（ファイルではなく環境変数から読み込む仕組みが実装済み）
- 画面の各ステップで、今何を入力すべきか具体的に教えてください
```

---

## 補足

- `GOOGLE_CREDENTIALS_JSON` 環境変数は `backend/src/services/google.js` で対応済みです。追加のコード変更は不要です。
- Redis未設定でもバックエンドは正常動作します（`backend/src/services/redis.js` でグレースフルデグラデーション実装済み）。
