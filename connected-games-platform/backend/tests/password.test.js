const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../utils/password');

test('password helper verifies pbkdf2 hashes and rejects wrong passwords', () => {
  const hash = hashPassword('secret123');

  assert.equal(hash.startsWith('pbkdf2$'), true);
  assert.equal(verifyPassword('secret123', hash), true);
  assert.equal(verifyPassword('wrong', hash), false);
});

test('password helper keeps legacy demo passwords compatible during migration', () => {
  assert.equal(verifyPassword('legacy123', null, 'legacy123'), true);
  assert.equal(verifyPassword('wrong', null, 'legacy123'), false);
});
