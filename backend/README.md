# Backend API - English Learning Game

## 概要
このディレクトリにはEnglish Learning Gameのバックエンドアプリケーションが含まれています。

## セットアップ

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定

`.env.example`ファイルを`.env`にコピーして、必要な値を設定してください。

```bash
cp .env.example .env
```

#### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NODE_ENV` | 実行環境 | `development` または `production` |
| `PORT` | サーバーポート | `4000` |
| `SHEET_ID` | Google SheetsのスプレッドシートID | `your_spreadsheet_id_here` |
| `GOOGLE_KEYFILE` | Google Cloud認証情報のパス | `./credentials.json` |
| `JWT_SECRET` | JWT認証用のシークレットキー（本番環境では長いランダム文字列に変更） | 64文字以上のランダム文字列 |
| `FRONTEND_URL` | フロントエンドのURL（CORS設定用） | `http://localhost:5173` |

#### オプションの環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `REDIS_HOST` | Redisサーバーのホスト | `localhost` |
| `REDIS_PORT` | Redisサーバーのポート | `6379` |
| `REDIS_PASSWORD` | Redisの認証パスワード（必要な場合） | なし |

### 3. Google Cloud認証情報の設定

1. Google Cloud Consoleでサービスアカウントを作成
2. サービスアカウントキー（JSON）をダウンロード
3. `backend/credentials.json`として保存
4. Google Sheets APIとGoogle Cloud Text-to-Speech APIを有効化

### 4. サーバーの起動

開発モード（ファイル監視付き）:
```bash
npm run dev
```

本番モード:
```bash
npm start
```

## スクリプト

- `npm start` - サーバーを起動
- `npm run dev` - 開発モードで起動（ファイル変更を自動監視）
- `npm test` - テストを実行（現在は未設定）

## セキュリティ

- 環境変数ファイル（`.env`）と認証情報（`credentials.json`）は`.gitignore`に含まれており、Gitにコミットされません
- 本番環境では必ず`JWT_SECRET`を強力なランダム文字列に変更してください
- 詳細は`SECURITY_IMPROVEMENTS.md`を参照してください

## API エンドポイント

### 認証
- `POST /auth/login` - ログイン

### ゲーム
- `GET /game/part` - パート情報取得
- `GET /game/questions` - 問題一覧取得
- `POST /game/score` - スコア送信
- `POST /game/advance` - 進捗更新

### 選択
- `GET /select/options` - 選択可能なオプション取得
- `GET /select/validate` - 選択の検証

### ランキング
- `GET /ranking` - ランキング取得

### TTS
- `POST /api/tts/synthesize` - 音声合成

## トラブルシューティング

### 環境変数が読み込まれない
- `.env`ファイルがbackendディレクトリに存在するか確認
- `.env`ファイルの形式が正しいか確認（`KEY=VALUE`形式）

### Google APIエラー
- `credentials.json`が正しい場所にあるか確認
- サービスアカウントに必要な権限があるか確認
- APIが有効化されているか確認

### Redisエラー
- Redisサーバーが起動しているか確認
- 接続情報が正しいか確認
