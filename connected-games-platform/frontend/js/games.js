function gameStatusBadge(status) {
  const className = `badge status-${String(status).toLowerCase()}`;
  return `<span class="${className}">${escapeHtml(statusLabel(status))}</span>`;
}

function matchStatusBadge(status) {
  const className = `badge status-${String(status).toLowerCase()}`;
  return `<span class="${className}">${escapeHtml(statusLabel(status))}</span>`;
}

function goToLiveMatch(matchId) {
  if (matchId) {
    localStorage.setItem('currentMatchId', String(matchId));
    window.location.href = `live-match.html?id=${matchId}`;
    return;
  }

  window.location.href = 'live-match.html';
}

function scoreText(match) {
  return `${match.player1_name} ${match.score1} - ${match.score2} ${match.player2_name}`;
}

function gameAltText(game) {
  return `Immagine gioco ${game.type || game.name || ''}`.trim();
}

function gameTypeIcon(game) {
  const text = `${game.type || ''} ${game.name || ''}`.toLowerCase();
  if (text.includes('calciobalilla')) {
    return 'FB';
  }
  if (text.includes('freccette') || text.includes('darts')) {
    return 'DT';
  }
  if (text.includes('monopoli') || text.includes('board')) {
    return 'BG';
  }
  if (text.includes('bocce')) {
    return 'BC';
  }
  if (text.includes('biliardo')) {
    return 'BL';
  }
  if (text.includes('ping')) {
    return 'PP';
  }
  return 'GM';
}

function gameImage(game) {
  const text = `${game.type || ''} ${game.name || ''}`.toLowerCase();
  if (text.includes('calciobalilla')) {
    return 'img/game-calciobalilla.svg';
  }
  if (text.includes('freccette') || text.includes('darts')) {
    return 'img/game-darts.svg';
  }
  if (text.includes('monopoli') || text.includes('board')) {
    return 'img/game-board.svg';
  }
  if (text.includes('bocce')) {
    return 'img/game-bocce.svg';
  }
  if (text.includes('biliardo')) {
    return 'img/game-billiard.svg';
  }
  return 'img/game-default.svg';
}

function emptyState(title, text, actionHtml = '') {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(text)}</span>
      ${actionHtml}
    </div>
  `;
}

Object.assign(window, {
  gameStatusBadge,
  matchStatusBadge,
  goToLiveMatch,
  scoreText,
  gameTypeIcon,
  gameImage,
  gameAltText,
  emptyState
});
