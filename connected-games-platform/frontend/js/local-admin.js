document.addEventListener('DOMContentLoaded', () => {
  const user = requireUser(['LOCAL_ADMIN']);
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

  if ($('#local-cards')) {
    loadLocalDashboard();
  }

  if ($('#client-user-form')) {
    initClientUserForm();
  }

  if ($('#game-form')) {
    initLocalGames();
  }

  if ($('#local-matches-body')) {
    loadLocalMatches();
  }

  if ($('#local-stat-cards')) {
    refreshEvery(loadLocalStatistics, 5000);
  }
});

function refreshEvery(callback, interval) {
  callback();
  return setInterval(callback, interval);
}

function localCard(label, value, note = '', tone = '') {
  return `
    <article class="card stat-card ${tone}">
      <p class="card-label">${escapeHtml(label)}</p>
      <p class="card-value">${escapeHtml(value)}</p>
      ${note ? `<p class="card-note">${escapeHtml(note)}</p>` : ''}
    </article>
  `;
}

function userList(users) {
  if (!users || !users.length) {
    return emptyState('Nessun utente client', 'Crea un account client per i giocatori del locale.');
  }

  return users.map((user) => `
    <div class="event-item">
      <strong>${escapeHtml(user.username)}</strong>
      <span class="meta">${escapeHtml(roleLabel(user.role))} - ${escapeHtml(user.locale_name || 'Locale assegnato')}</span>
    </div>
  `).join('');
}

async function initClientUserForm() {
  const form = $('#client-user-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await apiRequest('/users/client', {
        method: 'POST',
        body: getFormData(form)
      });
      form.reset();
      await loadClientUsers();
    } catch (error) {
      alert(error.message);
    }
  });

  loadClientUsers();
}

async function loadClientUsers() {
  try {
    const users = await apiRequest('/users');
    $('#client-users-list').innerHTML = userList(users);
  } catch (error) {
    showMessage('#client-users-list', error.message, 'error-message');
  }
}

async function loadLocalDashboard() {
  try {
    const [stats, tournaments] = await Promise.all([
      apiRequest('/statistics/local'),
      apiRequest('/tournaments')
    ]);
    const activeTournaments = tournaments.filter((tournament) => tournament.status === 'ACTIVE').length;
    const liveMatch = (stats.recentMatches || []).find((match) => match.status === 'LIVE');

    $('#local-cards').innerHTML = [
      localCard('Locale assegnato', stats.locale?.name || '-', stats.locale?.city || 'controllo locale', 'tone-blue'),
      localCard('Giochi locali', stats.totalGames, 'macchine gestite', 'tone-green'),
      localCard('Partite locali', stats.totalMatches, liveMatch ? `live: ${liveMatch.game_name}` : 'nessuna partita live', 'tone-red'),
      localCard('Tornei attivi', activeTournaments, 'competizioni disponibili', 'tone-amber'),
      localCard('Goal', stats.totalGoals, 'totale punteggio locale', 'tone-green')
    ].join('');

    $('#assigned-locale').innerHTML = stats.locale ? `
      <article class="card">
        <p class="card-label">${escapeHtml(stats.locale.city)}</p>
        <p class="card-value">${escapeHtml(stats.locale.name)}</p>
        <p class="card-note">${escapeHtml(stats.locale.address)}</p>
      </article>
    ` : '<div class="empty">Nessun locale assegnato</div>';

    $('#local-dashboard-matches').innerHTML = renderRecentCards(stats.recentMatches);
    $('#local-dashboard-matches').insertAdjacentHTML('beforeend', `
      <div class="quick-actions">
        <a class="btn" href="local-admin-games.html">Gestisci giochi</a>
        <a class="btn secondary" href="tournaments.html">Vedi tornei</a>
      </div>
    `);
  } catch (error) {
    showMessage('#local-cards', error.message, 'error-message');
  }
}

function initLocalGames() {
  const form = $('#game-form');
  $all('.type-sticker').forEach((button) => button.addEventListener('click', () => {
    $('#game-type').value = button.dataset.gameType;
    $all('.type-sticker').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  }));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await apiRequest('/games', { method: 'POST', body: getFormData(form) }); form.reset(); await loadLocalGames(); }
    catch (error) { alert(error.message); }
  });
  $('#local-games-grid').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const gameId = button.dataset.id;
    try {
      if (button.dataset.action === 'start') {
        const mode = $(`#mode-${gameId}`).value;
        const body = { game_id: Number(gameId), participant_mode: mode };
        if (mode === 'TEAM') {
          body.team1_id = Number($(`#team1-${gameId}`).value);
          body.team2_id = Number($(`#team2-${gameId}`).value);
        } else {
          body.player1_name = $(`#player1-${gameId}`).value.trim();
          body.player2_name = $(`#player2-${gameId}`).value.trim();
        }
        const match = await apiRequest('/matches/start', { method: 'POST', body });
        goToLiveMatch(match.id);
      }
      if (button.dataset.action === 'edit') {
        const game = JSON.parse(button.dataset.game);
        const name = prompt('Nome gioco', game.name);
        const type = prompt('Tipo gioco', game.type);
        const status = prompt('Stato: ONLINE, OFFLINE, IN_GAME o SYNC_PENDING', game.status);
        if (!name || !type || !status) return;
        await apiRequest(`/games/${gameId}`, { method: 'PUT', body: { name, type, status } });
        await loadLocalGames();
      }
      if (button.dataset.action === 'delete' && confirm('Eliminare questo gioco?')) {
        await apiRequest(`/games/${gameId}`, { method: 'DELETE' }); await loadLocalGames();
      }
    } catch (error) { alert(error.message); }
  });
  $('#local-games-grid').addEventListener('change', (event) => {
    if (!event.target.matches('[data-mode-game]')) return;
    const id = event.target.dataset.modeGame;
    $(`#individual-fields-${id}`).style.display = event.target.value === 'INDIVIDUAL' ? 'grid' : 'none';
    $(`#team-fields-${id}`).style.display = event.target.value === 'TEAM' ? 'grid' : 'none';
  });
  refreshEvery(loadLocalGames, 5000);
}

