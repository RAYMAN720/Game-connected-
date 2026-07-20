function emptyRow(name) {
  return { player_name: name, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, points: 0 };
}

function addResult(table, name, goalsFor, goalsAgainst) {
  if (!table.has(name)) table.set(name, emptyRow(name));
  const row = table.get(name);
  row.played += 1;
  row.goals_for += Number(goalsFor || 0);
  row.goals_against += Number(goalsAgainst || 0);
  if (Number(goalsFor) > Number(goalsAgainst)) { row.wins += 1; row.points += 3; }
  else if (Number(goalsFor) === Number(goalsAgainst)) { row.draws += 1; row.points += 1; }
  else row.losses += 1;
}

function calculateTournamentRanking(matches) {
  const table = new Map();
  for (const match of matches || []) {
    if (match.status !== 'FINISHED') continue;
    addResult(table, match.player1_name, match.score1, match.score2);
    addResult(table, match.player2_name, match.score2, match.score1);
  }
  return Array.from(table.values()).sort((a, b) => {
    const diffA = a.goals_for - a.goals_against;
    const diffB = b.goals_for - b.goals_against;
    return b.points - a.points || b.wins - a.wins || diffB - diffA || b.goals_for - a.goals_for || a.player_name.localeCompare(b.player_name);
  });
}

function canViewTournaments(user) {
  return ['PLATFORM_ADMIN', 'LOCAL_ADMIN', 'GAME_ADMIN', 'CLIENT'].includes(user?.role);
}
function canCreateTournament(user) { return user?.role === 'PLATFORM_ADMIN'; }
function canLinkMatchToTournament(user, match) {
  if (user?.role === 'PLATFORM_ADMIN') return true;
  return user?.role === 'LOCAL_ADMIN' && Number(user.locale_id) === Number(match?.locale_id);
}

function isTournamentMatchCompatible(match, tournament, localeIds = []) {
  return Boolean(
    match && tournament && match.status === 'FINISHED' &&
    match.game_type === tournament.game_type &&
    (match.participant_mode || 'INDIVIDUAL') === (tournament.participant_mode || 'INDIVIDUAL') &&
    (!localeIds.length || localeIds.map(Number).includes(Number(match.locale_id)))
  );
}

function shouldAutoLinkMatchToTournament(match, tournament, localeIds = []) {
  return tournament?.status === 'ACTIVE' && isTournamentMatchCompatible(match, tournament, localeIds);
}

module.exports = {
  calculateTournamentRanking,
  canViewTournaments,
  canCreateTournament,
  canLinkMatchToTournament,
  isTournamentMatchCompatible,
  shouldAutoLinkMatchToTournament
};
