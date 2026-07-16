const { query } = require('../db');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Nome utente e password sono obbligatori' });
    }

    const users = await query(
      'SELECT id, username, role, locale_id FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    if (!users.length) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    return res.json(users[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login
};
