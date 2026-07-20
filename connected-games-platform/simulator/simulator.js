const fs = require('fs');
const path = require('path');
const express = require('express');
const mqtt = require('mqtt');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const port = Number(process.env.PORT || 4000);
const mqttUrl = process.env.MQTT_URL || 'mqtt://mqtt-broker:1883';
const catalogUrl = process.env.CATALOG_URL || 'http://catalog-service:3001';
const edgeSharedKey = process.env.EDGE_SHARED_KEY || 'playconnect-edge-key';
const defaultDeviceId = Number(process.env.DEVICE_ID || 1);
const defaultLocaleId = Number(process.env.LOCALE_ID || 1);

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const queueFile = path.join(dataDir, 'offline-queue.json');
if (!fs.existsSync(queueFile)) fs.writeFileSync(queueFile, '[]');

let connected = false;
let forcedOffline = false;
let lastPublished = null;
let lastConfiguration = null;
const running = new Set();
const actuatorStates = new Map();

const client = mqtt.connect(mqttUrl, {
  clientId: `edge-${defaultDeviceId}`,
  reconnectPeriod: 2000,
  clean: false
});

function readQueue() {
  try { return JSON.parse(fs.readFileSync(queueFile, 'utf8')); }
  catch { return []; }
}

function writeQueue(queue) {
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function topicFor(event) {
  return `locales/${event.locale_id}/games/${event.game_id}/matches/${event.match_id}/events`;
}

function buildEvent(base, eventType, playerName, description, index, value = null) {
  return {
    event_uuid: `edge-${base.device_id}-${base.match_id}-${Date.now()}-${index}`,
    device_id: base.device_id,
    event_type: eventType,
    match_id: base.match_id,
    game_id: base.game_id,
    locale_id: base.locale_id,
    player_name: playerName || null,
    description,
    value,
    created_at: new Date().toISOString(),
    sync_status: connected && !forcedOffline ? 'SYNCED' : 'PENDING',
    source: 'EDGE_SIMULATOR'
  };
}

function publishRaw(topic, payload) {
  return new Promise((resolve, reject) => {
    if (!connected || forcedOffline) return reject(new Error('Edge offline'));
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => error ? reject(error) : resolve());
  });
}

async function publishOrQueue(event) {
  try {
    await publishRaw(topicFor(event), { ...event, sync_status: 'SYNCED' });
    lastPublished = event;
  } catch {
    const queue = readQueue();
    queue.push({ ...event, sync_status: 'PENDING' });
    writeQueue(queue);
  }
}

async function syncQueue() {
  if (!connected || forcedOffline) return;
  const queue = readQueue();
  const remaining = [];

  for (const event of queue) {
    try {
      await publishRaw(topicFor(event), { ...event, sync_status: 'SYNCED' });
      lastPublished = event;
      await wait(80);
    } catch {
      remaining.push(event);
    }
  }

  writeQueue(remaining);
}