async function loadLocalGames() {
  try {
    const [games, users, teams] = await Promise.all([apiRequest('/games'), apiRequest('/users'), apiRequest('/teams')]);
    const players = users.filter((user) => user.role === 'CLIENT');
    const playerOptions = players.map((u) => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)}</option>`).join('');
    const teamOptions = teams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    $('#local-games-grid').innerHTML = games.map((game) => `
      <article class="game-card enhanced"><img class="game-image" src="${gameImage(game)}" alt="${escapeHtml(gameAltText(game))}"><div class="game-body">
      <div class="panel-title"><div><span class="game-type-icon">${gameTypeIcon(game)}</span><h3>${escapeHtml(game.name)}</h3><span class="meta">${escapeHtml(game.type)} - ${escapeHtml(game.locale_name)}</span></div>${gameStatusBadge(game.status)}</div>
      <div class="field"><label>Modalita partecipanti</label><select id="mode-${game.id}" data-mode-game="${game.id}"><option value="INDIVIDUAL">Giocatori singoli</option>${game.supports_teams ? '<option value="TEAM">Squadre</option>' : ''}</select></div>
      <datalist id="registered-players-${game.id}">${playerOptions}</datalist>
      <div id="individual-fields-${game.id}" class="form-grid two"><div class="field"><label>Giocatore 1</label><input id="player1-${game.id}" list="registered-players-${game.id}" value="${escapeHtml(players[0]?.username || '')}"></div><div class="field"><label>Giocatore 2</label><input id="player2-${game.id}" list="registered-players-${game.id}" value="${escapeHtml(players[1]?.username || '')}"></div></div>
      <div id="team-fields-${game.id}" class="form-grid two" style="display:none"><div class="field"><label>Squadra 1</label><select id="team1-${game.id}">${teamOptions}</select></div><div class="field"><label>Squadra 2</label><select id="team2-${game.id}">${teamOptions}</select></div></div>
      <div class="actions"><button class="btn start-btn" data-action="start" data-id="${game.id}" ${game.status !== 'ONLINE' ? 'disabled' : ''}>Avvia partita</button><button class="btn secondary" data-action="edit" data-id="${game.id}" data-game='${escapeHtml(JSON.stringify(game))}'>Modifica</button><button class="btn danger" data-action="delete" data-id="${game.id}">Elimina</button></div>
      <p class="card-note">La partita puo essere individuale oppure a squadre. Gli eventi arrivano dall'edge tramite MQTT.</p></div></article>`).join('') || emptyState('Nessun gioco trovato', 'Crea il primo gioco connesso.');
  } catch (error) { showMessage('#local-games-grid', error.message, 'error-message'); }
}

async function loadLocalMatches() {
  try {
    const matches = await apiRequest('/matches');
    $('#local-matches-body').innerHTML = renderMatchRows(matches);
  } catch (error) {
    showMessage('#local-matches-body', error.message, 'error-message');
  }
}

async function loadLocalStatistics() {
  try {
    const stats = await apiRequest('/statistics/local');
    $('#local-stat-cards').innerHTML = [
      localCard('Giochi', stats.totalGames, 'disponibili nel locale', 'tone-green'),
      localCard('Partite', stats.totalMatches, 'giocate nel locale', 'tone-red'),
      localCard('Goal', stats.totalGoals, 'segnati nel locale', 'tone-cyan'),
      localCard('Piu giocato', stats.mostPlayedGame?.name || '-', `${stats.mostPlayedGame?.matches_count || 0} partite`, 'tone-blue')
    ].join('');
    $('#local-stat-cards').insertAdjacentHTML('beforebegin', renderSingleSyncNote('local-stat-sync-note'));
    $('#local-stat-matches-body').innerHTML = renderMatchRows(stats.recentMatches);
  } catch (error) {
    showMessage('#local-stat-cards', error.message, 'error-message');
  }
}

function renderSingleSyncNote(id) {
  const existing = $(`#${id}`);
  if (existing) {
    existing.textContent = `Ultima sincronizzazione: ${formatDate(new Date().toISOString())}`;
    return '';
  }
  return `<p id="${id}" class="sync-note">Ultima sincronizzazione: ${formatDate(new Date().toISOString())}</p>`;
}
