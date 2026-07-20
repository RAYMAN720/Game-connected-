const { query } = require('../db');

const recentMatchesSql = `
  SELECT matches.*, games.name AS game_name, games.type AS game_type, locales.name AS locale_name
  FROM matches
  JOIN games ON games.id = matches.game_id
  JOIN locales ON locales.id = matches.locale_id
`;

async function getCounts(localeId = null) {
  const gameWhere = localeId ? 'WHERE locale_id=?' : '';
  const matchWhere = localeId ? 'WHERE locale_id=?' : '';
  const params = localeId ? [localeId] : [];

  const games = await query(`SELECT COUNT(*) AS total FROM games ${gameWhere}`, params);
  const matches = await query(`SELECT COUNT(*) AS total FROM matches ${matchWhere}`, params);
  const finished = await query(`SELECT COUNT(*) AS total FROM matches ${matchWhere} ${matchWhere ? 'AND' : 'WHERE'} status='FINISHED'`, params);
  const points = await query(
    `SELECT COALESCE(SUM(score1+score2),0) AS total,
            COALESCE(AVG(score1+score2),0) AS average
     FROM matches ${matchWhere}`,
    params
  );

  return {
    totalGames: games[0].total,
    totalMatches: matches[0].total,
    finishedMatches: finished[0].total,
    totalGoals: Number(points[0].total),
    averagePointsPerMatch: Number(Number(points[0].average).toFixed(2))
  };
}

async function getRankingRows(limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  return query(
    `SELECT player_name,
            COUNT(*) AS matches_played,
            SUM(wins) AS wins,
            SUM(points_scored) AS goals,
            ROUND((SUM(wins)/COUNT(*))*100,1) AS win_rate,
            ROUND(AVG(points_scored),2) AS average_score
     FROM (
       SELECT player1_name AS player_name,
              CASE WHEN winner_name=player1_name THEN 1 ELSE 0 END AS wins,
              score1 AS points_scored
       FROM matches
       WHERE status='FINISHED' AND player1_name IS NOT NULL
       UNION ALL
       SELECT player2_name AS player_name,
              CASE WHEN winner_name=player2_name THEN 1 ELSE 0 END AS wins,
              score2 AS points_scored
       FROM matches
       WHERE status='FINISHED' AND player2_name IS NOT NULL
     ) ranked_players
     GROUP BY player_name
     ORDER BY wins DESC, goals DESC, matches_played DESC
     LIMIT ${safeLimit}`
  );
}

async function getGameTypeStatistics(localeId = null) {
  const where = localeId ? 'WHERE m.locale_id=?' : '';
  const params = localeId ? [localeId] : [];
  return query(
    `SELECT g.type AS game_type,
            COUNT(m.id) AS matches_count,
            COALESCE(SUM(m.score1+m.score2),0) AS total_points,
            COALESCE(ROUND(AVG(m.score1+m.score2),2),0) AS average_points
     FROM games g
     LEFT JOIN matches m ON m.game_id=g.id
     ${where}
     GROUP BY g.type
     ORDER BY matches_count DESC,g.type`,
    params
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
      `SELECT games.name,COUNT(matches.id) AS matches_count
       FROM games
       LEFT JOIN matches ON matches.game_id=games.id
       GROUP BY games.id
       ORDER BY matches_count DESC,games.name
       LIMIT 1`
    );
    const mostActiveLocale = await query(
      `SELECT locales.name,COUNT(matches.id) AS matches_count
       FROM locales
       LEFT JOIN matches ON matches.locale_id=locales.id
       GROUP BY locales.id
       ORDER BY matches_count DESC,locales.name
       LIMIT 1`
    );
    const recentMatches = await query(`${recentMatchesSql} ORDER BY matches.started_at DESC LIMIT 8`);

    return res.json({
      totalLocales: totalLocales[0].total,
      ...counts,
      mostPlayedGame: mostPlayedGame[0] || null,
      mostActiveLocale: mostActiveLocale[0] || null,
      gameTypes: await getGameTypeStatistics(),
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

    const localeRows = await query('SELECT * FROM locales WHERE id=?', [req.user.locale_id]);
    const counts = await getCounts(req.user.locale_id);
    const mostPlayedGame = await query(
      `SELECT games.name,COUNT(matches.id) AS matches_count
       FROM games
       LEFT JOIN matches ON matches.game_id=games.id
       WHERE games.locale_id=?
       GROUP BY games.id
       ORDER BY matches_count DESC,games.name
       LIMIT 1`,
      [req.user.locale_id]
    );
    const recentMatches = await query(
      `${recentMatchesSql} WHERE matches.locale_id=? ORDER BY matches.started_at DESC LIMIT 8`,
      [req.user.locale_id]
    );

    return res.json({
      locale: localeRows[0] || null,
      ...counts,
      mostPlayedGame: mostPlayedGame[0] || null,
      gameTypes: await getGameTypeStatistics(req.user.locale_id),
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
       WHERE matches.status='FINISHED'
         AND (matches.player1_id=? OR matches.player2_id=?
          OR matches.team1_id IN (SELECT team_id FROM team_members WHERE user_id=?)
          OR matches.team2_id IN (SELECT team_id FROM team_members WHERE user_id=?))
       ORDER BY matches.started_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );

    const wins = playerMatches.filter((match) => match.winner_name === req.user.username).length;
    const personalPoints = playerMatches.reduce((total, match) => {
      if (Number(match.player1_id) === Number(req.user.id)) return total + Number(match.score1);
      if (Number(match.player2_id) === Number(req.user.id)) return total + Number(match.score2);
      return total;
    }, 0);

    return res.json({
      username: req.user.username,
      personalMatches: playerMatches,
      personalSummary: {
        matches: playerMatches.length,
        wins,
        winRate: playerMatches.length ? Number(((wins / playerMatches.length) * 100).toFixed(1)) : 0,
        averageScore: playerMatches.length ? Number((personalPoints / playerMatches.length).toFixed(2)) : 0
      },
      recentMatches: playerMatches.slice(0, 8),
      ranking: await getRankingRows(10)
    });
  } catch (error) {
    return next(error);
  }
}

async function getRanking(req, res, next) {
  try {
    return res.json(await getRankingRows(20));
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
