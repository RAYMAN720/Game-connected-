const { query } = require('../db');
const { canManageCatalog } = require('../utils/accessRules');
const { validateGameTypeInput } = require('../utils/validationRules');

async function getGameTypes(req, res, next) {
  try {
    const rows = await query(`
      SELECT gt.*, COUNT(st.id) AS sensor_templates_count
      FROM game_types gt
      LEFT JOIN sensor_templates st ON st.game_type_id = gt.id
      GROUP BY gt.id
      ORDER BY gt.name
    `);
    return res.json(rows);
  } catch (error) { return next(error); }
}

async function getGameTypeById(req, res, next) {
  try {
    const rows = await query('SELECT * FROM game_types WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Tipo di gioco non trovato' });
    const templates = await query('SELECT * FROM sensor_templates WHERE game_type_id = ? ORDER BY id', [req.params.id]);
    return res.json({ ...rows[0], sensor_templates: templates });
  } catch (error) { return next(error); }
}

async function createGameType(req, res, next) {
  try {
    if (!canManageCatalog(req.user)) return res.status(403).json({ message: 'Solo amministratore gioco o piattaforma' });
    const errors = validateGameTypeInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('. ') });
    const { name, description, start_event, score_event_player1, score_event_player2, end_event, score_limit, supports_teams } = req.body;
    const result = await query(
      `INSERT INTO game_types
       (name, description, start_event, score_event_player1, score_event_player2, end_event, score_limit, supports_teams)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description.trim(), start_event || 'MATCH_START', score_event_player1 || 'GOAL_PLAYER_1', score_event_player2 || 'GOAL_PLAYER_2', end_event || 'MATCH_END', score_limit || null, supports_teams === false ? 0 : 1]
    );
    const rows = await query('SELECT * FROM game_types WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function updateGameType(req, res, next) {
  try {
    if (!canManageCatalog(req.user)) return res.status(403).json({ message: 'Solo amministratore gioco o piattaforma' });
    const errors = validateGameTypeInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('. ') });
    const { name, description, start_event, score_event_player1, score_event_player2, end_event, score_limit, supports_teams } = req.body;
    const result = await query(
      `UPDATE game_types SET name=?, description=?, start_event=?, score_event_player1=?, score_event_player2=?, end_event=?, score_limit=?, supports_teams=? WHERE id=?`,
      [name.trim(), description.trim(), start_event || 'MATCH_START', score_event_player1 || 'GOAL_PLAYER_1', score_event_player2 || 'GOAL_PLAYER_2', end_event || 'MATCH_END', score_limit || null, supports_teams === false ? 0 : 1, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Tipo di gioco non trovato' });
    await query('UPDATE games SET type = ? WHERE game_type_id = ?', [name.trim(), req.params.id]);
    const rows = await query('SELECT * FROM game_types WHERE id = ?', [req.params.id]);
    return res.json(rows[0]);
  } catch (error) { return next(error); }
}

async function deleteGameType(req, res, next) {
  try {
    if (!canManageCatalog(req.user)) return res.status(403).json({ message: 'Solo amministratore gioco o piattaforma' });
    const used = await query('SELECT COUNT(*) AS total FROM games WHERE game_type_id = ?', [req.params.id]);
    if (Number(used[0].total) > 0) return res.status(409).json({ message: 'Il tipo e usato da un gioco e non puo essere eliminato' });
    const result = await query('DELETE FROM game_types WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Tipo di gioco non trovato' });
    return res.json({ message: 'Tipo di gioco eliminato' });
  } catch (error) { return next(error); }
}

async function createSensorTemplate(req, res, next) {
  try {
    if (!canManageCatalog(req.user)) return res.status(403).json({ message: 'Solo amministratore gioco o piattaforma' });
    const { name, event_type, description } = req.body;
    if (!name || !event_type || !description) return res.status(400).json({ message: 'Nome, evento e descrizione sono obbligatori' });
    const result = await query('INSERT INTO sensor_templates (game_type_id, name, event_type, description) VALUES (?, ?, ?, ?)', [req.params.id, name, event_type, description]);
    const rows = await query('SELECT * FROM sensor_templates WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function deleteSensorTemplate(req, res, next) {
  try {
    if (!canManageCatalog(req.user)) return res.status(403).json({ message: 'Solo amministratore gioco o piattaforma' });
    const result = await query('DELETE FROM sensor_templates WHERE id = ? AND game_type_id = ?', [req.params.templateId, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Modello sensore non trovato' });
    return res.json({ message: 'Modello sensore eliminato' });
  } catch (error) { return next(error); }
}

module.exports = { getGameTypes, getGameTypeById, createGameType, updateGameType, deleteGameType, createSensorTemplate, deleteSensorTemplate };
