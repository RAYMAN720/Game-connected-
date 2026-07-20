const { query } = require('../db');

function requireEdgeKey(req, res, next) {
  const expected = process.env.EDGE_SHARED_KEY || 'playconnect-edge-key';
  if (req.header('x-edge-key') !== expected) {
    return res.status(401).json({ message: 'Chiave edge non valida' });
  }
  return next();
}

async function getEdgeGameConfiguration(req, res, next) {
  try {
    const rows = await query(
      `SELECT d.id AS device_id,d.name AS device_name,d.locale_id,d.status AS device_status,
              g.id AS game_id,g.name AS game_name,g.type AS game_type,g.status AS game_status,
              gt.id AS game_type_id,gt.start_event,gt.score_event_player1,
              gt.score_event_player2,gt.end_event,gt.score_limit,gt.supports_teams
       FROM edge_devices d
       JOIN games g ON g.id=? AND g.locale_id=d.locale_id
       LEFT JOIN game_types gt ON gt.id=g.game_type_id
       WHERE d.id=?`,
      [req.params.gameId, req.params.deviceId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Configurazione edge non trovata' });
    }

    const sensors = await query(
      `SELECT id,name,type,sensor_type,mqtt_topic,status
       FROM sensors
       WHERE edge_device_id=? AND game_id=?
       ORDER BY id`,
      [req.params.deviceId, req.params.gameId]
    );

    const actuators = await query(
      `SELECT id,name,actuator_type,state,mqtt_topic,status
       FROM actuators
       WHERE edge_device_id=? AND game_id=?
       ORDER BY id`,
      [req.params.deviceId, req.params.gameId]
    );

    return res.json({ ...rows[0], sensors, actuators });
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireEdgeKey, getEdgeGameConfiguration };
