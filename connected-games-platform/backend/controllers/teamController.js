const { query } = require('../db');

async function getTeams(req, res, next) {
  try {
    let where = '';
    let params = [];
    if (req.user.role === 'LOCAL_ADMIN') { where = 'WHERE t.locale_id=? OR t.locale_id IS NULL'; params=[req.user.locale_id]; }
    const rows = await query(`
      SELECT t.*,l.name AS locale_name,
        GROUP_CONCAT(u.username ORDER BY u.username SEPARATOR ', ') AS members
      FROM teams t
      LEFT JOIN locales l ON l.id=t.locale_id
      LEFT JOIN team_members tm ON tm.team_id=t.id
      LEFT JOIN users u ON u.id=tm.user_id
      ${where}
      GROUP BY t.id ORDER BY t.name`, params);
    return res.json(rows);
  } catch (error) { return next(error); }
}

async function createTeam(req, res, next) {
  try {
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Solo amministratori possono creare squadre' });
    const localeId = req.user.role === 'LOCAL_ADMIN' ? req.user.locale_id : (req.body.locale_id || null);
    if (!req.body.name) return res.status(400).json({ message: 'Nome squadra obbligatorio' });
    const result = await query('INSERT INTO teams (name,locale_id) VALUES (?,?)', [req.body.name,localeId]);
    const memberIds = Array.isArray(req.body.member_ids) ? req.body.member_ids : [];
    for (const userId of memberIds) {
      await query(`INSERT IGNORE INTO team_members (team_id,user_id)
        SELECT ?,id FROM users WHERE id=? AND role='CLIENT' AND (? IS NULL OR locale_id=?)`, [result.insertId,userId,localeId,localeId]);
    }
    const rows = await query('SELECT * FROM teams WHERE id=?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function addTeamMember(req, res, next) {
  try {
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Solo amministratori' });
    const teams = await query('SELECT * FROM teams WHERE id=?', [req.params.id]);
    if (!teams.length) return res.status(404).json({ message: 'Squadra non trovata' });
    if (req.user.role === 'LOCAL_ADMIN' && Number(teams[0].locale_id) !== Number(req.user.locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    const users = await query(`SELECT * FROM users WHERE id=? AND role='CLIENT'`, [req.body.user_id]);
    if (!users.length) return res.status(404).json({ message: 'Giocatore client non trovato' });
    if (teams[0].locale_id && Number(users[0].locale_id) !== Number(teams[0].locale_id)) return res.status(400).json({ message: 'Giocatore e squadra devono essere dello stesso locale' });
    await query('INSERT IGNORE INTO team_members (team_id,user_id) VALUES (?,?)', [req.params.id,req.body.user_id]);
    return res.status(201).json({ message: 'Giocatore aggiunto alla squadra' });
  } catch (error) { return next(error); }
}

async function removeTeamMember(req, res, next) {
  try {
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Solo amministratori' });
    const teams = await query('SELECT * FROM teams WHERE id=?', [req.params.id]);
    if (!teams.length) return res.status(404).json({ message: 'Squadra non trovata' });
    if (req.user.role === 'LOCAL_ADMIN' && Number(teams[0].locale_id) !== Number(req.user.locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    await query('DELETE FROM team_members WHERE team_id=? AND user_id=?', [req.params.id,req.params.userId]);
    return res.json({ message: 'Giocatore rimosso' });
  } catch (error) { return next(error); }
}

async function deleteTeam(req, res, next) {
  try {
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Solo amministratori' });
    const teams = await query('SELECT * FROM teams WHERE id=?', [req.params.id]);
    if (!teams.length) return res.status(404).json({ message: 'Squadra non trovata' });
    if (req.user.role === 'LOCAL_ADMIN' && Number(teams[0].locale_id) !== Number(req.user.locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    await query('DELETE FROM teams WHERE id=?', [req.params.id]);
    return res.json({ message: 'Squadra eliminata' });
  } catch (error) { return next(error); }
}

module.exports = { getTeams, createTeam, addTeamMember, removeTeamMember, deleteTeam };
