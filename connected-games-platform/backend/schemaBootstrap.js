const { query } = require('./db');
const { hashPassword } = require('./utils/password');

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0].total) > 0;
}

async function indexExists(tableName, indexName) {
  const rows = await query(
    `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return Number(rows[0].total) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await columnExists(tableName, columnName))) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function addIndexIfMissing(tableName, indexName, columns, unique = false) {
  if (!(await indexExists(tableName, indexName))) {
    await query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${indexName} ON ${tableName}(${columns})`);
  }
}

async function ensureSupportSchema() {
  await addColumnIfMissing('users', 'password_hash', 'VARCHAR(255) NULL AFTER password');
  await query(`ALTER TABLE users MODIFY COLUMN password VARCHAR(100) NULL`);
  await query(`ALTER TABLE users MODIFY COLUMN role ENUM('PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN','CLIENT') NOT NULL`);
  await query(`ALTER TABLE games MODIFY COLUMN status ENUM('ONLINE','OFFLINE','IN_GAME','SYNC_PENDING') DEFAULT 'ONLINE'`);
  await query(`ALTER TABLE matches MODIFY COLUMN status ENUM('LIVE','FINISHED','SYNC_PENDING') DEFAULT 'LIVE'`);

  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS game_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL,
      start_event VARCHAR(80) NOT NULL DEFAULT 'MATCH_START',
      score_event_player1 VARCHAR(80) NOT NULL DEFAULT 'GOAL_PLAYER_1',
      score_event_player2 VARCHAR(80) NOT NULL DEFAULT 'GOAL_PLAYER_2',
      end_event VARCHAR(80) NOT NULL DEFAULT 'MATCH_END',
      score_limit INT NULL,
      supports_teams BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sensor_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_type_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      description VARCHAR(255) NOT NULL,
      CONSTRAINT fk_sensor_templates_game_type
        FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE CASCADE
    )
  `);

  await addColumnIfMissing('games', 'game_type_id', 'INT NULL AFTER locale_id');

  await query(`
    CREATE TABLE IF NOT EXISTS edge_devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      locale_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      status ENUM('ONLINE','OFFLINE') DEFAULT 'OFFLINE',
      last_seen DATETIME NULL,
      last_sync DATETIME NULL,
      CONSTRAINT fk_edge_devices_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE CASCADE
    )
  `);
  await addColumnIfMissing('edge_devices', 'last_sync', 'DATETIME NULL');

  await query(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      edge_device_id INT NOT NULL,
      game_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(80) NOT NULL,
      sensor_type VARCHAR(80) NOT NULL,
      mqtt_topic VARCHAR(255) NOT NULL,
      status ENUM('ACTIVE','INACTIVE','OFFLINE') DEFAULT 'ACTIVE',
      CONSTRAINT fk_sensors_edge_device FOREIGN KEY (edge_device_id) REFERENCES edge_devices(id) ON DELETE CASCADE,
      CONSTRAINT fk_sensors_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);
  await addColumnIfMissing('sensors', 'type', 'VARCHAR(80) NULL');
  await query("UPDATE sensors SET type = sensor_type WHERE type IS NULL OR type = ''");

  await query(`
    CREATE TABLE IF NOT EXISTS actuators (
      id INT AUTO_INCREMENT PRIMARY KEY,
      edge_device_id INT NOT NULL,
      game_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      actuator_type VARCHAR(80) NOT NULL,
      state VARCHAR(120) NOT NULL DEFAULT 'IDLE',
      mqtt_topic VARCHAR(255) NOT NULL,
      status ENUM('ACTIVE','INACTIVE','OFFLINE') DEFAULT 'ACTIVE',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_actuators_edge_device FOREIGN KEY (edge_device_id) REFERENCES edge_devices(id) ON DELETE CASCADE,
      CONSTRAINT fk_actuators_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      locale_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_teams_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE SET NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (team_id, user_id),
      CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await addColumnIfMissing('matches', 'participant_mode', "ENUM('INDIVIDUAL','TEAM') NOT NULL DEFAULT 'INDIVIDUAL' AFTER locale_id");
  await addColumnIfMissing('matches', 'team1_id', 'INT NULL AFTER player2_id');
  await addColumnIfMissing('matches', 'team2_id', 'INT NULL AFTER team1_id');
  await addColumnIfMissing('match_events', 'event_uuid', 'VARCHAR(100) NULL');
  await addColumnIfMissing('match_events', 'event_value', 'INT NULL');
  await addColumnIfMissing('match_events', 'payload_json', 'JSON NULL');
  await query(`ALTER TABLE match_events MODIFY COLUMN event_type VARCHAR(80) NOT NULL`);
  await addColumnIfMissing('match_events', 'sync_status', "ENUM('PENDING','SYNCED','FAILED') DEFAULT 'SYNCED'");
  await addColumnIfMissing('match_events', 'received_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addIndexIfMissing('match_events', 'unique_match_event_uuid', 'event_uuid', true);

  await query(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      game_type_id INT NULL,
      game_type VARCHAR(100) NOT NULL,
      participant_mode ENUM('INDIVIDUAL','TEAM') NOT NULL DEFAULT 'INDIVIDUAL',
      status ENUM('DRAFT','ACTIVE','FINISHED') DEFAULT 'DRAFT',
      start_date DATE NULL,
      end_date DATE NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await addColumnIfMissing('tournaments', 'game_type_id', 'INT NULL AFTER name');
  await addColumnIfMissing('tournaments', 'participant_mode', "ENUM('INDIVIDUAL','TEAM') NOT NULL DEFAULT 'INDIVIDUAL' AFTER game_type");
  await addColumnIfMissing('tournaments', 'start_date', 'DATE NULL');
  await addColumnIfMissing('tournaments', 'end_date', 'DATE NULL');
  await query(`ALTER TABLE tournaments MODIFY COLUMN status ENUM('DRAFT','ACTIVE','FINISHED') DEFAULT 'DRAFT'`);

  await query(`
    CREATE TABLE IF NOT EXISTS tournament_locations (
      tournament_id INT NOT NULL,
      locale_id INT NOT NULL,
      PRIMARY KEY (tournament_id, locale_id),
      CONSTRAINT fk_tournament_locations_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_tournament_locations_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tournament_teams (
      tournament_id INT NOT NULL,
      team_id INT NOT NULL,
      PRIMARY KEY (tournament_id, team_id),
      CONSTRAINT fk_tournament_teams_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_tournament_teams_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tournament_matches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tournament_id INT NOT NULL,
      match_id INT NOT NULL,
      round_number INT NOT NULL DEFAULT 1,
      scheduled_at DATETIME NULL,
      UNIQUE KEY unique_tournament_match (tournament_id, match_id),
      CONSTRAINT fk_tournament_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_tournament_matches_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    )
  `);
  await addColumnIfMissing('tournament_matches', 'round_number', 'INT NOT NULL DEFAULT 1');
  await addColumnIfMissing('tournament_matches', 'scheduled_at', 'DATETIME NULL');

  await query(`INSERT INTO game_types
    (id, name, description, start_event, score_event_player1, score_event_player2, end_event, score_limit, supports_teams)
    VALUES
      (1, 'Calciobalilla', 'Goal rilevati da due sensori sulle porte.', 'MATCH_START', 'GOAL_PLAYER_1', 'GOAL_PLAYER_2', 'MATCH_END', 5, TRUE),
      (2, 'Freccette', 'Ogni tiro invia il valore ottenuto dal giocatore.', 'DARTS_START', 'DART_THROW_PLAYER_1', 'DART_THROW_PLAYER_2', 'DARTS_END', 301, TRUE),
      (3, 'Bocce', 'I sensori assegnano uno o piu punti al termine della manche.', 'BOCCE_START', 'POINT_PLAYER_1', 'POINT_PLAYER_2', 'BOCCE_END', 13, TRUE),
      (4, 'Monopoli', 'I pulsanti software registrano gli eventi principali della partita.', 'MONOPOLY_START', 'EVENT_PLAYER_1', 'EVENT_PLAYER_2', 'MONOPOLY_END', NULL, FALSE)
    ON DUPLICATE KEY UPDATE
      description=VALUES(description),start_event=VALUES(start_event),
      score_event_player1=VALUES(score_event_player1),score_event_player2=VALUES(score_event_player2),
      end_event=VALUES(end_event),score_limit=VALUES(score_limit),supports_teams=VALUES(supports_teams)`);

  const templates = [
    [1, 'Pulsante inizio', 'MATCH_START', 'Avvia la partita'],
    [1, 'Sensore porta 1', 'GOAL_PLAYER_1', 'Aggiunge un goal al partecipante 1'],
    [1, 'Sensore porta 2', 'GOAL_PLAYER_2', 'Aggiunge un goal al partecipante 2'],
    [1, 'Pulsante fine', 'MATCH_END', 'Termina la partita'],
    [2, 'Pulsante inizio freccette', 'DARTS_START', 'Avvia una partita di freccette'],
    [2, 'Tiro giocatore 1', 'DART_THROW_PLAYER_1', 'Invia il valore del tiro del giocatore 1'],
    [2, 'Tiro giocatore 2', 'DART_THROW_PLAYER_2', 'Invia il valore del tiro del giocatore 2'],
    [2, 'Pulsante fine freccette', 'DARTS_END', 'Termina la partita di freccette'],
    [3, 'Inizio manche bocce', 'BOCCE_START', 'Avvia una partita di bocce'],
    [3, 'Punto squadra 1', 'POINT_PLAYER_1', 'Assegna i punti alla squadra 1'],
    [3, 'Punto squadra 2', 'POINT_PLAYER_2', 'Assegna i punti alla squadra 2'],
    [3, 'Fine partita bocce', 'BOCCE_END', 'Termina la partita di bocce'],
    [4, 'Inizio Monopoli', 'MONOPOLY_START', 'Avvia la partita'],
    [4, 'Evento partecipante 1', 'EVENT_PLAYER_1', 'Registra un evento del partecipante 1'],
    [4, 'Evento partecipante 2', 'EVENT_PLAYER_2', 'Registra un evento del partecipante 2'],
    [4, 'Fine Monopoli', 'MONOPOLY_END', 'Termina la partita']
  ];
  for (const template of templates) {
    await query(`INSERT INTO sensor_templates (game_type_id,name,event_type,description)
      SELECT ?,?,?,? WHERE NOT EXISTS (
        SELECT 1 FROM sensor_templates WHERE game_type_id=? AND event_type=?
      )`, [...template, template[0], template[2]]);
  }

  await query(`UPDATE games g JOIN game_types gt ON gt.name = g.type SET g.game_type_id = gt.id WHERE g.game_type_id IS NULL`);

  await query(`INSERT INTO users (username, password, role, locale_id)
    SELECT 'gameadmin', 'game123', 'GAME_ADMIN', NULL
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'gameadmin')`);

  const legacyUsers = await query(`SELECT id,password FROM users WHERE password_hash IS NULL AND password IS NOT NULL`);
  for (const user of legacyUsers) {
    await query('UPDATE users SET password_hash=?, password=NULL WHERE id=?', [hashPassword(user.password), user.id]);
  }

  await query(`INSERT INTO actuators (edge_device_id, game_id, name, actuator_type, state, mqtt_topic, status)
    SELECT 1, 1, 'Display punteggio', 'SCOREBOARD', 'IDLE', 'locales/1/games/1/actuators/1/commands', 'ACTIVE'
    WHERE EXISTS (SELECT 1 FROM edge_devices WHERE id = 1)
      AND EXISTS (SELECT 1 FROM games WHERE id = 1)
      AND NOT EXISTS (SELECT 1 FROM actuators WHERE edge_device_id = 1 AND game_id = 1 AND actuator_type = 'SCOREBOARD')`);

  const dartSensors = [
    ['Avvio freccette', 'DARTS_START'],
    ['Tiro giocatore 1', 'DART_THROW_PLAYER_1'],
    ['Tiro giocatore 2', 'DART_THROW_PLAYER_2'],
    ['Fine freccette', 'DARTS_END']
  ];
  for (const [name, eventType] of dartSensors) {
    await query(`INSERT INTO sensors (edge_device_id,game_id,name,type,sensor_type,mqtt_topic,status)
      SELECT 1,2,?,?,?,'locales/1/games/2/matches/{matchId}/events','ACTIVE'
      WHERE EXISTS (SELECT 1 FROM edge_devices WHERE id=1)
        AND EXISTS (SELECT 1 FROM games WHERE id=2)
        AND NOT EXISTS (SELECT 1 FROM sensors WHERE edge_device_id=1 AND game_id=2 AND sensor_type=?)`,
      [name,eventType,eventType,eventType]);
  }

  await query(`INSERT INTO actuators (edge_device_id,game_id,name,actuator_type,state,mqtt_topic,status)
    SELECT 1,2,'Display freccette','SCOREBOARD','IDLE','locales/1/games/2/actuators/3/commands','ACTIVE'
    WHERE EXISTS (SELECT 1 FROM edge_devices WHERE id=1)
      AND EXISTS (SELECT 1 FROM games WHERE id=2)
      AND NOT EXISTS (SELECT 1 FROM actuators WHERE edge_device_id=1 AND game_id=2 AND actuator_type='SCOREBOARD')`);

  console.log('Schema completo pronto');
}

module.exports = { ensureSupportSchema };
