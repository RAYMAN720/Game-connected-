const { query } = require('../db');
const { calculateTournamentRanking, shouldAutoLinkMatchToTournament } = require('../utils/tournamentRules');

async function getTournamentById(id) {
  const rows = await query('SELECT * FROM tournaments WHERE id=?', [id]);
  return rows[0] || null;
}
async function getTournamentLocations(id) {
  return query(`SELECT l.* FROM tournament_locations tl JOIN locales l ON l.id=tl.locale_id WHERE tl.tournament_id=? ORDER BY l.name`, [id]);
}
async function getTournamentTeams(id) {
  return query(`SELECT t.* FROM tournament_teams tt JOIN teams t ON t.id=tt.team_id WHERE tt.tournament_id=? ORDER BY t.name`, [id]);
}
async function getTournamentMatches(id) {
  return query(`SELECT m.*,g.name AS game_name,g.type AS game_type,l.name AS locale_name,tm.round_number,tm.scheduled_at
    FROM tournament_matches tm JOIN matches m ON m.id=tm.match_id JOIN games g ON g.id=m.game_id JOIN locales l ON l.id=m.locale_id
    WHERE tm.tournament_id=? ORDER BY tm.round_number,COALESCE(tm.scheduled_at,m.started_at),m.id`, [id]);
}
async function getTournamentRankingRows(id) { return calculateTournamentRanking(await getTournamentMatches(id)); }

async function getTournamentRows() {
  return query(`SELECT t.*,COUNT(DISTINCT tm.match_id) AS matches_count,COUNT(DISTINCT tl.locale_id) AS locations_count
    FROM tournaments t LEFT JOIN tournament_matches tm ON tm.tournament_id=t.id LEFT JOIN tournament_locations tl ON tl.tournament_id=t.id
    GROUP BY t.id ORDER BY t.created_at DESC,t.id DESC`);
}
async function getTournamentSummariesWithRanking() {
  const rows = await getTournamentRows();
  return Promise.all(rows.map(async row => ({
    ...row,
    matches_count:Number(row.matches_count || 0), locations_count:Number(row.locations_count || 0),
    locations:await getTournamentLocations(row.id), teams:await getTournamentTeams(row.id), ranking:await getTournamentRankingRows(row.id)
  })));
}
async function getMatchForTournamentLink(id) {
  const rows = await query(`SELECT m.*,g.type AS game_type,g.name AS game_name FROM matches m JOIN games g ON g.id=m.game_id WHERE m.id=?`, [id]);
  return rows[0] || null;
}
async function linkMatchToTournament(tournamentId, matchId, roundNumber=1, scheduledAt=null) {
  await query(`INSERT INTO tournament_matches (tournament_id,match_id,round_number,scheduled_at) VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE round_number=VALUES(round_number),scheduled_at=VALUES(scheduled_at)`, [tournamentId,matchId,roundNumber,scheduledAt || null]);
}
async function linkMatchToActiveTournament(matchId) {
  const match = await getMatchForTournamentLink(matchId);
  if (!match) return null;
  const tournaments = await query(`SELECT * FROM tournaments WHERE status='ACTIVE' AND game_type=? AND participant_mode=? ORDER BY created_at,id`, [match.game_type,match.participant_mode || 'INDIVIDUAL']);
  for (const tournament of tournaments) {
    const locations = await getTournamentLocations(tournament.id);
    if (shouldAutoLinkMatchToTournament(match,tournament,locations.map(x=>x.id))) {
      await linkMatchToTournament(tournament.id,match.id,1,null);
      return tournament;
    }
  }
  return null;
}
module.exports = { getTournamentById,getTournamentLocations,getTournamentTeams,getTournamentMatches,getTournamentRankingRows,getTournamentRows,getTournamentSummariesWithRanking,getMatchForTournamentLink,linkMatchToTournament,linkMatchToActiveTournament };
