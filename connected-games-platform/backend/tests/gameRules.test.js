const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeGameRules,
  eventAction,
  scoreValue,
  reachedScoreLimit
} = require('../utils/gameRules');

test('regole personalizzate riconoscono gli eventi configurati', () => {
  const rules = normalizeGameRules({
    start_event: 'DARTS_START',
    score_event_player1: 'DART_THROW_PLAYER_1',
    score_event_player2: 'DART_THROW_PLAYER_2',
    end_event: 'DARTS_END',
    score_limit: 301
  });
  assert.equal(eventAction('DART_THROW_PLAYER_1', rules), 'SCORE_PLAYER_1');
  assert.equal(eventAction('GOAL_PLAYER_1', rules), 'GENERIC');
  assert.equal(rules.scoreLimit, 301);
});

test('valore del punteggio usa value, points oppure uno', () => {
  assert.equal(scoreValue({ value: 60 }), 60);
  assert.equal(scoreValue({ points: 3 }), 3);
  assert.equal(scoreValue({}), 1);
  assert.equal(scoreValue({ value: -2 }), 1);
});

test('limite del punteggio termina la partita', () => {
  const rules = normalizeGameRules({ score_limit: 5 });
  assert.equal(reachedScoreLimit({ score1: 5, score2: 2 }, rules), true);
  assert.equal(reachedScoreLimit({ score1: 4, score2: 2 }, rules), false);
});

const { validateGameTypeInput } = require('../utils/validationRules');

test('gli eventi del tipo devono essere diversi e nel formato MQTT previsto', () => {
  assert.ok(validateGameTypeInput({ name: 'Test', description: 'x', start_event: 'START', score_event_player1: 'START' }).length > 0);
  assert.ok(validateGameTypeInput({ name: 'Test', description: 'x', start_event: 'evento con spazi' }).length > 0);
});
