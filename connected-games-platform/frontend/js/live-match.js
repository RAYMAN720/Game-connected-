let liveMatch = null;
let liveEvents = [];
let simulating = false;
let pollTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = requireUser(['LOCAL_ADMIN', 'CLIENT', 'PLATFORM_ADMIN']);
  if (!user) {
    return;
  }

  renderSidebar('live');

  $('#simulate-btn').addEventListener('click', simulateMatch);
  $('#end-match-btn').addEventListener('click', endLiveMatch);
  $('#play-again-btn').addEventListener('click', playAgain);
  $('#go-stats-btn').addEventListener('click', goToStats);

  loadLiveMatch();
});

async function loadLiveMatch() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || localStorage.getItem('currentMatchId');

    if (id) {
      const details = await apiRequest(`/matches/${id}`);
      liveMatch = details.match;
      liveEvents = details.events;
      renderLiveMatch();
      if (liveMatch.status === 'LIVE') {
        startPolling();
      }
      return;
    }

    const current = await apiRequest('/matches/current');
    if (!current) {
      showNoLiveMatch();
      return;
    }

    const details = await apiRequest(`/matches/${current.id}`);
    liveMatch = details.match;
    liveEvents = details.events;
    localStorage.setItem('currentMatchId', String(liveMatch.id));
    renderLiveMatch();
    if (liveMatch.status === 'LIVE') {
      startPolling();
    }
  } catch (error) {
    showMessage('#live-empty', error.message, 'error-message');
  }
}

function showNoLiveMatch() {
  stopPolling();
  $('#live-content').classList.add('hidden');
  showMessage('#live-empty', 'Nessuna partita live disponibile in questo momento');
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(refreshLiveMatch, 2000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function refreshLiveMatch() {
  if (!liveMatch) {
    return;
  }

  try {
    const details = await apiRequest(`/matches/${liveMatch.id}`);
    liveMatch = details.match;
    liveEvents = details.events;

    if (liveMatch.status === 'FINISHED') {
      simulating = false;
      stopPolling();
    }

    renderLiveMatch();
  } catch (error) {
    console.error(error.message);
  }
}

function renderLiveMatch() {
  const user = currentUser();
  $('#live-empty').innerHTML = '';
  $('#live-content').classList.remove('hidden');

  $('#live-game-name').textContent = liveMatch.game_name;
  $('#live-locale').textContent = `${liveMatch.locale_name} - ${liveMatch.locale_city}`;
  $('#player1-name').textContent = liveMatch.player1_name;
  $('#player2-name').textContent = liveMatch.player2_name;
  $('#score1').textContent = liveMatch.score1;
  $('#score2').textContent = liveMatch.score2;
  $('#live-status').className = `badge status-${String(liveMatch.status).toLowerCase()}`;
  $('#live-status').textContent = statusLabel(liveMatch.status);
  $('#live-subtitle').textContent = `Partita #${liveMatch.id} - ${formatDate(liveMatch.started_at)}`;
  $('#live-sync-note').textContent = `Ultima sincronizzazione: ${formatDate(new Date().toISOString())}`;
  $('#mqtt-topic-preview').textContent = `locales/${liveMatch.locale_id}/games/${liveMatch.game_id}/matches/${liveMatch.id}/events`;

  const isLive = liveMatch.status === 'LIVE';
  $('#local-live-actions').classList.toggle('hidden', user.role !== 'LOCAL_ADMIN' || !isLive);
  $('#finished-actions').classList.toggle('hidden', liveMatch.status !== 'FINISHED');
  $('#play-again-btn').classList.toggle('hidden', user.role !== 'LOCAL_ADMIN');
  $('#simulate-btn').disabled = simulating;
  $('#end-match-btn').disabled = simulating;
  $('#simulate-btn').textContent = simulating ? 'Simulazione MQTT in corso...' : 'Simula con MQTT';

  $('#final-result').innerHTML = liveMatch.status === 'FINISHED'
    ? `<strong>Vincitore finale:</strong> ${escapeHtml(liveMatch.winner_name || '-')}<br><span class="meta">${escapeHtml(scoreText(liveMatch))}</span>`
    : 'Partita in corso';
  $('#final-result').className = liveMatch.status === 'FINISHED' ? 'winner-panel' : 'empty';

  const lastEvent = liveEvents[liveEvents.length - 1];
  $('#last-event').innerHTML = lastEvent
    ? `<strong>Ultimo evento MQTT: ${escapeHtml(lastEvent.event_type)}</strong><span class="meta">${escapeHtml(lastEvent.description)} - ${formatDate(lastEvent.created_at)}</span>`
    : '<strong>In attesa di un evento MQTT</strong><span class="meta">Avvia una simulazione per pubblicare messaggi dei sensori.</span>';

  $('#event-list').innerHTML = liveEvents.length
    ? liveEvents.map((event) => `
      <div class="event-item timeline-item ${eventClass(event.event_type)}">
        <strong>${escapeHtml(event.event_type)} ${event.player_name ? `- ${escapeHtml(event.player_name)}` : ''}</strong>
        <span class="meta">${escapeHtml(event.description)} - ${formatDate(event.created_at)}</span>
        <span class="badge status-${String(event.sync_status || 'SYNCED').toLowerCase()}">${escapeHtml(statusLabel(event.sync_status || 'SYNCED'))}</span>
      </div>
    `).join('')
    : emptyState('Nessun evento presente', 'I messaggi dei sensori MQTT appariranno qui durante la simulazione.');
}

function eventClass(eventType) {
  if (String(eventType).includes('GOAL')) {
    return 'event-goal';
  }
  if (eventType === 'MATCH_START') {
    return 'event-live';
  }
  if (eventType === 'MATCH_END') {
    return 'event-finished';
  }
  return '';
}

async function playAgain() {
  if (!liveMatch || liveMatch.status !== 'FINISHED') {
    return;
  }

  try {
    const match = await apiRequest('/matches/start', {
      method: 'POST',
      body: {
        game_id: liveMatch.game_id,
        player1_name: liveMatch.player1_name,
        player2_name: liveMatch.player2_name
      }
    });
    localStorage.setItem('currentMatchId', String(match.id));
    window.location.href = `live-match.html?id=${match.id}`;
  } catch (error) {
    alert(error.message);
  }
}

function goToStats() {
  const user = currentUser();
  if (user.role === 'PLATFORM_ADMIN') {
    window.location.href = 'platform-statistics.html';
    return;
  }
  if (user.role === 'LOCAL_ADMIN') {
    window.location.href = 'local-admin-statistics.html';
    return;
  }
  window.location.href = 'client-statistics.html';
}

async function simulateMatch() {
  if (!liveMatch || simulating || liveMatch.status !== 'LIVE') {
    return;
  }

  simulating = true;
  renderLiveMatch();

  try {
    await apiRequest(`/matches/${liveMatch.id}/simulate-mqtt`, {
      method: 'POST'
    });
    startPolling();
  } catch (error) {
    simulating = false;
    renderLiveMatch();
    alert(error.message);
  }
}

async function endLiveMatch() {
  if (!liveMatch || liveMatch.status !== 'LIVE') {
    return;
  }

  try {
    const response = await apiRequest(`/matches/${liveMatch.id}/end`, {
      method: 'POST'
    });
    liveMatch = response.match;
    liveEvents = response.events;
    simulating = false;
    stopPolling();
    renderLiveMatch();
  } catch (error) {
    alert(error.message);
  }
}
