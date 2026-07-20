function cleanEventName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizeGameRules(row = {}) {
  const scoreLimit = row.score_limit === null || row.score_limit === undefined || row.score_limit === ''
    ? null
    : Number(row.score_limit);

  return {
    startEvent: cleanEventName(row.start_event, 'MATCH_START'),
    scoreEventPlayer1: cleanEventName(row.score_event_player1, 'GOAL_PLAYER_1'),
    scoreEventPlayer2: cleanEventName(row.score_event_player2, 'GOAL_PLAYER_2'),
    endEvent: cleanEventName(row.end_event, 'MATCH_END'),
    scoreLimit: Number.isFinite(scoreLimit) && scoreLimit > 0 ? scoreLimit : null
  };
}

function eventAction(eventType, rules) {
  if (eventType === rules.startEvent) return 'START';
  if (eventType === rules.scoreEventPlayer1) return 'SCORE_PLAYER_1';
  if (eventType === rules.scoreEventPlayer2) return 'SCORE_PLAYER_2';
  if (eventType === rules.endEvent) return 'END';
  return 'GENERIC';
}

function scoreValue(payload = {}) {
  const raw = payload.value ?? payload.points ?? payload.score_delta ?? 1;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(Math.round(value), 1000);
}

function reachedScoreLimit(match, rules) {
  if (!rules.scoreLimit) return false;
  return Number(match.score1) >= rules.scoreLimit || Number(match.score2) >= rules.scoreLimit;
}

module.exports = {
  normalizeGameRules,
  eventAction,
  scoreValue,
  reachedScoreLimit
};
