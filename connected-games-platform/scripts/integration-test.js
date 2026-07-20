/*
 * Test end-to-end del progetto.
 * Avvio richiesto:
 *   docker compose down -v
 *   docker compose up --build -d
 * Esecuzione:
 *   node scripts/integration-test.js
 */
const apiBase = process.env.API_BASE_URL || 'http://localhost:3000/api';
const edgeBase = process.env.EDGE_BASE_URL || 'http://localhost:8090';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { throw new Error(`${url} non ha restituito JSON: ${text.slice(0, 120)}`); }
  if (!response.ok) throw new Error(`${response.status}: ${body?.message || text}`);
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

function headers(user) {
  return { 'x-user-id': String(user.id), accept: 'application/json' };
}

function writeOptions(user, body = {}) {
  return {
    method: 'POST',
    headers: { ...headers(user), 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}

async function poll(action, check, timeoutMs = 20000, intervalMs = 400) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await action();
    if (check(value)) return value;
    await wait(intervalMs);
  }
  throw new Error('Tempo massimo superato');
}

async function main() {
  let platform;
  let localAdmin;
  let gameAdmin;
  let client;
  let customType;
  let customGame;
  let customMatch;
  let customTournament;

  await test('Gateway, database, MQTT e microservizi online', async () => {
    const health = await jsonRequest(`${apiBase}/health`);
    assert(health.backend === 'ONLINE', 'gateway non pronto');
    assert(health.database === 'ONLINE', 'database non pronto');
    assert(health.mqtt === 'ONLINE', 'MQTT non pronto');
    assert(health.services?.catalog === 'ONLINE', 'catalog non pronto');
    assert(health.services?.match === 'ONLINE', 'match non pronto');
    assert(health.services?.tournament === 'ONLINE', 'tournament non pronto');
  });

  await test('Edge Service online e coda disponibile', async () => {
    const health = await jsonRequest(`${edgeBase}/health`);
    assert(health.service === 'edge', 'servizio edge non valido');
    assert(Array.isArray(health.running_matches), 'running_matches mancante');
    assert(Number.isInteger(health.queue_size), 'queue_size mancante');
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

  await test('Creazione di un tipo di gioco con eventi personalizzati', async () => {
    const suffix = Date.now();
    customType = await jsonRequest(`${apiBase}/game-types`, writeOptions(gameAdmin, {
      name: `Gioco Test ${suffix}`,
      description: 'Gioco semplice usato dal test di integrazione',
      start_event: 'TEST_START',
      score_event_player1: 'TEST_POINT_PLAYER_1',
      score_event_player2: 'TEST_POINT_PLAYER_2',
      end_event: 'TEST_END',
      score_limit: 3,
      supports_teams: true
    }));
    assert(customType.start_event === 'TEST_START', 'evento di inizio non salvato');
    assert(Number(customType.score_limit) === 3, 'limite non salvato');
  });

  await test('Configurazione di gioco, sensori e attuatore nel locale', async () => {
    customGame = await jsonRequest(`${apiBase}/games`, writeOptions(localAdmin, {
      name: 'Gioco test integrazione',
      game_type_id: customType.id,
      status: 'ONLINE'
    }));

    for (const eventType of ['TEST_START', 'TEST_POINT_PLAYER_1', 'TEST_POINT_PLAYER_2', 'TEST_END']) {
      await jsonRequest(`${apiBase}/sensors`, writeOptions(localAdmin, {
        edge_device_id: 1,
        game_id: customGame.id,
        name: `Sensore ${eventType}`,
        sensor_type: eventType
      }));
    }

    await jsonRequest(`${apiBase}/actuators`, writeOptions(localAdmin, {
      edge_device_id: 1,
      game_id: customGame.id,
      name: 'Display test',
      actuator_type: 'SCOREBOARD'
    }));

    const configuration = await jsonRequest(`${edgeBase}/configuration/${customGame.id}`);
    assert(configuration.sensors.length === 4, 'configurazione sensori incompleta');
    assert(configuration.score_event_player1 === 'TEST_POINT_PLAYER_1', 'regola non arrivata all edge');
  });

  await test('Creazione torneo multi-locale attivo', async () => {
    customTournament = await jsonRequest(`${apiBase}/tournaments`, writeOptions(platform, {
      name: 'Torneo integrazione',
      game_type_id: customType.id,
      participant_mode: 'INDIVIDUAL',
      status: 'ACTIVE',
      locale_ids: [1, 2],
      start_date: '2026-07-01',
      end_date: '2026-12-31'
    }));
    assert(customTournament.locations.length === 2, 'locali del torneo non salvati');
  });

  await test('Regole personalizzate, valore evento e deduplicazione UUID', async () => {
    customMatch = await jsonRequest(`${apiBase}/matches/start`, writeOptions(localAdmin, {
      game_id: customGame.id,
      participant_mode: 'INDIVIDUAL',
      player1_name: 'client',
      player2_name: 'luigi'
    }));

    await jsonRequest(`${apiBase}/matches/${customMatch.id}/events`, writeOptions(localAdmin, {
      event_uuid: 'integration-custom-start',
      event_type: 'TEST_START'
    }));

    const first = await jsonRequest(`${apiBase}/matches/${customMatch.id}/events`, writeOptions(localAdmin, {
      event_uuid: 'integration-custom-score-1',
      event_type: 'TEST_POINT_PLAYER_1',
      value: 2
    }));
    assert(Number(first.match.score1) === 2, 'valore 2 non applicato');

    const duplicate = await jsonRequest(`${apiBase}/matches/${customMatch.id}/events`, writeOptions(localAdmin, {
      event_uuid: 'integration-custom-score-1',
      event_type: 'TEST_POINT_PLAYER_1',
      value: 2
    }));
    assert(duplicate.duplicate === true, 'duplicato non riconosciuto');
    assert(Number(duplicate.match.score1) === 2, 'duplicato ha cambiato il punteggio');
  });

  await test('Fine automatica al raggiungimento del limite e collegamento torneo', async () => {
    const result = await jsonRequest(`${apiBase}/matches/${customMatch.id}/events`, writeOptions(localAdmin, {
      event_uuid: 'integration-custom-score-2',
      event_type: 'TEST_POINT_PLAYER_1',
      value: 1
    }));
    assert(result.match.status === 'FINISHED', 'partita non terminata automaticamente');
    assert(Number(result.match.score1) === 3, 'punteggio finale errato');
    assert(result.events.some((event) => event.event_type === 'TEST_END'), 'evento finale automatico mancante');

    const tournament = await jsonRequest(`${apiBase}/tournaments/${customTournament.id}`, {
      headers: headers(platform)
    });
    assert(tournament.matches.some((match) => Number(match.id) === Number(customMatch.id)), 'partita non collegata al torneo');
  });

  await test('Simulazione freccette offline e sincronizzazione successiva', async () => {
    await jsonRequest(`${edgeBase}/connection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: false })
    });

    const dartsMatch = await jsonRequest(`${apiBase}/matches/start`, writeOptions(localAdmin, {
      game_id: 2,
      participant_mode: 'INDIVIDUAL',
      player1_name: 'client',
      player2_name: 'luigi'
    }));

    await jsonRequest(`${apiBase}/matches/${dartsMatch.id}/simulate-mqtt`, writeOptions(localAdmin));

    const queued = await poll(
      () => jsonRequest(`${edgeBase}/state`),
      (state) => state.running_matches.length === 0 && state.queue.length > 0,
      30000
    );
    assert(queued.queue.some((event) => event.event_type.includes('DART')), 'eventi freccette non presenti in coda');

    await jsonRequest(`${edgeBase}/connection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: true })
    });

    await poll(
      () => jsonRequest(`${edgeBase}/state`),
      (state) => state.queue.length === 0,
      30000
    );

    const finished = await poll(
      () => jsonRequest(`${apiBase}/matches/${dartsMatch.id}`, { headers: headers(localAdmin) }),
      (details) => details.match.status === 'FINISHED',
      30000
    );
    assert(Math.max(Number(finished.match.score1), Number(finished.match.score2)) >= 301, 'limite freccette non raggiunto');
    assert(finished.events.some((event) => Number(event.event_value) > 1), 'valori dei tiri non registrati');
  });

  await test('Heartbeat, attuatori e statistiche complete', async () => {
    await wait(5500);
    const [devices, edgeState, statistics, ranking] = await Promise.all([
      jsonRequest(`${apiBase}/devices`, { headers: headers(localAdmin) }),
      jsonRequest(`${edgeBase}/state`),
      jsonRequest(`${apiBase}/statistics/global`, { headers: headers(platform) }),
      jsonRequest(`${apiBase}/statistics/ranking`, { headers: headers(client) })
    ]);
    assert(devices.find((device) => Number(device.id) === 1)?.status === 'ONLINE', 'heartbeat non aggiorna il dispositivo');
    assert(edgeState.actuators.length > 0, 'comandi attuatore non ricevuti');
    assert(Array.isArray(statistics.gameTypes), 'statistiche per tipo mancanti');
    assert('averagePointsPerMatch' in statistics, 'media punti mancante');
    assert(ranking.length > 0 && 'win_rate' in ranking[0], 'percentuale vittorie mancante');
  });

  console.log(`\nRisultato: ${passed} test superati, ${failed} test falliti.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Errore iniziale: ${error.message}`);
  process.exitCode = 1;
});
