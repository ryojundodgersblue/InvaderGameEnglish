# userIDの流れの完全な追跡結果

## 概要

playGame.jsでスコアを保存する際に使用される`userId`の流れを、ユーザーのログインからスコア保存まで完全に追跡しました。

---

## userIDの流れ（全体フロー）

```
[1] ユーザー入力
    ↓
[2] フロントエンド → バックエンド (ログインリクエスト)
    ↓
[3] バックエンドがGoogleスプレッドシートから検証
    ↓
[4] バックエンドがJWTトークンを生成（userIdを含む）
    ↓
[5] バックエンドがHttpOnlyクッキーとしてトークンを送信
    ↓
[6] フロントエンドがlocalStorageにuserIdを保存
    ↓
[7] ゲームプレイ
    ↓
[8] ゲーム終了時、localStorageからuserIdを取得
    ↓
[9] フロントエンド → バックエンド (スコア送信)
    ↓
[10] バックエンドがJWTトークンとリクエストのuserIdを照合
    ↓
[11] Googleスプレッドシートにスコアを保存
```

---

## 詳細フロー

### 【ステップ1】ユーザーがログインフォームにuserIdを入力

**ファイル**: `frontend/src/pages/LoginPage.tsx:21, 82`

```tsx
const [userId, setUserId] = useState('')

<TextBox value={userId} onChange={setUserId} placeholder="Enter your ID" />
```

- ユーザーがログインフォームにuserIdを手動で入力します

---

### 【ステップ2】フロントエンドがバックエンドにログインリクエストを送信

**ファイル**: `frontend/src/pages/LoginPage.tsx:29-34`

```tsx
const res = await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // クッキーを送受信
  body: JSON.stringify({ userId, password }),
})
```

**送信データ**:
```json
{
  "userId": "ユーザーが入力したID",
  "password": "ユーザーが入力したパスワード"
}
```

---

### 【ステップ3】バックエンドがGoogleスプレッドシートからユーザー情報を取得

**ファイル**: `backend/src/routes/logInPage.js:81-88, 111`

```javascript
// Googleスプレッドシートの'users'シートからデータを取得
const resp = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${USER_SHEET_NAME}!A1:K`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});

const rows = resp.data.values || [];

// user_idが完全一致する行を探す（固定列 index=1）
const rowIndex = dataRows.findIndex(r => String(r[COL.user_id] || '') === String(userId));
```

**処理内容**:
1. Googleスプレッドシート（'users'シート）からすべてのユーザーデータを取得
2. リクエストで受け取った`userId`とスプレッドシートの`user_id`列（B列）を照合
3. 一致するユーザーが見つかれば、パスワードを検証

**スプレッドシートの構造**:
| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| id | user_id | password | nickname | real_name | current_grade | current_part | current_subpart | is_admin | created_at | updated_at |

---

### 【ステップ4】バックエンドがJWTトークンを生成

**ファイル**: `backend/src/routes/logInPage.js:165-172`

```javascript
// JWTトークンを生成
const token = generateToken({
  userId: String(userId),  // ← スプレッドシートから取得したuserIdをペイロードに含める
  name,
  current_grade,
  current_part,
  current_subpart,
  is_admin,
});
```

**JWTペイロード**:
```json
{
  "userId": "user001",
  "name": "山田太郎",
  "current_grade": 1,
  "current_part": 2,
  "current_subpart": 1,
  "is_admin": false,
  "iat": 1234567890,
  "exp": 1234654290
}
```

**トークン生成ロジック** (`backend/src/middleware/auth.js:27-29`):
```javascript
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
```

---

### 【ステップ5】バックエンドがHttpOnlyクッキーとしてトークンを送信

**ファイル**: `backend/src/routes/logInPage.js:175-189`

```javascript
// HttpOnlyクッキーにトークンを設定
const cookieOptions = {
  httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
  secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
  sameSite: 'lax', // CSRF対策
  maxAge: 24 * 60 * 60 * 1000, // 24時間
};

