const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canViewMatch,
  canManageMatch,
  isParticipant,
  winnerFromScores
} = require('../utils/accessRules');

const match = {
  id: 10,
  locale_id: 1,
  player1_name: 'client',
  player2_name: 'luigi',
  score1: 4,
  score2: 2
};

test('platform admin can view every match but cannot manage local match events', () => {
  const user = { id: 1, username: 'platform', role: 'PLATFORM_ADMIN', locale_id: null };

  assert.equal(canViewMatch(user, match), true);
  assert.equal(canManageMatch(user, match), false);
});

test('local admin can view and manage matches only in his assigned locale', () => {
  const localAdmin = { id: 2, username: 'localadmin', role: 'LOCAL_ADMIN', locale_id: 1 };
  const otherLocalAdmin = { id: 6, username: 'otheradmin', role: 'LOCAL_ADMIN', locale_id: 2 };

  assert.equal(canViewMatch(localAdmin, match), true);
  assert.equal(canManageMatch(localAdmin, match), true);
  assert.equal(canViewMatch(otherLocalAdmin, match), false);
  assert.equal(canManageMatch(otherLocalAdmin, match), false);
});

test('client can view only matches where he is one of the players', () => {
  const playingClient = { id: 3, username: 'client', role: 'CLIENT', locale_id: 1 };
  const strangerClient = { id: 7, username: 'sara', role: 'CLIENT', locale_id: 1 };

  assert.equal(isParticipant(playingClient, match), true);
  assert.equal(canViewMatch(playingClient, match), true);
  assert.equal(canViewMatch(strangerClient, match), false);
});

test('winnerFromScores returns winner name or draw label', () => {
  assert.equal(winnerFromScores(match), 'client');
  assert.equal(winnerFromScores({ ...match, score1: 1, score2: 3 }), 'luigi');
  assert.equal(winnerFromScores({ ...match, score1: 2, score2: 2 }), 'Pareggio');
});
