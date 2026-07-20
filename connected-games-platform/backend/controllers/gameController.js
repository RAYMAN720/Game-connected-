const { query } = require('../db');

const gameSelect = `
  SELECT g.*, l.name AS locale_name, l.city AS locale_city,
         gt.name AS game_type_name, gt.description AS game_type_description,
         gt.score_limit, gt.supports_teams
  FROM games g
  JOIN locales l ON l.id = g.locale_id
  LEFT JOIN game_types gt ON gt.id = g.game_type_id
`;

async function getGames(req, res, next) {
  try {
    if (['PLATFORM_ADMIN','GAME_ADMIN'].includes(req.user.role)) return res.json(await query(`${gameSelect} ORDER BY g.id`));
    if (req.user.role === 'LOCAL_ADMIN') return res.json(await query(`${gameSelect} WHERE g.locale_id=? ORDER BY g.id`, [req.user.locale_id]));
    return res.json(await query(`${gameSelect} WHERE g.status <> 'OFFLINE' ORDER BY l.name,g.name`));
  } catch (error) { return next(error); }
}

async function resolveGameType(gameTypeId, typeName) {
  if (gameTypeId) {
    const rows = await query('SELECT * FROM game_types WHERE id=?', [gameTypeId]);
    return rows[0] || null;
  }
  if (typeName) {
    const rows = await query('SELECT * FROM game_types WHERE name=?', [typeName]);
    return rows[0] || null;
  }
  return null;
}

async function createGame(req, res, next) {
  try {
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Solo amministratori piattaforma o locale' });
    const { name, status } = req.body;
    let localeId = req.body.locale_id;
    if (req.user.role === 'LOCAL_ADMIN') localeId = req.user.locale_id;
    const gameType = await resolveGameType(req.body.game_type_id, req.body.type);
    if (!name || !localeId || !gameType) return res.status(400).json({ message: 'Nome, locale e tipo di gioco valido sono obbligatori' });
    const result = await query('INSERT INTO games (locale_id,game_type_id,name,type,status) VALUES (?,?,?,?,?)', [localeId, gameType.id, name, gameType.name, status || 'ONLINE']);
    const rows = await query(`${gameSelect} WHERE g.id=?`, [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function canManageGame(user, id) {
  const rows = await query('SELECT * FROM games WHERE id=?', [id]);
  if (!rows.length) return { missing: true, allowed: false };
  const game = rows[0];
  const allowed = user.role === 'PLATFORM_ADMIN' || (user.role === 'LOCAL_ADMIN' && Number(user.locale_id) === Number(game.locale_id));
  return { missing: false, allowed, game };
}

async function updateGame(req, res, next) {
  try {
    const access = await canManageGame(req.user, req.params.id);
    if (access.missing) return res.status(404).json({ message: 'Gioco non trovato' });
    if (!access.allowed) return res.status(403).json({ message: 'Non autorizzato' });
    let localeId = req.body.locale_id || access.game.locale_id;
    if (req.user.role === 'LOCAL_ADMIN') localeId = req.user.locale_id;
    const gameType = await resolveGameType(req.body.game_type_id, req.body.type || access.game.type);
    const { name, status } = req.body;
    if (!name || !status || !gameType) return res.status(400).json({ message: 'Nome, tipo e stato obbligatori' });
    await query('UPDATE games SET locale_id=?,game_type_id=?,name=?,type=?,status=? WHERE id=?', [localeId, gameType.id, name, gameType.name, status, req.params.id]);
    const rows = await query(`${gameSelect} WHERE g.id=?`, [req.params.id]);
    return res.json(rows[0]);
  } catch (error) { return next(error); }
}

async function deleteGame(req, res, next) {
  try {
    const access = await canManageGame(req.user, req.params.id);
    if (access.missing) return res.status(404).json({ message: 'Gioco non trovato' });
    if (!access.allowed) return res.status(403).json({ message: 'Non autorizzato' });
    await query('DELETE FROM games WHERE id=?', [req.params.id]);
    return res.json({ message: 'Gioco eliminato' });
  } catch (error) { return next(error); }
}

module.exports = { getGames, createGame, updateGame, deleteGame, gameSelect };
