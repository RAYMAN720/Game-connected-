const { query } = require('../db');

async function requireAuth(req, res, next) {
  try {
    const sessionId = req.header('x-session-id');
    const userId = req.header('x-user-id');

    if (sessionId) {
      const sessions = await query(
        `SELECT users.id, users.username, users.role, users.locale_id
         FROM user_sessions
         JOIN users ON users.id = user_sessions.user_id
         WHERE user_sessions.session_id = ?
           AND user_sessions.expires_at > NOW()`,
        [sessionId]
      );

      if (!sessions.length) {
        return res.status(401).json({ message: 'Sessione non valida o scaduta' });
      }

      await query('UPDATE user_sessions SET last_seen = NOW() WHERE session_id = ?', [sessionId]);
      req.user = sessions[0];
      return next();
    }

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
