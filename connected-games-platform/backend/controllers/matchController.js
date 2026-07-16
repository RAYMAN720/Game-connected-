const { query } = require('../db');
const { startMqttSimulation } = require('../mqttClient');
const { canManageMatch, canViewMatch } = require('../utils/accessRules');
const { validateMatchParticipants } = require('../utils/validationRules');
const { getMatchEvents, getMatchRow, matchSelect, processMatchEvent } = require('../services/matchEventService');

async function clientBelongsToTeam(userId, match) {
  if (match.participant_mode !== 'TEAM') return false;
  const rows = await query(`SELECT 1 FROM team_members WHERE user_id=? AND team_id IN (?,?) LIMIT 1`, [userId,match.team1_id,match.team2_id]);
  return rows.length > 0;
}
async function canUseMatch(user,id){const match=await getMatchRow(id);if(!match)return{missing:true,allowed:false};if(canViewMatch(user,match))return{missing:false,allowed:true,match};if(user.role==='CLIENT'&&await clientBelongsToTeam(user.id,match))return{missing:false,allowed:true,match};return{missing:false,allowed:false,match};}

async function resolveIndividuals(body, localeId) {
  let users=[];
  if(body.player1_id&&body.player2_id){users=await query(`SELECT id,username FROM users WHERE role='CLIENT' AND id IN (?,?) AND locale_id=?`,[body.player1_id,body.player2_id,localeId]);}
  else {users=await query(`SELECT id,username FROM users WHERE role='CLIENT' AND username IN (?,?) AND locale_id=?`,[body.player1_name,body.player2_name,localeId]);}
  if(users.length!==2)return null;
  const first=body.player1_id?users.find(u=>Number(u.id)===Number(body.player1_id)):users.find(u=>u.username===body.player1_name);
  const second=body.player2_id?users.find(u=>Number(u.id)===Number(body.player2_id)):users.find(u=>u.username===body.player2_name);
  return first&&second?{player1_id:first.id,player2_id:second.id,player1_name:first.username,player2_name:second.username}:null;
}
async function resolveTeams(body, localeId) {
  const rows=await query(`SELECT id,name,locale_id FROM teams WHERE id IN (?,?) AND (locale_id=? OR locale_id IS NULL)`,[body.team1_id,body.team2_id,localeId]);
  if(rows.length!==2)return null;const first=rows.find(x=>Number(x.id)===Number(body.team1_id));const second=rows.find(x=>Number(x.id)===Number(body.team2_id));
  return first&&second?{team1_id:first.id,team2_id:second.id,player1_name:first.name,player2_name:second.name}:null;
}

async function startMatch(req,res,next){try{
  if(req.user.role!=='LOCAL_ADMIN')return res.status(403).json({message:'Solo amministratore locale'});
  const errors=validateMatchParticipants(req.body);if(errors.length)return res.status(400).json({message:errors.join('. ')});
  const games=await query(`SELECT g.*,gt.supports_teams FROM games g LEFT JOIN game_types gt ON gt.id=g.game_type_id WHERE g.id=?`,[req.body.game_id]);
  if(!games.length)return res.status(404).json({message:'Gioco non trovato'});const game=games[0];
  if(Number(game.locale_id)!==Number(req.user.locale_id))return res.status(403).json({message:'Gioco di un altro locale'});
  if(game.status!=='ONLINE')return res.status(400).json({message:'Il gioco deve essere ONLINE'});
  const mode=req.body.participant_mode||'INDIVIDUAL';if(mode==='TEAM'&&!game.supports_teams)return res.status(400).json({message:'Questo gioco non supporta squadre'});
  const participants=mode==='TEAM'?await resolveTeams(req.body,game.locale_id):await resolveIndividuals(req.body,game.locale_id);
  if(!participants)return res.status(400).json({message:mode==='TEAM'?'Squadre non valide per il locale':'I giocatori devono essere client registrati del locale'});
  const result=await query(`INSERT INTO matches (game_id,locale_id,participant_mode,player1_id,player2_id,team1_id,team2_id,player1_name,player2_name,status)
    VALUES (?,?,?,?,?,?,?,?,?,'LIVE')`,[game.id,game.locale_id,mode,participants.player1_id||null,participants.player2_id||null,participants.team1_id||null,participants.team2_id||null,participants.player1_name,participants.player2_name]);
  await query(`UPDATE games SET status='IN_GAME' WHERE id=?`,[game.id]);return res.status(201).json(await getMatchRow(result.insertId));
}catch(e){return next(e);}}