res.cookie('authToken', token, cookieOptions);
```

**レスポンス**:
```json
{
  "ok": true,
  "user": {
    "userId": "user001",
    "name": "山田太郎",
    "current_grade": 1,
    "current_part": 2,
    "current_subpart": 1,
    "is_admin": false
  }
}
```

**Set-Cookieヘッダー**:
```
Set-Cookie: authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax
```

---

### 【ステップ6】フロントエンドがlocalStorageにuserIdを保存

**ファイル**: `frontend/src/pages/LoginPage.tsx:44-50`

```tsx
// ★ ユーザー情報を保存
const user = data.user || {}
localStorage.setItem('userId', user.userId ?? '')       // ← ここでlocalStorageに保存
localStorage.setItem('userName', user.name ?? '')
localStorage.setItem('current_grade', String(user.current_grade ?? ''))
localStorage.setItem('current_part',  String(user.current_part  ?? ''))
localStorage.setItem('is_admin', String(user.is_admin ?? false))
```

**localStorage の内容**:
```
userId: "user001"
userName: "山田太郎"
current_grade: "1"
current_part: "2"
current_subpart: "1"
is_admin: "false"
```

**重要**: この時点で、userIdは以下の2箇所に保存されています：
1. **ブラウザのlocalStorage** （JavaScriptからアクセス可能）
2. **ブラウザのCookie（authToken）** （HttpOnlyのためJavaScriptからアクセス不可）

---

### 【ステップ7】ゲームプレイ

ユーザーがゲームをプレイします（このステップではuserIdは使用されません）

---

### 【ステップ8】ゲーム終了時、localStorageからuserIdを取得

**ファイル**: `frontend/src/pages/PlayPage.tsx:1478`

```tsx
const finishGame = useCallback(async () => {
  const nonDemoCount = questionsRef.current.filter(q => !q.is_demo).length;
  const finalCorrect = realCorrectRef.current;
  const clear = finalCorrect >= CORRECT_TO_CLEAR;

  const userId = localStorage.getItem('userId') || '';  // ← localStorageから取得
  const part_id = questionsRef.current[0]?.part_id || partInfo?.part_id || '';
```

**取得される値**: `"user001"`

---

### 【ステップ9】フロントエンドがバックエンドにスコア送信リクエストを送信

**ファイル**: `frontend/src/pages/PlayPage.tsx:1505-1515`

```tsx
const scoreResponse = await fetch('http://localhost:4000/game/score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // ← Cookieも送信
  body: JSON.stringify({
    userId,      // localStorageから取得
    part_id,
    scores: finalCorrect,
    clear
  }),
});
```

**送信されるデータ**:

**リクエストボディ**:
```json
{
  "userId": "user001",
  "part_id": "part_1_1_1",
  "scores": 12,
  "clear": true
}
```

**Cookieヘッダー**:
```
Cookie: authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要**: この時点で、userIdは以下の2つの形式で送信されています：
1. **リクエストボディ内のuserId** （localStorageから取得）
2. **CookieのJWTトークン内のuserId** （ログイン時に設定されたCookie）

---

### 【ステップ10】バックエンドがJWTトークンを検証し、userIdを照合

#### 10-1. authenticateTokenミドルウェアでJWTを検証

**ファイル**: `backend/src/middleware/auth.js:35-70`

```javascript
function authenticateToken(req, res, next) {
  console.log('[AUTH] Request to:', req.method, req.path);
  console.log('[AUTH] Cookies:', Object.keys(req.cookies || {}));

  const token = req.cookies?.authToken;  // ← Cookieからトークンを取得

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: '認証が必要です'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);  // ← JWTを検証・デコード
    // デコードしたユーザー情報をreq.userに格納
    req.user = decoded;  // ← req.userにペイロードを設定
    console.log('[AUTH] Token verified successfully for user:', decoded.userId);
    next();
  } catch (err) {
    // エラー処理...
  }
}
```

**デコードされた`req.user`の内容**:
```json
{
  "userId": "user001",
  "name": "山田太郎",
  "current_grade": 1,
  "current_part": 2,
  "current_subpart": 1,
  "is_admin": false,
  "iat": 1234567890,
  "exp": 1234654290
}
```

#### 10-2. playGame.jsでリクエストボディのuserIdとJWTのuserIdを照合

**ファイル**: `backend/src/routes/playGame.js:254-261`

```javascript
const { userId, part_id, scores, clear } = req.body || {};

// 認証されたユーザーと送信されたuserIdが一致するか確認
if (req.user.userId !== userId) {  // ← JWTのuserIdとボディのuserIdを照合
  log.warn(routeName, 'User ID mismatch', {
    authenticated: req.user.userId,  // JWTから取得したuserId
    requested: userId                // リクエストボディのuserId
  });
  return res.status(403).json({ ok:false, message:'権限がありません' });
}
```

**照合内容**:
- **JWTトークンのuserId** (req.user.userId): `"user001"`
- **リクエストボディのuserId** (req.body.userId): `"user001"`
- **結果**: 一致 ✓ → 処理を続行

**セキュリティの重要性**:
このチェックにより、ユーザーが他人のuserIdを指定してスコアを不正に保存することを防いでいます。
たとえリクエストボディのuserIdを改ざんしても、JWTトークン（HttpOnlyクッキー）は改ざんできないため、不正なリクエストは拒否されます。

---

### 【ステップ11】Googleスプレッドシートにスコアを保存

**ファイル**: `backend/src/routes/playGame.js:270-316`

```javascript
const scoreValue = Number(scores);

const sheets = await getSheetsClient(false);

// 次の score_id を決定
const s = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${SCORES_SHEET}!A1:F`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const sRows = s.data.values || [];

let nextId = 1;
if (sRows.length >= 2) {
  const ids = sRows.slice(1).map(r => Number(r[0]||0)).filter(n=>Number.isFinite(n));
  if (ids.length) nextId = Math.max(...ids)+1;
}

// clear を boolean として処理
const clearValue = clear === true || clear === 'true' || clear === 1 || clear === '1';
const row = [
  String(nextId),
  String(userId),    // ← リクエストボディから取得したuserId（照合済み）
  String(part_id),
  scoreValue,
  clearValue,
  nowTS()
];

log.info(routeName, 'Appending score row', { row });

await sheets.spreadsheets.values.append({
  spreadsheetId: SPREADSHEET_ID,
  range: `${SCORES_SHEET}!A:F`,
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: [row] },
});
```

**保存されるデータ**:
| score_id | user_id | part_id | scores | clear | play_date |
|----------|---------|---------|--------|-------|-----------|
| 123 | user001 | part_1_1_1 | 12 | TRUE | 2025/11/03 10:30:45 |

---

## 重要なセキュリティポイント

### 1. 二重チェックメカニズム

userIdは2つの独立した経路で送信され、バックエンドで照合されます：

| 経路 | 保存場所 | 送信方法 | 改ざん可能性 | 用途 |
|------|---------|---------|------------|------|
| **経路1** | localStorage | リクエストボディ | ⚠️ 容易に改ざん可能 | スコア保存先の指定 |
| **経路2** | HttpOnly Cookie | Cookie ヘッダー | ✅ 改ざん困難（JWT署名） | 認証・本人確認 |

**照合ロジック**:
```javascript
if (req.user.userId !== userId) {
  return res.status(403).json({ ok:false, message:'権限がありません' });
}
```

### 2. なぜlocalStorageのuserIdを使用するのか？

localStorageのuserIdは改ざん可能ですが、以下の理由で問題ありません：

1. **JWTで本人確認**: バックエンドは必ずJWTトークンのuserIdと照合するため、他人のuserIdを指定しても拒否される
2. **UXの向上**: フロントエンドでユーザー情報（名前、進捗など）を表示するために必要
3. **API設計の一貫性**: リクエストボディで明示的にuserIdを指定することで、APIの意図が明確になる

### 3. JWTトークンの役割

**保存場所**: HttpOnlyクッキー（`authToken`）

**特徴**:
- JavaScriptからアクセス不可 → XSS攻撃から保護
- 署名付き → 改ざんを検知可能
- 有効期限付き → 24時間後に自動失効

**セキュリティ**:
```javascript
// フロントエンドでは取得不可
console.log(document.cookie); // authTokenは表示されない

