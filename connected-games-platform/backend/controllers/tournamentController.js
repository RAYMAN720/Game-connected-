const { query } = require('../db');
const { canCreateTournament,canLinkMatchToTournament,canViewTournaments,isTournamentMatchCompatible } = require('../utils/tournamentRules');
const { validateTournamentInput } = require('../utils/validationRules');
const service = require('../services/tournamentService');

async function getTournaments(req,res,next){try{if(!canViewTournaments(req.user))return res.status(403).json({message:'Non autorizzato'});return res.json(await service.getTournamentSummariesWithRanking());}catch(e){return next(e);}}

async function getTournamentById(req,res,next){try{
  const t=await service.getTournamentById(req.params.id); if(!t)return res.status(404).json({message:'Torneo non trovato'});
  return res.json({...t,locations:await service.getTournamentLocations(t.id),teams:await service.getTournamentTeams(t.id),matches:await service.getTournamentMatches(t.id),ranking:await service.getTournamentRankingRows(t.id)});
}catch(e){return next(e);}}

async function resolveType(body){
  const rows=body.game_type_id?await query('SELECT * FROM game_types WHERE id=?',[body.game_type_id]):await query('SELECT * FROM game_types WHERE name=?',[body.game_type]);
  return rows[0]||null;
}
async function replaceLocations(tournamentId,ids){await query('DELETE FROM tournament_locations WHERE tournament_id=?',[tournamentId]);for(const id of ids)await query('INSERT INTO tournament_locations (tournament_id,locale_id) VALUES (?,?)',[tournamentId,id]);}
async function replaceTeams(tournamentId,ids){await query('DELETE FROM tournament_teams WHERE tournament_id=?',[tournamentId]);for(const id of ids||[])await query('INSERT INTO tournament_teams (tournament_id,team_id) VALUES (?,?)',[tournamentId,id]);}

async function createTournament(req,res,next){try{
  if(!canCreateTournament(req.user))return res.status(403).json({message:'Solo amministratore piattaforma'});
  const errors=validateTournamentInput(req.body);if(errors.length)return res.status(400).json({message:errors.join('. ')});
  const gt=await resolveType(req.body);if(!gt)return res.status(404).json({message:'Tipo di gioco non trovato'});
  if((req.body.participant_mode||'INDIVIDUAL')==='TEAM'&&!gt.supports_teams)return res.status(400).json({message:'Questo tipo di gioco non supporta squadre'});
  const result=await query(`INSERT INTO tournaments (name,game_type_id,game_type,participant_mode,status,start_date,end_date) VALUES (?,?,?,?,?,?,?)`,[req.body.name,gt.id,gt.name,req.body.participant_mode||'INDIVIDUAL',req.body.status||'DRAFT',req.body.start_date||null,req.body.end_date||null]);
  await replaceLocations(result.insertId,req.body.locale_ids);await replaceTeams(result.insertId,req.body.team_ids||[]);
  return getTournamentById({params:{id:result.insertId}},res,next);
}catch(e){return next(e);}}

async function updateTournament(req,res,next){try{
  if(!canCreateTournament(req.user))return res.status(403).json({message:'Solo amministratore piattaforma'});
  const errors=validateTournamentInput(req.body);if(errors.length)return res.status(400).json({message:errors.join('. ')});
  const gt=await resolveType(req.body);if(!gt)return res.status(404).json({message:'Tipo di gioco non trovato'});
  const result=await query(`UPDATE tournaments SET name=?,game_type_id=?,game_type=?,participant_mode=?,status=?,start_date=?,end_date=? WHERE id=?`,[req.body.name,gt.id,gt.name,req.body.participant_mode||'INDIVIDUAL',req.body.status||'DRAFT',req.body.start_date||null,req.body.end_date||null,req.params.id]);
  if(!result.affectedRows)return res.status(404).json({message:'Torneo non trovato'});
  await replaceLocations(req.params.id,req.body.locale_ids);await replaceTeams(req.params.id,req.body.team_ids||[]);
  return getTournamentById(req,res,next);
}catch(e){return next(e);}}

async function addMatchToTournament(req,res,next){try{
  if(!req.body.match_id)return res.status(400).json({message:'match_id obbligatorio'});
  const t=await service.getTournamentById(req.params.id);if(!t)return res.status(404).json({message:'Torneo non trovato'});
  const m=await service.getMatchForTournamentLink(req.body.match_id);if(!m)return res.status(404).json({message:'Partita non trovata'});
  if(!canLinkMatchToTournament(req.user,m))return res.status(403).json({message:'Non autorizzato'});
  const locations=await service.getTournamentLocations(t.id);
  if(!isTournamentMatchCompatible(m,t,locations.map(x=>x.id)))return res.status(400).json({message:'La partita deve essere conclusa e avere stesso tipo, modalita e locale del torneo'});
  await service.linkMatchToTournament(t.id,m.id,Number(req.body.round_number||1),req.body.scheduled_at||null);
  return res.status(201).json({message:'Partita collegata al torneo'});
}catch(e){return next(e);}}

async function getTournamentRanking(req,res,next){try{const t=await service.getTournamentById(req.params.id);if(!t)return res.status(404).json({message:'Torneo non trovato'});return res.json(await service.getTournamentRankingRows(t.id));}catch(e){return next(e);}}

async function deleteTournament(req,res,next){try{if(!canCreateTournament(req.user))return res.status(403).json({message:'Solo amministratore piattaforma'});const r=await query('DELETE FROM tournaments WHERE id=?',[req.params.id]);if(!r.affectedRows)return res.status(404).json({message:'Torneo non trovato'});return res.json({message:'Torneo eliminato'});}catch(e){return next(e);}}

module.exports={getTournaments,getTournamentById,createTournament,updateTournament,addMatchToTournament,getTournamentRanking,deleteTournament};
