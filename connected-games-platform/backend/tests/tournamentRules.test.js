const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateTournamentRanking,
  canViewTournaments,
  canLinkMatchToTournament,
  shouldAutoLinkMatchToTournament
} = require('../utils/tournamentRules');

test('tournament ranking gives 3 points for a win', () => {
  const ranking = calculateTournamentRanking([
    {
      status: 'FINISHED',
      player1_name: 'mario',
      player2_name: 'luigi',
      score1: 5,
      score2: 3
    }
  ]);

  assert.deepEqual(ranking[0], {
    player_name: 'mario',
    played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    goals_for: 5,
    goals_against: 3,
    points: 3
  });

  assert.deepEqual(ranking[1], {
    player_name: 'luigi',
    played: 1,
    wins: 0,
    draws: 0,
    losses: 1,
    goals_for: 3,
    goals_against: 5,
    points: 0
  });
});

test('tournament ranking gives 1 point for a draw', () => {
  const ranking = calculateTournamentRanking([
    {
      status: 'FINISHED',
      player1_name: 'anna',
      player2_name: 'paolo',
      score1: 2,
      score2: 2
    }
  ]);

  assert.equal(ranking[0].draws, 1);
  assert.equal(ranking[0].points, 1);
  assert.equal(ranking[1].draws, 1);
  assert.equal(ranking[1].points, 1);
});

test('client can view tournaments', () => {
  assert.equal(canViewTournaments({ role: 'CLIENT' }), true);
});

test('local admin can link a finished match from his locale to a tournament', () => {
  const user = { role: 'LOCAL_ADMIN', locale_id: 1 };
  const match = { id: 10, locale_id: 1, status: 'FINISHED', game_type: 'Calciobalilla' };

  assert.equal(canLinkMatchToTournament(user, match), true);
  assert.equal(canLinkMatchToTournament({ role: 'LOCAL_ADMIN', locale_id: 2 }, match), false);
  assert.equal(canLinkMatchToTournament({ role: 'CLIENT', locale_id: 1 }, match), false);
});

test('finished match auto-links to active tournament with the same game type', () => {
  const match = { status: 'FINISHED', game_type: 'Calciobalilla' };
  const tournament = { status: 'ACTIVE', game_type: 'Calciobalilla' };

  assert.equal(shouldAutoLinkMatchToTournament(match, tournament), true);
  assert.equal(shouldAutoLinkMatchToTournament({ ...match, status: 'LIVE' }, tournament), false);
  assert.equal(shouldAutoLinkMatchToTournament(match, { ...tournament, status: 'FINISHED' }), false);
  assert.equal(shouldAutoLinkMatchToTournament(match, { ...tournament, game_type: 'Freccette' }), false);
});
