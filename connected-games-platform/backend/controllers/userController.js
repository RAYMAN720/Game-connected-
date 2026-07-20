const { query } = require('../db');
const { hashPassword } = require('../utils/password');

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role, locale_id: user.locale_id };
}
async function usernameExists(username) {
  const rows = await query('SELECT id FROM users WHERE username = ?', [username]);
  return rows.length > 0;
}
async function createUser(role, username, password, localeId) {
  const result = await query('INSERT INTO users (username,password,password_hash,role,locale_id) VALUES (?,NULL,?,?,?)', [username, hashPassword(password), role, localeId || null]);
  const rows = await query('SELECT id,username,role,locale_id FROM users WHERE id=?', [result.insertId]);
  return rows[0];
}

async function getUsers(req, res, next) {
  try {
    if (req.user.role === 'PLATFORM_ADMIN') {
      return res.json(await query(`SELECT u.id,u.username,u.role,u.locale_id,l.name AS locale_name FROM users u LEFT JOIN locales l ON l.id=u.locale_id ORDER BY u.role,u.username`));
    }
    if (req.user.role === 'LOCAL_ADMIN') {
      return res.json(await query(`SELECT u.id,u.username,u.role,u.locale_id,l.name AS locale_name FROM users u LEFT JOIN locales l ON l.id=u.locale_id WHERE u.locale_id=? AND u.role='CLIENT' ORDER BY u.username`, [req.user.locale_id]));
    }
    if (req.user.role === 'GAME_ADMIN') return res.json([publicUser(req.user)]);
    return res.status(403).json({ message: 'Operazione non consentita' });
  } catch (error) { return next(error); }
}

async function createLocalAdmin(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') return res.status(403).json({ message: 'Solo amministratore piattaforma' });
    const { username, password, locale_id } = req.body;
    if (!username || !password || !locale_id) return res.status(400).json({ message: 'Username, password e locale obbligatori' });
    if (await usernameExists(username)) return res.status(409).json({ message: 'Username gia esistente' });
    return res.status(201).json(await createUser('LOCAL_ADMIN', username, password, locale_id));
  } catch (error) { return next(error); }
}

async function createGameAdmin(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') return res.status(403).json({ message: 'Solo amministratore piattaforma' });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username e password obbligatori' });
    if (await usernameExists(username)) return res.status(409).json({ message: 'Username gia esistente' });
    return res.status(201).json(await createUser('GAME_ADMIN', username, password, null));
  } catch (error) { return next(error); }
}

async function createClient(req, res, next) {
  try {
    if (!['LOCAL_ADMIN','PLATFORM_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Solo amministratori' });
    const { username, password } = req.body;
    const localeId = req.user.role === 'LOCAL_ADMIN' ? req.user.locale_id : req.body.locale_id;
    if (!username || !password || !localeId) return res.status(400).json({ message: 'Username, password e locale obbligatori' });
    if (await usernameExists(username)) return res.status(409).json({ message: 'Username gia esistente' });
    return res.status(201).json(await createUser('CLIENT', username, password, localeId));
  } catch (error) { return next(error); }
}

async function updateUser(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') return res.status(403).json({ message: 'Solo amministratore piattaforma' });
    const { username, role, locale_id } = req.body;
    if (!username || !['PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN','CLIENT'].includes(role)) return res.status(400).json({ message: 'Dati utente non validi' });
    const result = await query('UPDATE users SET username=?, role=?, locale_id=? WHERE id=?', [username, role, locale_id || null, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Utente non trovato' });
    const rows = await query('SELECT id,username,role,locale_id FROM users WHERE id=?', [req.params.id]);
    return res.json(rows[0]);
  } catch (error) { return next(error); }
}

async function deleteUser(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') return res.status(403).json({ message: 'Solo amministratore piattaforma' });
    if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ message: 'Non puoi eliminare il tuo account' });
    const result = await query('DELETE FROM users WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Utente non trovato' });
    return res.json({ message: 'Utente eliminato' });
  } catch (error) { return next(error); }
}

module.exports = { getUsers, createLocalAdmin, createGameAdmin, createClient, updateUser, deleteUser };
