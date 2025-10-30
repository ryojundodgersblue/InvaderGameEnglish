// backend/src/utils/password.js
// パスワードハッシュ化のためのユーティリティ関数

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * パスワードをハッシュ化する
 * @param {string} plainPassword - 平文パスワード
 * @returns {Promise<string>} ハッシュ化されたパスワード
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * パスワードを検証する
 * @param {string} plainPassword - 平文パスワード
 * @param {string} hashedPassword - ハッシュ化されたパスワード
 * @returns {Promise<boolean>} パスワードが一致する場合はtrue
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * パスワードがハッシュ化されているかチェックする
 * @param {string} password - パスワード文字列
 * @returns {boolean} ハッシュ化されている場合はtrue
 */
function isPasswordHashed(password) {
  return (
    password.startsWith('$2a$') ||
    password.startsWith('$2b$') ||
    password.startsWith('$2y$')
  );
}

/**
 * ランダムなパスワードを生成する
 * @param {number} length - パスワードの長さ（デフォルト8）
 * @returns {string} 生成されたパスワード（英大文字、小文字、数字を含む）
 */
function generatePassword(length = 8) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = uppercase + lowercase + numbers;

  let password = '';

  // 少なくとも1つずつ大文字、小文字、数字を含める
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  // 残りの文字をランダムに生成
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // シャッフル
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

module.exports = {
  hashPassword,
  verifyPassword,
  isPasswordHashed,
  generatePassword,
};
