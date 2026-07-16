function sameNumber(a, b) {
  return Number(a) === Number(b);
}

function isParticipant(user, match) {
  if (!user || !match || user.role !== 'CLIENT') return false;
  return match.player1_name === user.username || match.player2_name === user.username;
}

function canViewMatch(user, match) {
  if (!user || !match) return false;
  if (['PLATFORM_ADMIN', 'GAME_ADMIN'].includes(user.role)) return true;
  if (user.role === 'LOCAL_ADMIN') return sameNumber(match.locale_id, user.locale_id);
  if (user.role === 'CLIENT') return isParticipant(user, match);
  return false;
}

function canManageMatch(user, match) {
  return Boolean(user && match && user.role === 'LOCAL_ADMIN' && sameNumber(match.locale_id, user.locale_id));
}

function canManageCatalog(user) {
  return ['PLATFORM_ADMIN', 'GAME_ADMIN'].includes(user?.role);
}

function winnerFromScores(match) {
  if (!match) return null;
  if (Number(match.score1) > Number(match.score2)) return match.player1_name;
  if (Number(match.score2) > Number(match.score1)) return match.player2_name;
  return 'Pareggio';
}

module.exports = { sameNumber, canViewMatch, canManageMatch, canManageCatalog, isParticipant, winnerFromScores };
