const { query } = require('../db');

const recentMatchesSql = `
  SELECT matches.*, games.name AS game_name, locales.name AS locale_name
  FROM matches
  JOIN games ON games.id = matches.game_id
  JOIN locales ON locales.id = matches.locale_id
`;

async function getCounts(whereSql = '', params = []) {
  const games = await query(`SELECT COUNT(*) AS total FROM games ${whereSql}`, params);
  const matches = await query(`SELECT COUNT(*) AS total FROM matches ${whereSql.replace('games', 'matches')}`, params);
  const goals = await query(
    `SELECT COALESCE(SUM(score1 + score2), 0) AS total FROM matches ${whereSql.replace('games', 'matches')}`,
    params
  );

  return {
    totalGames: games[0].total,
    totalMatches: matches[0].total,
    totalGoals: goals[0].total
  };
}

async function getRankingRows(limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  return query(
    `SELECT player_name, COUNT(*) AS matches_played,
            SUM(wins) AS wins, SUM(goals) AS goals
     FROM (
       SELECT player1_name AS player_name,
              CASE WHEN winner_name = player1_name THEN 1 ELSE 0 END AS wins,
              score1 AS goals
       FROM matches
       WHERE status = 'FINISHED' AND player1_name IS NOT NULL
       UNION ALL
       SELECT player2_name AS player_name,
              CASE WHEN winner_name = player2_name THEN 1 ELSE 0 END AS wins,
              score2 AS goals
       FROM matches
       WHERE status = 'FINISHED' AND player2_name IS NOT NULL
     ) ranked_players
     GROUP BY player_name
     ORDER BY wins DESC, goals DESC, matches_played DESC
     LIMIT ${safeLimit}`
  );
}

async function getGlobalStatistics(req, res, next) {
  try {
    if (!['PLATFORM_ADMIN', 'GAME_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo amministratore piattaforma o gioco' });
    }

    const totalLocales = await query('SELECT COUNT(*) AS total FROM locales');
    const counts = await getCounts();
    const mostPlayedGame = await query(
      `SELECT games.name, COUNT(matches.id) AS matches_count
       FROM games
       LEFT JOIN matches ON matches.game_id = games.id
       GROUP BY games.id
       ORDER BY matches_count DESC, games.name
       LIMIT 1`
    );
    const mostActiveLocale = await query(
      `SELECT locales.name, COUNT(matches.id) AS matches_count
       FROM locales
       LEFT JOIN matches ON matches.locale_id = locales.id
       GROUP BY locales.id
       ORDER BY matches_count DESC, locales.name
       LIMIT 1`
    );
    const recentMatches = await query(`${recentMatchesSql} ORDER BY matches.started_at DESC LIMIT 8`);

    return res.json({
      totalLocales: totalLocales[0].total,
      ...counts,
      mostPlayedGame: mostPlayedGame[0] || null,
      mostActiveLocale: mostActiveLocale[0] || null,
      recentMatches
    });
  } catch (error) {
    return next(error);
  }
}

async function getLocalStatistics(req, res, next) {
  try {
    if (req.user.role !== 'LOCAL_ADMIN') {
      return res.status(403).json({ message: 'Solo gli amministratori locali possono vedere le statistiche del locale' });
    }

    const localeRows = await query('SELECT * FROM locales WHERE id = ?', [req.user.locale_id]);
    const counts = await getCounts('WHERE games.locale_id = ?', [req.user.locale_id]);
    const mostPlayedGame = await query(
      `SELECT games.name, COUNT(matches.id) AS matches_count
       FROM games
       LEFT JOIN matches ON matches.game_id = games.id
       WHERE games.locale_id = ?
       GROUP BY games.id
       ORDER BY matches_count DESC, games.name
       LIMIT 1`,
      [req.user.locale_id]
    );
    const recentMatches = await query(
      `${recentMatchesSql} WHERE matches.locale_id = ? ORDER BY matches.started_at DESC LIMIT 8`,
      [req.user.locale_id]
    );

    return res.json({
      locale: localeRows[0] || null,
      ...counts,
      mostPlayedGame: mostPlayedGame[0] || null,
      recentMatches
    });
  } catch (error) {
    return next(error);
  }
}

async function getClientStatistics(req, res, next) {
  try {
    if (req.user.role !== 'CLIENT') {
      return res.status(403).json({ message: 'Solo i client possono vedere le statistiche client' });
    }

    const playerMatches = await query(
      `${recentMatchesSql}
       WHERE matches.status = 'FINISHED'
         AND (matches.player1_id = ? OR matches.player2_id = ? OR matches.team1_id IN (SELECT team_id FROM team_members WHERE user_id = ?) OR matches.team2_id IN (SELECT team_id FROM team_members WHERE user_id = ?))
       ORDER BY matches.started_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );
    const recentMatches = playerMatches.slice(0, 8);
    const ranking = await getRankingRows(10);

    return res.json({
      username: req.user.username,
      personalMatches: playerMatches,
      recentMatches,
      ranking
    });
  } catch (error) {
    return next(error);
  }
}

async function getRanking(req, res, next) {
  try {
    const ranking = await getRankingRows(20);
    return res.json(ranking);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getGlobalStatistics,
  getLocalStatistics,
  getClientStatistics,
  getRanking
};
