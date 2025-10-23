# パスワードセキュリティ

このドキュメントでは、パスワードのセキュアな保存方法について説明します。

## 概要

このアプリケーションでは、パスワードを平文で保存せず、bcryptを使用してハッシュ化して保存します。

## bcryptとは

bcryptは、パスワードハッシュ化のためのアルゴリズムです。以下の特徴があります：

- **ソルト付きハッシュ**: レインボーテーブル攻撃を防ぐため、各パスワードに一意のソルトを追加
- **コスト係数**: 計算コストを調整可能で、将来的にハードウェアが高速化してもセキュリティを維持可能
- **一方向関数**: ハッシュからパスワードを復元することは計算上困難

## 実装内容

### 1. パスワードハッシュ化ユーティリティ

`backend/src/utils/password.js` にパスワード関連の関数を実装しています：

```javascript
const { hashPassword, verifyPassword, isPasswordHashed } = require('./utils/password');

// パスワードをハッシュ化
const hashed = await hashPassword('mypassword');

// パスワードを検証
const isValid = await verifyPassword('mypassword', hashed);

// ハッシュ化されているかチェック
const isHashed = isPasswordHashed(hashed);
```

### 2. ログイン処理

`backend/src/routes/logInPage.js` のログイン処理では：

- ハッシュ化されたパスワードの場合：bcryptで検証
- 平文パスワードの場合（後方互換性）：直接比較（警告ログ出力）

### 3. 既存パスワードの移行

既存の平文パスワードをハッシュ化するためのスクリプトを用意しています。

## パスワードのハッシュ化方法

### 既存パスワードの一括ハッシュ化

以下のコマンドを実行して、Google Sheets内の全ユーザーの平文パスワードをハッシュ化します：

```bash
cd backend
node scripts/hashPasswords.js
```

このスクリプトは：

1. Google Sheetsから全ユーザーを取得
2. 平文パスワードを検出（bcryptハッシュ形式でないもの）
3. bcryptでハッシュ化（ソルトラウンド: 10）
4. Google Sheetsに更新

**注意事項:**

- このスクリプトは本番環境で実行する前に、必ずバックアップを取得してください
- スクリプト実行後、ユーザーは同じパスワードでログイン可能です
- すでにハッシュ化されているパスワードはスキップされます

### 新規ユーザー作成時

将来的にユーザー登録機能を実装する場合、以下のようにパスワードをハッシュ化してください：

```javascript
const { hashPassword } = require('../utils/password');

// ユーザー登録処理
async function registerUser(userId, plainPassword, nickname) {
  // パスワードをハッシュ化
  const hashedPassword = await hashPassword(plainPassword);

  // Google Sheetsに保存
  // ...（hashedPasswordを保存）
}
```

## セキュリティ推奨事項

1. **平文パスワードは絶対に保存しない**: 必ずハッシュ化してから保存
2. **定期的な監査**: 平文パスワードが残っていないか定期的にチェック
3. **パスワードポリシー**:
   - 最低8文字以上
   - 英数字と記号の組み合わせ
   - 辞書にある単語は避ける
4. **二要素認証**: 可能であれば2FAの導入を検討

## トラブルシューティング

### ログイン時に「plain-text password detected」警告が出る

これは、Google Sheetsに平文パスワードが残っていることを示しています。`hashPasswords.js` スクリプトを実行してパスワードをハッシュ化してください。

### ハッシュ化後、ログインできなくなった

- スプレッドシートのpassword列に正しくハッシュが保存されているか確認
- ハッシュは `$2a$` または `$2b$` で始まる長い文字列（約60文字）
- 万が一の場合は、バックアップから復元してください

## 参考リンク

- [bcrypt npm package](https://www.npmjs.com/package/bcrypt)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
