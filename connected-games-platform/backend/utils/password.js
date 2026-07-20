const crypto = require('crypto');

const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash, legacyPassword) {
  if (storedHash) {
    const [scheme, iterations, salt, expected] = String(storedHash).split('$');
    if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
    const actual = crypto.pbkdf2Sync(String(password), salt, Number(iterations), KEY_LENGTH, DIGEST).toString('hex');
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  }
  return legacyPassword ? String(password) === String(legacyPassword) : false;
}

module.exports = {
  hashPassword,
  verifyPassword
};