// バックエンドでのみ検証可能
const decoded = jwt.verify(token, JWT_SECRET);
```

---

## まとめ

### userIdの起源

**最終的な答え**:
**playGame.jsで保存されるuserIdは、ユーザーがログインフォームに入力したIDです。**

### 完全なトレース

1. **入力**: ユーザーがログインフォームでuserIdを入力
2. **検証**: バックエンドがGoogleスプレッドシートの'users'シートでuserIdを検証
3. **トークン化**: 検証済みのuserIdをJWTトークンのペイロードに含める
4. **保存**: フロントエンドがlocalStorageとCookie（JWT）の両方にuserIdを保存
5. **取得**: ゲーム終了時にlocalStorageからuserIdを取得
6. **送信**: リクエストボディとCookieの両方でuserIdを送信
7. **照合**: バックエンドがJWTのuserIdとリクエストボディのuserIdを照合
8. **保存**: 照合に成功したらGoogleスプレッドシートの'scores'シートにスコアを保存

### データの流れ図

```
┌──────────────────┐
│ ユーザー入力      │
│ "user001"        │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────┐
│ Googleスプレッドシート         │
│ 'users'シート                 │
│ ┌────┬─────────┬──────┐     │
│ │ id │ user_id │ ... │     │
│ ├────┼─────────┼──────┤     │
│ │ 1  │ user001 │ ... │ ← 検証 │
│ └────┴─────────┴──────┘     │
└──────────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ JWTトークン生成               │
│ ┌──────────────────────────┐ │
│ │ Payload:                 │ │
│ │ {                        │ │
│ │   "userId": "user001" ←─┼─┼─── ここに含まれる
│ │   ...                    │ │
│ │ }                        │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
         │
         ↓
