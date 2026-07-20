function renderMatchRows(matches) {
  if (!matches || !matches.length) {
    return '<tr><td colspan="7">Nessuna partita presente</td></tr>';
  }

  return matches.map((match) => `
    <tr>
      <td>#${match.id}</td>
      <td>${escapeHtml(match.game_name)}</td>
      <td>${escapeHtml(match.locale_name || '-')}</td>
      <td>${escapeHtml(scoreText(match))}</td>
      <td>${matchStatusBadge(match.status)}</td>
      <td>${escapeHtml(match.winner_name || '-')}</td>
      <td>${formatDate(match.started_at)}</td>
    </tr>
  `).join('');
}

function renderRecentCards(matches) {
  if (!matches || !matches.length) {
    return emptyState('Nessuna partita presente', 'Avvia una partita locale per generare eventi sensore e classifiche.');
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

function renderRankingRows(ranking) {
  if (!ranking || !ranking.length) {
    return '<tr><td colspan="4">Nessun dato di classifica disponibile</td></tr>';
  }

  return ranking.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.player_name)}</td>
      <td>${row.wins}</td>
      <td>${row.goals}</td>
    </tr>
  `).join('');
}

Object.assign(window, {
  renderMatchRows,
  renderRecentCards,
  renderRankingRows
});
