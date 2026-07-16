const { query } = require('../db');

async function requireAuth(req, res, next) {
  try {
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ message: 'Autenticazione obbligatoria' });
    }

    const users = await query(
      'SELECT id, username, role, locale_id FROM users WHERE id = ?',
      [userId]
    );

    if (!users.length) {
      return res.status(401).json({ message: 'Utente non valido' });
    }

    req.user = users[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Operazione non consentita per questo ruolo' });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
