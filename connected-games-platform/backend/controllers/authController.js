const crypto = require('crypto');
const { query } = require('../db');
const { verifyPassword } = require('../utils/password');

function createSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Nome utente e password sono obbligatori' });
    }

    const users = await query(
      'SELECT id, username, password, password_hash, role, locale_id FROM users WHERE username = ?',
      [username]
    );

    if (!users.length || !verifyPassword(password, users[0].password_hash, users[0].password)) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    const { password: _password, password_hash: _passwordHash, ...publicUser } = users[0];
    const sessionId = createSessionId();
    await query(
      `INSERT INTO user_sessions (session_id, user_id, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))`,
      [sessionId, publicUser.id]
    );

    return res.json({ ...publicUser, session_id: sessionId });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const sessionId = req.header('x-session-id');
    if (sessionId) {
      await query('DELETE FROM user_sessions WHERE session_id = ?', [sessionId]);
    }
    return res.json({ message: 'Sessione chiusa' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  logout
};
