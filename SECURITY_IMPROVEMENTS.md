# セキュリティ改善実装サマリー

## 実装日
2025-10-23

## 対応した問題と実装内容

### 1. ✅ パスワードのハッシュ化（既に実装済み）
**問題**: パスワードがGoogle Sheetsに平文で保存されている
**対策**: bcryptを使用したパスワードハッシュ化
- `backend/src/utils/password.js`: bcryptによるハッシュ化・検証機能
- `backend/src/routes/logInPage.js`: ハッシュ化されたパスワードの検証に対応
- 後方互換性のため、平文パスワードも一時的にサポート

### 2. ✅ JWT認証トークンの実装
**問題**: 認証トークンが不在で、誰でも任意のuserIdでAPIを呼び出せる
**対策**: JWT（JSON Web Token）による認証システムを実装

#### バックエンド実装
- `backend/src/middleware/auth.js`:
  - `generateToken()`: JWTトークン生成
  - `authenticateToken()`: 必須認証ミドルウェア
  - `optionalAuth()`: オプション認証ミドルウェア
  - トークン有効期限: 24時間

#### クッキー設定
- HttpOnlyクッキーにトークンを保存（XSS対策）
- Secure属性（本番環境ではHTTPSのみ）
- SameSite=strict（CSRF対策）

### 3. ✅ APIエンドポイントの認証・認可
**問題**: すべてのAPIエンドポイントに認証がない
**対策**: 全エンドポイントに認証ミドルウェアを適用

#### 保護されたエンドポイント
- `POST /auth/login`: 入力検証のみ（認証前）
- `GET /game/part`: ✅ 認証必須 + ユーザーID検証
- `GET /game/questions`: ✅ 認証必須
- `POST /game/score`: ✅ 認証必須 + ユーザーID一致確認
- `POST /game/advance`: ✅ 認証必須 + ユーザーID一致確認
- `GET /select/options`: ✅ 認証必須 + ユーザーID一致確認
- `GET /select/validate`: ✅ 認証必須
- `GET /ranking`: オプション認証（公開情報）

### 4. ✅ CORS設定の厳格化
**問題**: すべてのオリジンを許可している
**対策**: 特定のオリジンのみ許可

#### 実装内容 (`backend/src/app.js`)
```javascript
const allowedOrigins = [
  'http://localhost:5173',  // Vite開発サーバー
  'http://localhost:3000',  // 代替ポート
  process.env.FRONTEND_URL  // 本番環境URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 5. ✅ HttpOnlyクッキーの使用
**問題**: LocalStorageに認証情報を保存（XSS攻撃で盗まれるリスク）
**対策**: HttpOnlyクッキーに移行

#### フロントエンド変更
すべてのAPIリクエストに `credentials: 'include'` を追加:
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/SelectPage.tsx`
- `frontend/src/pages/PlayPage.tsx`
- `frontend/src/pages/Ranking.tsx`

### 6. ✅ 包括的な入力検証
**問題**: 入力検証が不十分
**対策**: 専用のバリデーションミドルウェアを実装

#### 実装内容 (`backend/src/middleware/validation.js`)
- `validateQuery()`: クエリパラメータの検証
- `validateBody()`: リクエストボディの検証
- 型チェック（string, number, boolean, object）
- 範囲チェック（min, max）
- 長さチェック（minLength, maxLength）
- パターンチェック（正規表現）

#### 検証例
```javascript
validateBody({
  userId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  scores: { type: 'number', required: true, min: 0, max: 1000 },
  clear: { type: 'boolean', required: false }
})
```

### 7. ✅ エラーメッセージのサニタイズ
**問題**: エラーメッセージで内部情報が漏洩
**対策**: 本番環境では詳細なエラーを非表示

#### 実装内容
- `backend/src/middleware/validation.js`: `sanitizeError()`ミドルウェア
- 開発環境: 詳細なエラー情報を返す
- 本番環境: 一般的なエラーメッセージのみ返す
- すべてのエラーをサーバーログに記録

## セキュリティ強化のまとめ

### 実装前の脆弱性
1. ❌ 平文パスワード（→ ✅ bcryptハッシュ化）
2. ❌ 認証なし（→ ✅ JWT認証）
3. ❌ 認可なし（→ ✅ ユーザーID検証）
4. ❌ CORS緩い（→ ✅ 特定オリジンのみ）
5. ❌ LocalStorage使用（→ ✅ HttpOnlyクッキー）
6. ❌ 入力検証不足（→ ✅ 包括的検証）
7. ❌ エラー情報漏洩（→ ✅ サニタイズ）

### 追加されたセキュリティレイヤー
1. **認証レイヤー**: JWTトークンによる本人確認
2. **認可レイヤー**: ユーザーIDの一致確認
3. **入力検証レイヤー**: 型・範囲・長さのチェック
4. **トランスポートレイヤー**: CORS + HttpOnlyクッキー
5. **データ保護レイヤー**: bcryptパスワードハッシュ化
6. **情報漏洩防止**: エラーメッセージのサニタイズ

## 依存パッケージの追加
- `jsonwebtoken`: JWT生成・検証
- `cookie-parser`: クッキー解析

## 環境変数
以下の環境変数を`.env`に追加することを推奨:
```
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
```

## 今後の推奨事項
1. すべての平文パスワードをハッシュ化されたパスワードに移行
2. HTTPS環境での運用（Secureクッキー有効化のため）
3. レート制限の実装（ブルートフォース攻撃対策）
4. セッション管理の強化（リフレッシュトークンの実装）
5. 監査ログの実装
