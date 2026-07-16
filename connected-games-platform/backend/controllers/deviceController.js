const { query } = require('../db');
const { validateSensorInput } = require('../utils/validationRules');

function canViewAll(user) { return ['PLATFORM_ADMIN','GAME_ADMIN'].includes(user.role); }
function canManageLocale(user, localeId) {
  return user.role === 'PLATFORM_ADMIN' || (user.role === 'LOCAL_ADMIN' && Number(user.locale_id) === Number(localeId));
}

async function getDevices(req, res, next) {
  try {
    const sql = `SELECT d.*,l.name AS locale_name,
      (SELECT COUNT(*) FROM sensors s WHERE s.edge_device_id=d.id) AS sensors_count,
      (SELECT COUNT(*) FROM actuators a WHERE a.edge_device_id=d.id) AS actuators_count
      FROM edge_devices d JOIN locales l ON l.id=d.locale_id`;
    if (canViewAll(req.user)) return res.json(await query(`${sql} ORDER BY d.id`));
    if (req.user.role === 'LOCAL_ADMIN') return res.json(await query(`${sql} WHERE d.locale_id=? ORDER BY d.id`, [req.user.locale_id]));
    return res.status(403).json({ message: 'Operazione non consentita' });
  } catch (error) { return next(error); }
}

