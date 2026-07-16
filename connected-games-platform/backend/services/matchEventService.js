const { query } = require('../db');
const { linkMatchToActiveTournament } = require('./tournamentService');
const { updateActuators } = require('./actuatorService');
const { winnerFromScores } = require('../utils/accessRules');

const matchSelect = `SELECT m.*,g.name AS game_name,g.type AS game_type,g.game_type_id,l.name AS locale_name,l.city AS locale_city
  FROM matches m JOIN games g ON g.id=m.game_id JOIN locales l ON l.id=m.locale_id`;
class AppError extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function getMatchRow(id){const rows=await query(`${matchSelect} WHERE m.id=?`,[id]);return rows[0];}
async function getMatchEvents(id){return query('SELECT * FROM match_events WHERE match_id=? ORDER BY id',[id]);}
function validateEventPayload(p){if(!p?.match_id)throw new AppError('match_id obbligatorio');if(!p?.event_type)throw new AppError('event_type obbligatorio');}
function toMysqlDateTime(v){if(!v)return null;const d=new Date(v);if(Number.isNaN(d.getTime()))return null;return d.toISOString().slice(0,19).replace('T',' ');}
async function updateDeviceSeen(id){if(id)await query(`UPDATE edge_devices SET status='ONLINE',last_seen=CURRENT_TIMESTAMP,last_sync=CURRENT_TIMESTAMP WHERE id=?`,[id]);}
function validatePayload(p,m){if(p.game_id&&Number(p.game_id)!==Number(m.game_id))throw new AppError('game_id non corrisponde');if(p.locale_id&&Number(p.locale_id)!==Number(m.locale_id))throw new AppError('locale_id non corrisponde');}

async function processMatchEvent(payload){
  validateEventPayload(payload);
  if(payload.event_uuid){const ex=await query('SELECT id FROM match_events WHERE event_uuid=?',[payload.event_uuid]);if(ex.length)return {match:await getMatchRow(payload.match_id),events:await getMatchEvents(payload.match_id),duplicate:true};}
  let match=await getMatchRow(payload.match_id);if(!match)throw new AppError('Partita non trovata',404);validatePayload(payload,match);await updateDeviceSeen(payload.device_id);
  if(match.status!=='LIVE'){
    if(payload.event_type==='MATCH_END')return {match,events:await getMatchEvents(payload.match_id),alreadyFinished:true};
    throw new AppError('Le partite concluse non possono ricevere eventi');
  }
  let playerName=payload.player_name||null;let description=payload.description||payload.event_type;
  if(payload.event_type==='MATCH_START'){description=payload.description||'Partita iniziata';await updateActuators(match,'START');}
  if(payload.event_type==='GOAL_PLAYER_1'){
    playerName=payload.player_name||match.player1_name;description=payload.description||`Punto di ${match.player1_name}`;
    await query('UPDATE matches SET score1=score1+1 WHERE id=?',[match.id]);match=await getMatchRow(match.id);await updateActuators(match,'SCORE');
  }
  if(payload.event_type==='GOAL_PLAYER_2'){
    playerName=payload.player_name||match.player2_name;description=payload.description||`Punto di ${match.player2_name}`;
    await query('UPDATE matches SET score2=score2+1 WHERE id=?',[match.id]);match=await getMatchRow(match.id);await updateActuators(match,'SCORE');
  }
  if(payload.event_type==='MATCH_END'){
    match=await getMatchRow(match.id);const winner=winnerFromScores(match);description=payload.description||`Partita terminata. Vincitore: ${winner}`;
    await query(`UPDATE matches SET status='FINISHED',winner_name=?,ended_at=CURRENT_TIMESTAMP WHERE id=?`,[winner,match.id]);
    await query(`UPDATE games SET status='ONLINE' WHERE id=?`,[match.game_id]);match=await getMatchRow(match.id);await updateActuators(match,'END');await linkMatchToActiveTournament(match.id);
  }
  await query(`INSERT INTO match_events (match_id,event_uuid,event_type,player_name,description,sync_status,created_at,received_at)
    VALUES (?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),CURRENT_TIMESTAMP)`,[match.id,payload.event_uuid||null,payload.event_type,playerName,description,payload.sync_status||'SYNCED',toMysqlDateTime(payload.created_at)]);
  return {match:await getMatchRow(match.id),events:await getMatchEvents(match.id)};
}
module.exports={AppError,getMatchRow,getMatchEvents,matchSelect,processMatchEvent};
