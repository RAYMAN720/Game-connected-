const { query } = require('../db');
const { verifyPassword } = require('../utils/password');

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
    return res.json(publicUser);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login
};