┌─────────────────────┐
│ ブラウザに保存       │
│ ┌─────────────────┐ │
│ │ localStorage:   │ │
│ │ userId: "user001"│ ←─── フロントエンドでアクセス可能
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Cookie:         │ │
│ │ authToken: JWT  │ ←─── JavaScriptからアクセス不可
│ └─────────────────┘ │
└─────────────────────┘
         │
         ↓
     (ゲームプレイ)
         │
         ↓
┌─────────────────────────────┐
│ スコア送信                   │
│ ┌─────────────────────────┐ │
│ │ Request Body:           │ │
│ │ { "userId": "user001" } │ ←─ localStorageから
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Cookie:                 │ │
│ │ authToken: JWT          │ ←─ 自動送信
│ └─────────────────────────┘ │
└─────────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ バックエンドで照合               │
│ req.user.userId === req.body.userId? │
│    "user001"    ===   "user001"  │
│         ✓ 一致                   │
└───────────────┬─────────────────┘
                │
                ↓
┌──────────────────────────────────┐
│ Googleスプレッドシートに保存      │
│ 'scores'シート                   │
│ ┌───┬─────────┬──────┬───┬─────┐│
│ │ id│ user_id │ part │...│ ... ││
│ ├───┼─────────┼──────┼───┼─────┤│
│ │123│ user001 │ ... │...│ ... ││ ← 新規追加
│ └───┴─────────┴──────┴───┴─────┘│
└──────────────────────────────────┘
```

---

## 関連ファイル一覧

| ファイル | 役割 | userIDの処理 |
|---------|------|-------------|
| `frontend/src/pages/LoginPage.tsx` | ログイン画面 | ユーザー入力を受け取り、APIに送信、localStorageに保存 |
| `backend/src/routes/logInPage.js` | ログインAPI | スプレッドシートで検証、JWTトークン生成、Cookieに設定 |
| `backend/src/middleware/auth.js` | 認証ミドルウェア | JWTトークンを検証し、req.userに設定 |
| `frontend/src/pages/PlayPage.tsx` | ゲームプレイ画面 | localStorageから取得し、スコアAPIに送信 |
| `backend/src/routes/playGame.js` | ゲームAPI | JWTとリクエストのuserIdを照合し、スプレッドシートに保存 |

---

## 結論

playGame.jsで保存されるuserIdは、最終的にはユーザーがログインフォームに入力したものです。

しかし、セキュリティを担保するため、以下の経路を辿ります：

1. **ユーザー入力** → ログインフォーム
2. **検証** → Googleスプレッドシート（'users'シート）
3. **トークン化** → JWT（HttpOnlyクッキー）
4. **ローカル保存** → localStorage
5. **送信** → リクエストボディ + Cookie
6. **照合** → バックエンドでJWTとリクエストボディのuserIdを照合
7. **保存** → Googleスプレッドシート（'scores'シート）

この設計により、たとえフロントエンドでuserIdを改ざんしても、JWTトークンの検証により不正なリクエストは拒否されます。
