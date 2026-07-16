document.addEventListener('DOMContentLoaded', () => {
  const user = requireUser(['CLIENT']);
  if (!user) {
    return;
  }

  const page = window.location.pathname.split('/').pop();
  const active = page.includes('games')
    ? 'games'
    : page.includes('matches')
      ? 'matches'
      : page.includes('statistics')
        ? 'statistics'
        : 'dashboard';
  renderSidebar(active);

  if ($('#client-cards')) {
    loadClientDashboard();
  }

  if ($('#client-games-grid')) {
    loadClientGames('#client-games-grid');
  }

  if ($('#client-matches-body')) {
    loadClientMatches();
  }

  if ($('#client-ranking-body')) {
    refreshEvery(loadClientStatistics, 5000);
  }
});

function refreshEvery(callback, interval) {
  callback();
  return setInterval(callback, interval);
}

function clientCard(label, value, note = '', tone = '') {
  return `
    <article class="card stat-card ${tone}">
      <p class="card-label">${escapeHtml(label)}</p>
      <p class="card-value">${escapeHtml(value)}</p>
      ${note ? `<p class="card-note">${escapeHtml(note)}</p>` : ''}
    </article>
  `;
}

function samePlayerName(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

async function loadClientDashboard() {
  try {
    const [games, stats] = await Promise.all([
      apiRequest('/games'),
      apiRequest('/statistics/client')
    ]);
    const personalMatches = stats.personalMatches || [];
    const wins = personalMatches.filter((match) => samePlayerName(match.winner_name, stats.username)).length;
    const losses = personalMatches.filter((match) => match.winner_name && !samePlayerName(match.winner_name, stats.username) && !samePlayerName(match.winner_name, 'Pareggio')).length;
    const goalsScored = personalMatches.reduce((total, match) => {
      if (samePlayerName(match.player1_name, stats.username)) {
        return total + Number(match.score1 || 0);
      }
      if (samePlayerName(match.player2_name, stats.username)) {
        return total + Number(match.score2 || 0);
      }
      return total;
    }, 0);
    const winRate = personalMatches.length ? Math.round((wins / personalMatches.length) * 100) : 0;
    const rankingPosition = (stats.ranking || []).findIndex((row) => row.player_name === stats.username) + 1;

    $('#client-cards').innerHTML = [
      clientCard('Partite giocate', personalMatches.length, 'risultati personali', 'tone-blue'),
      clientCard('Vittorie', wins, `${losses} sconfitte`, 'tone-green'),
      clientCard('Goal segnati', goalsScored, 'totale personale', 'tone-cyan'),
      clientCard('Percentuale vittorie', `${winRate}%`, rankingPosition ? `classifica #${rankingPosition}` : 'non ancora in classifica', 'tone-amber'),
      clientCard('Giochi disponibili', games.length, 'macchine da seguire', 'tone-red')
    ].join('');

    renderClientGames('#client-dashboard-games', games.slice(0, 4));
    $('#client-dashboard-matches').innerHTML = renderRecentCards(stats.recentMatches);
  } catch (error) {
    showMessage('#client-cards', error.message, 'error-message');
  }
}

async function loadClientGames(target) {
  try {
    const games = await apiRequest('/games');
    renderClientGames(target, games);
  } catch (error) {
    showMessage(target, error.message, 'error-message');
  }
}

function renderClientGames(target, games) {
  const element = typeof target === 'string' ? $(target) : target;
  element.innerHTML = games.map((game) => `
    <article class="game-card enhanced">
      <img class="game-image" src="${gameImage(game)}" alt="${escapeHtml(gameAltText(game))}">
      <div class="game-body">
        <div class="panel-title">
          <div>
            <span class="game-type-icon">${gameTypeIcon(game)}</span>
            <h3>${escapeHtml(game.name)}</h3>
            <span class="meta">${escapeHtml(game.type)} - ${escapeHtml(game.locale_name)} - ${escapeHtml(game.locale_city)}</span>
          </div>
          ${gameStatusBadge(game.status)}
        </div>
        <div class="game-meta-row">
          <span class="badge mqtt-badge">MQTT connesso</span>
          <span class="badge">Sola lettura</span>
        </div>
        <div class="actions">
          ${game.status === 'IN_GAME'
            ? '<button class="btn" type="button" onclick="goToLiveMatch()">Vedi partita live</button>'
            : '<a class="btn secondary" href="client-matches.html">Vedi risultati</a>'}
          <a class="btn secondary" href="client-statistics.html">Vedi classifica</a>
          <a class="btn ghost" href="tournaments.html">Tornei</a>
        </div>
      </div>
    </article>
  `).join('') || emptyState('Nessun gioco disponibile', 'Quando un locale ha giochi online, i giocatori li vedranno qui.');
}

async function loadClientMatches() {
  try {
    const matches = await apiRequest('/matches');
    $('#client-matches-body').innerHTML = renderMatchRows(matches);
  } catch (error) {
    showMessage('#client-matches-body', error.message, 'error-message');
  }
}

async function loadClientStatistics() {
  try {
    const stats = await apiRequest('/statistics/client');
    $('#client-ranking-body').innerHTML = renderRankingRows(stats.ranking);
    $('#client-stat-recent').innerHTML = `<p class="sync-note">Ultima sincronizzazione: ${formatDate(new Date().toISOString())}</p>${renderRecentCards(stats.recentMatches)}`;
  } catch (error) {
    showMessage('#client-ranking-body', error.message, 'error-message');
  }
}
