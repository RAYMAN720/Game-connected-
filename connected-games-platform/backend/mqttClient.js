const mqtt = require('mqtt');
const { query } = require('./db');
const { processMatchEvent, getMatchRow } = require('./services/matchEventService');

const EVENT_TOPIC = 'locales/+/games/+/matches/+/events';
const HEARTBEAT_TOPIC = 'locales/+/edge/+/heartbeat';
let client = null;
let online = false;
let monitorTimer = null;

function mqttUrl() {
  return process.env.MQTT_URL || `mqtt://${process.env.MQTT_HOST || 'mqtt-broker'}:${process.env.MQTT_PORT || 1883}`;
}

async function processHeartbeat(payload) {
  const deviceId = Number(payload.device_id);
  if (!deviceId) throw new Error('device_id obbligatorio nell heartbeat');

  const queueSize = Math.max(0, Number(payload.queue_size) || 0);
  await query(
    `UPDATE edge_devices
     SET status='ONLINE',last_seen=CURRENT_TIMESTAMP,
         last_sync=CASE WHEN ?=0 THEN CURRENT_TIMESTAMP ELSE last_sync END
     WHERE id=?`,
    [queueSize, deviceId]
  );

  await query(
    `UPDATE games g
     JOIN sensors s ON s.game_id=g.id
     SET g.status=CASE
       WHEN g.status='IN_GAME' THEN 'IN_GAME'
       WHEN ?>0 THEN 'SYNC_PENDING'
       ELSE 'ONLINE'
     END
     WHERE s.edge_device_id=?`,
    [queueSize, deviceId]
  );
}

async function markSilentDevicesOffline() {
  await query(
    `UPDATE edge_devices
     SET status='OFFLINE'
     WHERE status='ONLINE'
       AND (last_seen IS NULL OR last_seen < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 20 SECOND))`
  );

  await query(
    `UPDATE games g
     JOIN sensors s ON s.game_id=g.id
     JOIN edge_devices d ON d.id=s.edge_device_id
     SET g.status='OFFLINE'
     WHERE d.status='OFFLINE' AND g.status NOT IN ('IN_GAME','SYNC_PENDING')`
  );
}

function startDeviceMonitor() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    markSilentDevicesOffline().catch((error) => console.error(`Monitor edge: ${error.message}`));
  }, 10000);
  monitorTimer.unref?.();
}

function connectMqtt() {
  if (client) return client;

  client = mqtt.connect(mqttUrl(), {
    clientId: `match-service-${Math.random().toString(16).slice(2)}`,
    reconnectPeriod: 2000,
    clean: false
  });

  client.on('connect', () => {
    online = true;
    client.subscribe([EVENT_TOPIC, HEARTBEAT_TOPIC], { qos: 1 });
    startDeviceMonitor();
    console.log('MQTT match service online');
  });

  client.on('close', () => { online = false; });
  client.on('error', (error) => {
    online = false;
    console.error(error.message);
  });

  client.on('message', async (topic, buffer) => {
    try {
      const payload = JSON.parse(buffer.toString());
      if (topic.includes('/heartbeat')) {
        await processHeartbeat(payload);
        return;
      }
      if (!payload.event_uuid) throw new Error('event_uuid obbligatorio');
      await processMatchEvent(payload);
    } catch (error) {
      console.error(`MQTT rifiutato: ${error.message}`);
    }
  });

  return client;
}

function getMqttStatus() {
  return online ? 'ONLINE' : 'OFFLINE';
}

async function startMqttSimulation(matchId) {
  const match = await getMatchRow(matchId);
  if (!match) {
    const error = new Error('Partita non trovata');
    error.status = 404;
    throw error;
  }

  const edgeUrl = process.env.EDGE_URL || 'http://edge-service:4000';
  const response = await fetch(`${edgeUrl}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      match_id: match.id,
      game_id: match.game_id,
      locale_id: match.locale_id,
      device_id: Number(process.env.SIMULATOR_DEVICE_ID || 1),
      player1_name: match.player1_name,
      player2_name: match.player2_name
    })
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Edge simulator non disponibile: ${text}`);
    error.status = 502;
    throw error;
  }

  return { alreadyRunning: false, edge: await response.json() };
}

module.exports = {
  connectMqtt,
  getMqttStatus,
  startMqttSimulation,
  processHeartbeat,
  markSilentDevicesOffline
};
