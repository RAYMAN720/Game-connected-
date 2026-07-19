/*
 * Test di integrazione semplice.
 * Prima avviare il progetto con: docker compose up --build -d
 * Poi eseguire: node scripts/integration-test.js
 */
const apiBase = process.env.API_BASE_URL || 'http://localhost:3000/api';
const edgeBase = process.env.EDGE_BASE_URL || 'http://localhost:8090';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${url} non ha restituito JSON: ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body?.message || text}`);
  }
  return body;
}

async function test(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK  - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`ERR - ${name}: ${error.message}`);
  }
}

async function login(username, password) {
  return jsonRequest(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

function authHeaders(user) {
  return { 'x-user-id': String(user.id), accept: 'application/json' };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(name, action, timeoutMs = 15000, intervalMs = 700) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await action();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw lastError || new Error(`Timeout durante: ${name}`);
}

async function main() {
  let platform;
  let localAdmin;
  let gameAdmin;
  let client;

  await test('API Gateway e tre microservizi online', async () => {
    const health = await jsonRequest(`${apiBase}/health`);
    assert(health.backend === 'ONLINE', 'backend non ONLINE');
    assert(health.services?.catalog === 'ONLINE', 'Catalog Service non ONLINE');
    assert(health.services?.match === 'ONLINE', 'Match Service non ONLINE');
    assert(health.services?.tournament === 'ONLINE', 'Tournament Service non ONLINE');
  });

  await test('Edge Service raggiungibile', async () => {
    const health = await jsonRequest(`${edgeBase}/health`);
    assert(health.service === 'edge', 'risposta edge non valida');
    assert(Array.isArray(health.running_matches), 'running_matches mancante');
  });

  await test('Login dei quattro ruoli', async () => {
    [platform, localAdmin, gameAdmin, client] = await Promise.all([
      login('platform', 'platform123'),
      login('localadmin', 'local123'),
      login('gameadmin', 'game123'),
      login('client', 'client123')
    ]);
    assert(platform.role === 'PLATFORM_ADMIN', 'ruolo platform errato');
    assert(localAdmin.role === 'LOCAL_ADMIN', 'ruolo localadmin errato');
    assert(gameAdmin.role === 'GAME_ADMIN', 'ruolo gameadmin errato');
    assert(client.role === 'CLIENT', 'ruolo client errato');
  });

  await test('Catalog Service: tipi di gioco, giochi e dispositivi', async () => {
    const [types, games, devices] = await Promise.all([
      jsonRequest(`${apiBase}/game-types`, { headers: authHeaders(gameAdmin) }),
      jsonRequest(`${apiBase}/games`, { headers: authHeaders(localAdmin) }),
      jsonRequest(`${apiBase}/devices`, { headers: authHeaders(localAdmin) })
    ]);
    assert(Array.isArray(types), 'game-types non e una lista');
    assert(Array.isArray(games), 'games non e una lista');
    assert(Array.isArray(devices), 'devices non e una lista');
  });

  await test('Match Service: elenco partite del giocatore', async () => {
    const matches = await jsonRequest(`${apiBase}/matches`, { headers: authHeaders(client) });
    assert(Array.isArray(matches), 'matches non e una lista');
  });

  await test('Tournament Service: tornei, squadre e statistiche', async () => {
    const [tournaments, teams, statistics] = await Promise.all([
      jsonRequest(`${apiBase}/tournaments`, { headers: authHeaders(client) }),
      jsonRequest(`${apiBase}/teams`, { headers: authHeaders(localAdmin) }),
      jsonRequest(`${apiBase}/statistics/global`, { headers: authHeaders(platform) })
    ]);
    assert(Array.isArray(tournaments), 'tournaments non e una lista');
    assert(Array.isArray(teams), 'teams non e una lista');
    assert(statistics && typeof statistics === 'object', 'statistiche non valide');
  });

  await test('Scenario reale: partita, MQTT, offline queue, deduplicazione e attuatore', async () => {
    await jsonRequest(`${edgeBase}/connection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: true })
    });

    const game = await jsonRequest(`${apiBase}/games`, {
      method: 'POST',
      headers: { ...authHeaders(localAdmin), 'content-type': 'application/json' },
      body: JSON.stringify({
        name: `Calciobalilla test ${Date.now()}`,
        game_type_id: 1,
        status: 'ONLINE'
      })
    });

    const actuator = await jsonRequest(`${apiBase}/actuators`, {
      method: 'POST',
      headers: { ...authHeaders(localAdmin), 'content-type': 'application/json' },
      body: JSON.stringify({
        edge_device_id: 1,
        game_id: game.id,
        name: `Display test ${game.id}`,
        actuator_type: 'SCOREBOARD'
      })
    });

    const match = await jsonRequest(`${apiBase}/matches/start`, {
      method: 'POST',
      headers: { ...authHeaders(localAdmin), 'content-type': 'application/json' },
      body: JSON.stringify({
        game_id: game.id,
        participant_mode: 'INDIVIDUAL',
        player1_name: 'mario',
        player2_name: 'luigi'
      })
    });
    assert(match.status === 'LIVE', 'partita test non LIVE');

    await jsonRequest(`${edgeBase}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        game_id: game.id,
        match_id: match.id,
        event_type: 'GOAL_PLAYER_1',
        player_name: 'mario',
        description: 'Punto online da integrazione'
      })
    });

    await waitFor('evento MQTT online', async () => {
      const details = await jsonRequest(`${apiBase}/matches/${match.id}`, { headers: authHeaders(localAdmin) });
      return details.match.score1 >= 1 && details.events.some((event) => event.description === 'Punto online da integrazione');
    });

    await jsonRequest(`${edgeBase}/connection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: false })
    });

    const queued = await jsonRequest(`${edgeBase}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        game_id: game.id,
        match_id: match.id,
        event_type: 'GOAL_PLAYER_2',
        player_name: 'luigi',
        description: 'Punto offline da integrazione'
      })
    });
    assert(queued.event?.sync_status === 'PENDING', 'evento offline non marcato PENDING');

    const offlineState = await jsonRequest(`${edgeBase}/state`);
    assert(offlineState.forced_offline === true, 'edge non forzato offline');
    assert(offlineState.queue.length >= 1, 'coda offline vuota');

    await jsonRequest(`${edgeBase}/connection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: true })
    });

    await waitFor('sincronizzazione evento offline', async () => {
      const details = await jsonRequest(`${apiBase}/matches/${match.id}`, { headers: authHeaders(localAdmin) });
      return details.match.score2 >= 1 && details.events.some((event) => event.description === 'Punto offline da integrazione');
    }, 20000);

    const syncedState = await waitFor('svuotamento coda edge', async () => {
      const state = await jsonRequest(`${edgeBase}/state`);
      return state.queue.length === 0 ? state : null;
    }, 20000);
    assert(syncedState.queue.length === 0, 'coda edge non svuotata');

    const ended = await jsonRequest(`${apiBase}/matches/${match.id}/end`, {
      method: 'POST',
      headers: authHeaders(localAdmin)
    });
    assert(ended.match.status === 'FINISHED', 'partita non conclusa');

    const actuators = await jsonRequest(`${apiBase}/actuators`, { headers: authHeaders(localAdmin) });
    const updatedActuator = actuators.find((item) => Number(item.id) === Number(actuator.id));
    assert(updatedActuator?.state?.startsWith('FINAL'), 'attuatore non aggiornato a FINAL');
  });

  console.log(`\nRisultato: ${passed} test superati, ${failed} test falliti.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Errore iniziale: ${error.message}`);
  process.exitCode = 1;
});
