const { query } = require('../db');
const { linkMatchToActiveTournament } = require('./tournamentService');
const { updateActuators } = require('./actuatorService');
const { winnerFromScores } = require('../utils/accessRules');
const {
  normalizeGameRules,
  eventAction,
  scoreValue,
  reachedScoreLimit
} = require('../utils/gameRules');

const matchSelect = `SELECT m.*,g.name AS game_name,g.type AS game_type,g.game_type_id,
  l.name AS locale_name,l.city AS locale_city,
  gt.start_event,gt.score_event_player1,gt.score_event_player2,gt.end_event,gt.score_limit,gt.supports_teams
  FROM matches m
  JOIN games g ON g.id=m.game_id
  JOIN locales l ON l.id=m.locale_id
  LEFT JOIN game_types gt ON gt.id=g.game_type_id`;

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function getMatchRow(id) {
  const rows = await query(`${matchSelect} WHERE m.id=?`, [id]);
  return rows[0];
}

async function getMatchEvents(id) {
  return query('SELECT * FROM match_events WHERE match_id=? ORDER BY id', [id]);
}

function validateEventPayload(payload) {
  if (!payload?.match_id) throw new AppError('match_id obbligatorio');
  if (!payload?.event_type) throw new AppError('event_type obbligatorio');
}

function toMysqlDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function updateDeviceSeen(id) {
  if (!id) return;
  await query(
    `UPDATE edge_devices
     SET status='ONLINE',last_seen=CURRENT_TIMESTAMP,last_sync=CURRENT_TIMESTAMP
     WHERE id=?`,
    [id]
  );
}

function validatePayload(payload, match) {
  if (payload.game_id && Number(payload.game_id) !== Number(match.game_id)) {
    throw new AppError('game_id non corrisponde');
  }
  if (payload.locale_id && Number(payload.locale_id) !== Number(match.locale_id)) {
    throw new AppError('locale_id non corrisponde');
  }
}

async function saveEvent(match, payload, playerName, description, value = null, eventType = payload.event_type, eventUuid = payload.event_uuid || null) {
  const metadata = {
    device_id: payload.device_id || null,
    game_id: payload.game_id || match.game_id,
    locale_id: payload.locale_id || match.locale_id,
    source: payload.source || 'EDGE'
  };

  await query(
    `INSERT INTO match_events
     (match_id,event_uuid,event_type,player_name,description,event_value,payload_json,sync_status,created_at,received_at)
     VALUES (?,?,?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),CURRENT_TIMESTAMP)`,
    [
      match.id,
      eventUuid,
      eventType,
      playerName,
      description,
      value,
      JSON.stringify(metadata),
      payload.sync_status || 'SYNCED',
      toMysqlDateTime(payload.created_at)
    ]
  );
}

async function finishMatch(match, description) {
  const fresh = await getMatchRow(match.id);
  if (fresh.status === 'FINISHED') return fresh;

  const winner = winnerFromScores(fresh);
  await query(
    `UPDATE matches
     SET status='FINISHED',winner_name=?,ended_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    [winner, fresh.id]
  );
  await query(`UPDATE games SET status='ONLINE' WHERE id=?`, [fresh.game_id]);

  const finished = await getMatchRow(fresh.id);
  await updateActuators(finished, 'END');
  await linkMatchToActiveTournament(finished.id);
  return { ...finished, finish_description: description || `Partita terminata. Vincitore: ${winner}` };
}

async function processMatchEvent(payload) {
  validateEventPayload(payload);

  if (payload.event_uuid) {
    const existing = await query('SELECT id FROM match_events WHERE event_uuid=?', [payload.event_uuid]);
    if (existing.length) {
      return {
        match: await getMatchRow(payload.match_id),
        events: await getMatchEvents(payload.match_id),
        duplicate: true
      };
    }
  }

  let match = await getMatchRow(payload.match_id);
  if (!match) throw new AppError('Partita non trovata', 404);

  validatePayload(payload, match);
  await updateDeviceSeen(payload.device_id);

  const rules = normalizeGameRules(match);
  const action = eventAction(payload.event_type, rules);

  if (match.status !== 'LIVE') {
    if (action === 'END') {
      return {
        match,
        events: await getMatchEvents(payload.match_id),
        alreadyFinished: true
      };
    }
    throw new AppError('Le partite concluse non possono ricevere eventi');
  }

  if (action === 'GENERIC') {
    const configured = await query(
      `SELECT COUNT(*) AS total
       FROM sensors
       WHERE game_id=? AND sensor_type=? AND status='ACTIVE'`,
      [match.game_id, payload.event_type]
    );
    if (Number(configured[0].total) === 0) {
      throw new AppError('Evento non configurato per questo gioco');
    }
  }

  let playerName = payload.player_name || null;
  let description = payload.description || payload.event_type;
  let value = null;

  if (action === 'START') {
    description = payload.description || 'Partita iniziata';
    await updateActuators(match, 'START');
  }

  if (action === 'SCORE_PLAYER_1' || action === 'SCORE_PLAYER_2') {
    const firstPlayer = action === 'SCORE_PLAYER_1';
    value = scoreValue(payload);
    playerName = payload.player_name || (firstPlayer ? match.player1_name : match.player2_name);
    description = payload.description || `${value} punti per ${playerName}`;

    const column = firstPlayer ? 'score1' : 'score2';
    await query(`UPDATE matches SET ${column}=${column}+? WHERE id=?`, [value, match.id]);
    match = await getMatchRow(match.id);
    await updateActuators(match, 'SCORE');
  }

  if (action === 'END') {
    match = await finishMatch(match);
    description = payload.description || match.finish_description;
  }

  await saveEvent(match, payload, playerName, description, value);

  if ((action === 'SCORE_PLAYER_1' || action === 'SCORE_PLAYER_2') && reachedScoreLimit(match, rules)) {
    const winner = winnerFromScores(match);
    const autoDescription = `Limite di ${rules.scoreLimit} raggiunto. Vincitore: ${winner}`;
    match = await finishMatch(match, autoDescription);
    await saveEvent(
      match,
      { ...payload, sync_status: payload.sync_status || 'SYNCED' },
      null,
      autoDescription,
      null,
      rules.endEvent,
      payload.event_uuid ? `${payload.event_uuid}-auto-end` : null
    );
  }

  return {
    match: await getMatchRow(match.id),
    events: await getMatchEvents(match.id)
  };
}

module.exports = {
  AppError,
  getMatchRow,
  getMatchEvents,
  matchSelect,
  processMatchEvent
};