async function addMatchEvent(req,res,next){try{if(req.user.role!=='LOCAL_ADMIN')return res.status(403).json({message:'Solo amministratore locale'});const a=await canUseMatch(req.user,req.params.id);if(a.missing)return res.status(404).json({message:'Partita non trovata'});if(!a.allowed||!canManageMatch(req.user,a.match))return res.status(403).json({message:'Non autorizzato'});return res.status(201).json(await processMatchEvent({...req.body,match_id:req.params.id,game_id:a.match.game_id,locale_id:a.match.locale_id}));}catch(e){return next(e);}}
async function endMatch(req,res,next){try{if(req.user.role!=='LOCAL_ADMIN')return res.status(403).json({message:'Solo amministratore locale'});const a=await canUseMatch(req.user,req.params.id);if(a.missing)return res.status(404).json({message:'Partita non trovata'});if(!a.allowed||!canManageMatch(req.user,a.match))return res.status(403).json({message:'Non autorizzato'});return res.json(await processMatchEvent({event_type:'MATCH_END',match_id:req.params.id,game_id:a.match.game_id,locale_id:a.match.locale_id,description:'Partita terminata'}));}catch(e){return next(e);}}
async function simulateMatchMqtt(req,res,next){try{if(req.user.role!=='LOCAL_ADMIN')return res.status(403).json({message:'Solo amministratore locale'});const a=await canUseMatch(req.user,req.params.id);if(a.missing)return res.status(404).json({message:'Partita non trovata'});if(!a.allowed||!canManageMatch(req.user,a.match))return res.status(403).json({message:'Non autorizzato'});const result=await startMqttSimulation(req.params.id);return res.status(202).json({message:'Simulazione avviata sul dispositivo edge',...result});}catch(e){return next(e);}}

async function getMatches(req,res,next){try{
  if(['PLATFORM_ADMIN','GAME_ADMIN'].includes(req.user.role))return res.json(await query(`${matchSelect} ORDER BY m.started_at DESC`));
  if(req.user.role==='LOCAL_ADMIN')return res.json(await query(`${matchSelect} WHERE m.locale_id=? ORDER BY m.started_at DESC`,[req.user.locale_id]));
  return res.json(await query(`${matchSelect} WHERE m.status='FINISHED' AND (m.player1_id=? OR m.player2_id=? OR m.team1_id IN (SELECT team_id FROM team_members WHERE user_id=?) OR m.team2_id IN (SELECT team_id FROM team_members WHERE user_id=?)) ORDER BY m.started_at DESC`,[req.user.id,req.user.id,req.user.id,req.user.id]));
}catch(e){return next(e);}}
async function getCurrentMatch(req,res,next){try{
  let rows=[];if(['PLATFORM_ADMIN','GAME_ADMIN'].includes(req.user.role))rows=await query(`${matchSelect} WHERE m.status='LIVE' ORDER BY m.started_at DESC LIMIT 1`);
  else if(req.user.role==='LOCAL_ADMIN')rows=await query(`${matchSelect} WHERE m.status='LIVE' AND m.locale_id=? ORDER BY m.started_at DESC LIMIT 1`,[req.user.locale_id]);
  else rows=await query(`${matchSelect} WHERE m.status='LIVE' AND (m.player1_id=? OR m.player2_id=? OR m.team1_id IN (SELECT team_id FROM team_members WHERE user_id=?) OR m.team2_id IN (SELECT team_id FROM team_members WHERE user_id=?)) ORDER BY m.started_at DESC LIMIT 1`,[req.user.id,req.user.id,req.user.id,req.user.id]);
  return res.json(rows[0]||null);
}catch(e){return next(e);}}
async function getMatchById(req,res,next){try{const a=await canUseMatch(req.user,req.params.id);if(a.missing)return res.status(404).json({message:'Partita non trovata'});if(!a.allowed)return res.status(403).json({message:'Non autorizzato'});return res.json({match:a.match,events:await getMatchEvents(req.params.id)});}catch(e){return next(e);}}
module.exports={startMatch,addMatchEvent,endMatch,simulateMatchMqtt,getMatches,getCurrentMatch,getMatchById};