async function createDevice(req, res, next) {
  try {
    let localeId = req.body.locale_id;
    if (req.user.role === 'LOCAL_ADMIN') localeId = req.user.locale_id;
    if (!canManageLocale(req.user, localeId)) return res.status(403).json({ message: 'Non autorizzato per questo locale' });
    if (!req.body.name || !localeId) return res.status(400).json({ message: 'Nome e locale obbligatori' });
    const result = await query('INSERT INTO edge_devices (locale_id,name,status) VALUES (?,?,?)', [localeId, req.body.name, req.body.status || 'OFFLINE']);
    const rows = await query('SELECT * FROM edge_devices WHERE id=?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function updateDevice(req, res, next) {
  try {
    const rows = await query('SELECT * FROM edge_devices WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Dispositivo non trovato' });
    if (!canManageLocale(req.user, rows[0].locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    const { name, status } = req.body;
    if (!name || !['ONLINE','OFFLINE'].includes(status)) return res.status(400).json({ message: 'Nome e stato validi obbligatori' });
    await query('UPDATE edge_devices SET name=?,status=? WHERE id=?', [name,status,req.params.id]);
    const updated = await query('SELECT * FROM edge_devices WHERE id=?', [req.params.id]);
    return res.json(updated[0]);
  } catch (error) { return next(error); }
}

async function deleteDevice(req, res, next) {
  try {
    const rows = await query('SELECT * FROM edge_devices WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Dispositivo non trovato' });
    if (!canManageLocale(req.user, rows[0].locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    await query('DELETE FROM edge_devices WHERE id=?', [req.params.id]);
    return res.json({ message: 'Dispositivo eliminato' });
  } catch (error) { return next(error); }
}

async function getSensors(req, res, next) {
  try {
    const sql = `SELECT s.*,d.name AS device_name,d.locale_id,g.name AS game_name,g.type AS game_type,l.name AS locale_name
      FROM sensors s JOIN edge_devices d ON d.id=s.edge_device_id JOIN games g ON g.id=s.game_id JOIN locales l ON l.id=d.locale_id`;
    if (canViewAll(req.user)) return res.json(await query(`${sql} ORDER BY s.id`));
    if (req.user.role === 'LOCAL_ADMIN') return res.json(await query(`${sql} WHERE d.locale_id=? ORDER BY s.id`, [req.user.locale_id]));
    return res.status(403).json({ message: 'Operazione non consentita' });
  } catch (error) { return next(error); }
}

async function checkDeviceAndGame(user, deviceId, gameId) {
  const rows = await query(`SELECT d.locale_id AS device_locale,g.locale_id AS game_locale FROM edge_devices d JOIN games g ON g.id=? WHERE d.id=?`, [gameId,deviceId]);
  if (!rows.length) return { ok:false, message:'Dispositivo o gioco non trovato' };
  if (Number(rows[0].device_locale) !== Number(rows[0].game_locale)) return { ok:false, message:'Dispositivo e gioco devono appartenere allo stesso locale' };
  if (user.role === 'LOCAL_ADMIN' && Number(user.locale_id) !== Number(rows[0].device_locale)) return { ok:false, message:'Non autorizzato per questo locale' };
  if (!['PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN'].includes(user.role)) return { ok:false, message:'Non autorizzato' };
  return { ok:true, localeId:rows[0].device_locale };
}

async function createSensor(req, res, next) {
  try {
    const errors = validateSensorInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('. ') });
    const access = await checkDeviceAndGame(req.user, req.body.edge_device_id, req.body.game_id);
    if (!access.ok) return res.status(403).json({ message: access.message });
    const sensorType = req.body.sensor_type || req.body.type;
    const topic = req.body.mqtt_topic || `locales/${access.localeId}/games/${req.body.game_id}/matches/{matchId}/events`;
    const result = await query(`INSERT INTO sensors (edge_device_id,game_id,name,type,sensor_type,mqtt_topic,status) VALUES (?,?,?,?,?,?,?)`, [req.body.edge_device_id,req.body.game_id,req.body.name,sensorType,sensorType,topic,req.body.status || 'ACTIVE']);
    const rows = await query('SELECT * FROM sensors WHERE id=?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function updateSensor(req, res, next) {
  try {
    const current = await query(`SELECT s.*,d.locale_id FROM sensors s JOIN edge_devices d ON d.id=s.edge_device_id WHERE s.id=?`, [req.params.id]);
    if (!current.length) return res.status(404).json({ message: 'Sensore non trovato' });
    if (req.user.role === 'LOCAL_ADMIN' && Number(req.user.locale_id) !== Number(current[0].locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Non autorizzato' });
    const type = req.body.sensor_type || req.body.type;
    if (!req.body.name || !type || !req.body.mqtt_topic || !req.body.status) return res.status(400).json({ message: 'Dati sensore incompleti' });
    await query('UPDATE sensors SET name=?,type=?,sensor_type=?,mqtt_topic=?,status=? WHERE id=?', [req.body.name,type,type,req.body.mqtt_topic,req.body.status,req.params.id]);
    const rows = await query('SELECT * FROM sensors WHERE id=?', [req.params.id]);
    return res.json(rows[0]);
  } catch (error) { return next(error); }
}

async function deleteSensor(req, res, next) {
  try {
    const current = await query(`SELECT s.id,d.locale_id FROM sensors s JOIN edge_devices d ON d.id=s.edge_device_id WHERE s.id=?`, [req.params.id]);
    if (!current.length) return res.status(404).json({ message: 'Sensore non trovato' });
    if (req.user.role === 'LOCAL_ADMIN' && Number(req.user.locale_id) !== Number(current[0].locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Non autorizzato' });
    await query('DELETE FROM sensors WHERE id=?', [req.params.id]);
    return res.json({ message: 'Sensore eliminato' });
  } catch (error) { return next(error); }
}

async function getActuators(req, res, next) {
  try {
    const sql = `SELECT a.*,d.name AS device_name,d.locale_id,g.name AS game_name,l.name AS locale_name
      FROM actuators a JOIN edge_devices d ON d.id=a.edge_device_id JOIN games g ON g.id=a.game_id JOIN locales l ON l.id=d.locale_id`;
    if (canViewAll(req.user)) return res.json(await query(`${sql} ORDER BY a.id`));
    if (req.user.role === 'LOCAL_ADMIN') return res.json(await query(`${sql} WHERE d.locale_id=? ORDER BY a.id`, [req.user.locale_id]));
    return res.status(403).json({ message: 'Operazione non consentita' });
  } catch (error) { return next(error); }
}

async function createActuator(req, res, next) {
  try {
    const access = await checkDeviceAndGame(req.user, req.body.edge_device_id, req.body.game_id);
    if (!access.ok) return res.status(403).json({ message: access.message });
    const { name, actuator_type } = req.body;
    if (!name || !actuator_type) return res.status(400).json({ message: 'Nome e tipo attuatore obbligatori' });
    const topic = req.body.mqtt_topic || `locales/${access.localeId}/games/${req.body.game_id}/actuators/commands`;
    const result = await query('INSERT INTO actuators (edge_device_id,game_id,name,actuator_type,state,mqtt_topic,status) VALUES (?,?,?,?,?,?,?)', [req.body.edge_device_id,req.body.game_id,name,actuator_type,req.body.state || 'IDLE',topic,req.body.status || 'ACTIVE']);
    const rows = await query('SELECT * FROM actuators WHERE id=?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
}

async function setActuatorState(req, res, next) {
  try {
    const rows = await query(`SELECT a.*,d.locale_id FROM actuators a JOIN edge_devices d ON d.id=a.edge_device_id WHERE a.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Attuatore non trovato' });
    if (req.user.role === 'LOCAL_ADMIN' && Number(req.user.locale_id) !== Number(rows[0].locale_id)) return res.status(403).json({ message: 'Non autorizzato' });
    if (!['PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN'].includes(req.user.role)) return res.status(403).json({ message: 'Non autorizzato' });
    if (!req.body.state) return res.status(400).json({ message: 'Stato obbligatorio' });
    await query('UPDATE actuators SET state=? WHERE id=?', [req.body.state,req.params.id]);
    return res.json({ ...rows[0], state:req.body.state });
  } catch (error) { return next(error); }
}

module.exports = { getDevices, createDevice, updateDevice, deleteDevice, getSensors, createSensor, updateSensor, deleteSensor, getActuators, createActuator, setActuatorState };
