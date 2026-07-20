const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const htmlFiles = walk(path.join(root, 'frontend')).filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (reference.startsWith('http') || reference.startsWith('#') || reference.startsWith('mailto:')) continue;
    const target = path.resolve(path.dirname(file), reference.split('?')[0]);
    check(fs.existsSync(target), `${path.relative(root, file)} references missing ${reference}`);
  }
}

const requiredFiles = [
  'frontend/game-admin-dashboard.html',
  'frontend/game-admin-devices.html',
  'frontend/local-admin-devices.html',
  'frontend/platform-users.html',
  'frontend/teams.html',
  'frontend/live-match.html',
  'gateway/server.js',
  'simulator/simulator.js',
  'simulator/public/index.html',
  'backend/utils/gameRules.js',
  'backend/controllers/internalController.js',
  'backend/routes/internalRoutes.js',
  'backend/tests/gameRules.test.js',
  'docs/00-relazione-finale.pdf',
  'docs/openapi.yaml',
  'docs/final/PlayConnect_Relazione_Finale.docx',
  'docs/final/PlayConnect_Relazione_Finale.pdf',
  'docs/final/PlayConnect_Diagrammi.docx',
  'docs/final/PlayConnect_Diagrammi.pdf',
  'scripts/integration-test.js',
  'START_HERE.md'
];

for (const file of requiredFiles) {
  check(fs.existsSync(path.join(root, file)), `Missing required file ${file}`);
}

const figures = [
  '01-casi-uso.png',
  '02-architettura.png',
  '03-dominio.png',
  '04-package.png',
  '05-classi-implementazione.png',
  '06-sequenza-online.png',
  '07-sequenza-offline.png',
  '08-deployment.png'
];
for (const figure of figures) {
  check(fs.existsSync(path.join(root, 'docs', 'figures', figure)), `Missing figure ${figure}`);
}

const sql = read('database/init.sql');
for (const item of [
  'GAME_ADMIN',
  'game_types',
  'sensor_templates',
  'actuators',
  'teams',
  'tournament_locations',
  'participant_mode',
  'event_value',
  'payload_json',
  'user_sessions',
  'DART_THROW_PLAYER_1',
  'POINT_PLAYER_1'
]) {
  check(sql.includes(item), `Database missing ${item}`);
}

const compose = read('docker-compose.yml');
for (const service of [
  'catalog-service',
  'match-service',
  'tournament-service',
  'api-gateway',
  'edge-service',
  'mqtt-broker',
  'frontend',
  'mysql'
]) {
  check(compose.includes(`${service}:`), `Compose missing ${service}`);
}
for (const item of ['EDGE_SHARED_KEY', 'CATALOG_URL', 'depends_on']) {
  check(compose.includes(item), `Compose missing ${item}`);
}

const matchService = read('backend/services/matchEventService.js');
for (const item of [
  'normalizeGameRules',
  'eventAction',
  'scoreValue',
  'reachedScoreLimit',
  'event_value',
  'payload_json'
]) {
  check(matchService.includes(item), `Match service missing ${item}`);
}

const mqttClient = read('backend/mqttClient.js');
for (const item of ['heartbeat', 'last_seen', 'last_sync', 'OFFLINE']) {
  check(mqttClient.includes(item), `MQTT client missing ${item}`);
}

const authMiddleware = read('backend/middleware/auth.js');
for (const item of ['x-session-id', 'user_sessions', 'expires_at']) {
  check(authMiddleware.includes(item), `Auth middleware missing ${item}`);
}

const simulator = read('simulator/simulator.js');
for (const item of ['offline-queue.json', 'loadConfiguration', 'event_uuid', 'queue_size']) {
  check(simulator.includes(item), `Simulator missing ${item}`);
}

const openApi = read('docs/openapi.yaml');
const publicPathCount = (openApi.match(/^  \/[^\n]+:/gm) || []).length;
check(openApi.includes('openapi: 3.0.3'), 'OpenAPI version is not 3.0.3');
check(publicPathCount >= 41, `OpenAPI contains only ${publicPathCount} paths`);
check(openApi.includes('/actuators/{id}:'), 'OpenAPI actuator update/delete path missing');
check(/\n\s{8}value:\n/.test(openApi), 'OpenAPI event value field missing');

if (failures.length > 0) {
  console.error(`FAILED ${failures.length}/${checks}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Project validation passed: ${checks} checks`);
