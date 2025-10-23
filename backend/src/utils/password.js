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

module.exports = {
  hashPassword,
  verifyPassword,
  isPasswordHashed,
};