async function loadConfiguration(deviceId, gameId) {
  const response = await fetch(`${catalogUrl}/internal/edge-config/${deviceId}/games/${gameId}`, {
    headers: { 'x-edge-key': edgeSharedKey, accept: 'application/json' }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Configurazione non disponibile: ${text}`);
  const configuration = JSON.parse(text);
  lastConfiguration = configuration;
  return configuration;
}

function activeSensorEvents(configuration) {
  return new Set(
    (configuration.sensors || [])
      .filter((sensor) => sensor.status === 'ACTIVE')
      .map((sensor) => sensor.sensor_type || sensor.type)
  );
}

function pointsForGame(configuration, remaining) {
  const gameType = String(configuration.game_type || '').toLowerCase();
  let value = 1;
  if (gameType.includes('frecc')) value = [20, 25, 40, 45, 50, 60][Math.floor(Math.random() * 6)];
  else if (gameType.includes('bocce')) value = 1 + Math.floor(Math.random() * 3);
  return Math.max(1, Math.min(value, remaining));
}

async function simulate(base) {
  if (running.has(base.match_id)) return;
  running.add(base.match_id);

  try {
    const configuration = await loadConfiguration(base.device_id, base.game_id);
    const sensors = activeSensorEvents(configuration);
    const rules = {
      start: configuration.start_event || 'MATCH_START',
      score1: configuration.score_event_player1 || 'GOAL_PLAYER_1',
      score2: configuration.score_event_player2 || 'GOAL_PLAYER_2',
      end: configuration.end_event || 'MATCH_END',
      limit: configuration.score_limit ? Number(configuration.score_limit) : null
    };

    const supports = (eventName) => sensors.size === 0 || sensors.has(eventName);
    let index = 0;

    if (supports(rules.start)) {
      await publishOrQueue(buildEvent(base, rules.start, null, 'Partita iniziata dal dispositivo edge', index));
      index += 1;
    }

    if (rules.limit) {
      const scores = [0, 0];
      const winnerIndex = Math.random() >= 0.5 ? 0 : 1;
      let turns = 0;

      while (scores[winnerIndex] < rules.limit && turns < 80) {
        await wait(250);
        const playerIndex = turns % 3 === 2 ? 1 - winnerIndex : winnerIndex;
        const eventType = playerIndex === 0 ? rules.score1 : rules.score2;
        if (!supports(eventType)) {
          turns += 1;
          continue;
        }

        const remaining = rules.limit - scores[playerIndex];
        const value = pointsForGame(configuration, remaining);
        scores[playerIndex] += value;
        const playerName = playerIndex === 0 ? base.player1_name : base.player2_name;
        await publishOrQueue(buildEvent(
          base,
          eventType,
          playerName,
          `${value} punti per ${playerName}`,
          index,
          value
        ));
        index += 1;
        turns += 1;
      }
    } else {
      for (let turn = 0; turn < 6; turn += 1) {
        await wait(300);
        const playerIndex = turn % 2;
        const eventType = playerIndex === 0 ? rules.score1 : rules.score2;
        if (!supports(eventType)) continue;
        const playerName = playerIndex === 0 ? base.player1_name : base.player2_name;
        await publishOrQueue(buildEvent(
          base,
          eventType,
          playerName,
          `Evento registrato per ${playerName}`,
          index,
          1
        ));
        index += 1;
      }

      await wait(250);
      if (supports(rules.end)) {
        await publishOrQueue(buildEvent(base, rules.end, null, 'Partita terminata dal dispositivo edge', index));
      }
    }
  } finally {
    running.delete(base.match_id);
    await syncQueue();
  }
}

client.on('connect', () => {
  connected = true;
  client.subscribe(`locales/${defaultLocaleId}/games/+/actuators/+/commands`, { qos: 1 });
  syncQueue().catch(console.error);
});
client.on('close', () => { connected = false; });
client.on('error', () => { connected = false; });
client.on('message', (topic, buffer) => {
  try {
    const payload = JSON.parse(buffer.toString());
    actuatorStates.set(String(payload.actuator_id || topic), { topic, ...payload });
  } catch {}
});

setInterval(() => {
  if (!connected || forcedOffline) return;
  client.publish(
    `locales/${defaultLocaleId}/edge/${defaultDeviceId}/heartbeat`,
    JSON.stringify({
      device_id: defaultDeviceId,
      locale_id: defaultLocaleId,
      status: 'ONLINE',
      queue_size: readQueue().length,
      timestamp: new Date().toISOString()
    }),
    { qos: 1 }
  );
  syncQueue().catch(console.error);
}, 5000);

app.get('/health', (req, res) => res.json({
  service: 'edge',
  mqtt: connected && !forcedOffline ? 'ONLINE' : 'OFFLINE',
  queue_size: readQueue().length,
  running_matches: [...running],
  timestamp: new Date().toISOString()
}));

app.get('/state', (req, res) => res.json({
  connected: connected && !forcedOffline,
  forced_offline: forcedOffline,
  queue: readQueue(),
  last_published: lastPublished,
  last_configuration: lastConfiguration,
  actuators: [...actuatorStates.values()],
  running_matches: [...running]
}));

app.get('/configuration/:gameId', async (req, res) => {
  try {
    const configuration = await loadConfiguration(defaultDeviceId, Number(req.params.gameId));
    res.json(configuration);
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
});

app.post('/connection', (req, res) => {
  forcedOffline = req.body.online === false;
  if (!forcedOffline) syncQueue().catch(console.error);
  res.json({ online: connected && !forcedOffline, forced_offline: forcedOffline });
});

app.post('/events', async (req, res) => {
  const base = {
    device_id: Number(req.body.device_id || defaultDeviceId),
    locale_id: Number(req.body.locale_id || defaultLocaleId),
    game_id: Number(req.body.game_id),
    match_id: Number(req.body.match_id)
  };
  if (!base.game_id || !base.match_id || !req.body.event_type) {
    return res.status(400).json({ message: 'game_id, match_id ed event_type obbligatori' });
  }

  const event = buildEvent(
    base,
    req.body.event_type,
    req.body.player_name,
    req.body.description || req.body.event_type,
    1,
    req.body.value ?? req.body.points ?? null
  );
  await publishOrQueue(event);
  return res.status(202).json({
    message: connected && !forcedOffline ? 'Evento pubblicato' : 'Evento salvato offline',
    event
  });
});

app.post('/simulate', (req, res) => {
  const base = {
    device_id: Number(req.body.device_id || defaultDeviceId),
    locale_id: Number(req.body.locale_id || defaultLocaleId),
    game_id: Number(req.body.game_id),
    match_id: Number(req.body.match_id),
    player1_name: req.body.player1_name || 'Giocatore 1',
    player2_name: req.body.player2_name || 'Giocatore 2'
  };

  if (!base.game_id || !base.match_id) {
    return res.status(400).json({ message: 'game_id e match_id obbligatori' });
  }
  if (running.has(base.match_id)) {
    return res.status(409).json({ message: 'Simulazione gia in corso' });
  }

  simulate(base).catch((error) => console.error(`Simulazione: ${error.message}`));
  return res.status(202).json({ message: 'Simulazione avviata', match_id: base.match_id });
});

app.listen(port, () => console.log(`Edge service sulla porta ${port}`));
