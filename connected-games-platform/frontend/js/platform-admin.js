document.addEventListener('DOMContentLoaded', () => {
  const user = requireUser(['PLATFORM_ADMIN']);
  if (!user) {
    return;
  }

  const page = window.location.pathname.split('/').pop();
  const active = page.includes('locales') ? 'locales' : page.includes('statistics') ? 'statistics' : 'dashboard';
  renderSidebar(active);

  if ($('#platform-cards')) {
    loadPlatformDashboard();
  }

  if ($('#locale-form')) {
    initLocalesPage();
  }

  if ($('#global-stat-cards')) {
    refreshEvery(loadPlatformStatistics, 5000);
  }
});

function refreshEvery(callback, interval) {
  callback();
  return setInterval(callback, interval);
}

function statCard(label, value, note = '', tone = '') {
  return `
    <article class="card stat-card ${tone}">
      <p class="card-label">${escapeHtml(label)}</p>
      <p class="card-value">${escapeHtml(value)}</p>
      ${note ? `<p class="card-note">${escapeHtml(note)}</p>` : ''}
    </article>
  `;
}

function renderRecentCards(matches) {
  if (!matches || !matches.length) {
    return '<div class="empty">Nessuna partita presente</div>';
  }

  return matches.slice(0, 5).map((match) => `
    <div class="event-item">
      <strong>${escapeHtml(match.game_name)} ${matchStatusBadge(match.status)}</strong>
      <span class="meta">${escapeHtml(scoreText(match))}</span>
      <br>
      <span class="meta">${escapeHtml(match.locale_name || '-')} - ${formatDate(match.started_at)}</span>
    </div>
  `).join('');
}

async function loadPlatformDashboard() {
  try {
    const [stats, games, tournaments] = await Promise.all([
      apiRequest('/statistics/global'),
      apiRequest('/games'),
      apiRequest('/tournaments')
    ]);
    const activeTournaments = tournaments.filter((tournament) => tournament.status === 'ACTIVE').length;

    $('#platform-cards').innerHTML = [
      statCard('Totale locali', stats.totalLocales, 'luoghi fisici', 'tone-blue'),
      statCard('Totale giochi', stats.totalGames, 'macchine connesse', 'tone-green'),
      statCard('Totale partite', stats.totalMatches, 'risultati salvati', 'tone-red'),
      statCard('Totale goal', stats.totalGoals, 'eventi punteggio dai sensori', 'tone-cyan'),
      statCard('Tornei attivi', activeTournaments, 'competizioni', 'tone-amber')
    ].join('');

    $('#platform-games-body').innerHTML = games.map((game) => `
      <tr>
        <td>#${game.id}</td>
        <td>${escapeHtml(game.name)}</td>
        <td>${escapeHtml(game.type)}</td>
        <td>${escapeHtml(game.locale_name)} - ${escapeHtml(game.locale_city)}</td>
        <td>${gameStatusBadge(game.status)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Nessun gioco trovato</td></tr>';

    $('#platform-recent-matches').innerHTML = renderRecentCards(stats.recentMatches);
    $('#platform-recent-matches').insertAdjacentHTML('beforeend', `
      <div class="quick-actions">
        <a class="btn" href="platform-locales.html">Gestisci locali</a>
        <a class="btn secondary" href="tournaments.html">Vedi tornei</a>
        <a class="btn secondary" href="platform-statistics.html">Vedi statistiche</a>
      </div>
    `);
  } catch (error) {
    showMessage('#platform-cards', error.message, 'error-message');
  }
}

function initLocalesPage() {
  const form = $('#locale-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const formData = getFormData(form);
      const existingUsers = await apiRequest('/users');
      if (existingUsers.some((user) => user.username === formData.admin_username)) {
        alert('Nome utente amministratore locale gia esistente');
        return;
      }

      const locale = await apiRequest('/locales', {
        method: 'POST',
        body: {
          name: formData.name,
          city: formData.city,
          address: formData.address
        }
      });
      await apiRequest('/users/local-admin', {
        method: 'POST',
        body: {
          username: formData.admin_username,
          password: formData.admin_password,
          locale_id: locale.id
        }
      });
      form.reset();
      await loadLocales();
    } catch (error) {
      alert(error.message);
    }
  });

  $('#locales-body').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const id = button.dataset.id;
    const row = JSON.parse(button.dataset.locale);

    try {
      if (button.dataset.action === 'edit') {
        const name = prompt('Nome', row.name);
        const city = prompt('Citta', row.city);
        const address = prompt('Indirizzo', row.address);
        if (!name || !city || !address) {
          return;
        }
        await apiRequest(`/locales/${id}`, {
          method: 'PUT',
          body: { name, city, address }
        });
      }

      if (button.dataset.action === 'delete' && confirm('Eliminare questo locale?')) {
        await apiRequest(`/locales/${id}`, { method: 'DELETE' });
      }

      await loadLocales();
    } catch (error) {
      alert(error.message);
    }
  });

  loadLocales();
}

async function loadLocales() {
  try {
    const [locales, users] = await Promise.all([
      apiRequest('/locales'),
      apiRequest('/users')
    ]);
    const adminsByLocale = users
      .filter((user) => user.role === 'LOCAL_ADMIN')
      .reduce((acc, user) => {
        acc[user.locale_id] = user.username;
        return acc;
      }, {});

    $('#locales-body').innerHTML = locales.map((locale) => `
      <tr>
        <td>#${locale.id}</td>
        <td>${escapeHtml(locale.name)}</td>
        <td>${escapeHtml(locale.city)}</td>
        <td>${escapeHtml(locale.address)}</td>
        <td>${escapeHtml(adminsByLocale[locale.id] || '-')}</td>
        <td>
          <div class="actions">
            <button class="btn secondary" type="button" data-action="edit" data-id="${locale.id}" data-locale='${escapeHtml(JSON.stringify(locale))}'>Modifica</button>
            <button class="btn danger" type="button" data-action="delete" data-id="${locale.id}" data-locale='${escapeHtml(JSON.stringify(locale))}'>Elimina</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">Nessun locale trovato</td></tr>';
  } catch (error) {
    showMessage('#locales-body', error.message, 'error-message');
  }
}

async function loadPlatformStatistics() {
  try {
    const stats = await apiRequest('/statistics/global');
    $('#global-stat-cards').innerHTML = [
      statCard('Totale locali', stats.totalLocales, 'luoghi connessi', 'tone-blue'),
      statCard('Totale giochi', stats.totalGames, 'macchine monitorate', 'tone-green'),
      statCard('Totale partite', stats.totalMatches, 'partite registrate', 'tone-red'),
      statCard('Totale goal', stats.totalGoals, 'goal conteggiati', 'tone-cyan')
    ].join('');

    $('#global-recent-body').innerHTML = renderMatchRows(stats.recentMatches);
    $('#global-highlights').innerHTML = `
      <p class="sync-note">Ultima sincronizzazione: ${formatDate(new Date().toISOString())}</p>
      <article class="card">
        <p class="card-label">Locale piu attivo</p>
        <p class="card-value">${escapeHtml(stats.mostActiveLocale?.name || '-')}</p>
        <p class="card-note">${stats.mostActiveLocale?.matches_count || 0} partite</p>
      </article>
      <article class="card">
        <p class="card-label">Gioco piu usato</p>
        <p class="card-value">${escapeHtml(stats.mostPlayedGame?.name || '-')}</p>
        <p class="card-note">${stats.mostPlayedGame?.matches_count || 0} partite</p>
      </article>
    `;
  } catch (error) {
    showMessage('#global-stat-cards', error.message, 'error-message');
  }
}
