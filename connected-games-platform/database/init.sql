CREATE DATABASE IF NOT EXISTS connected_games;
USE connected_games;

CREATE TABLE IF NOT EXISTS locales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('PLATFORM_ADMIN','LOCAL_ADMIN','GAME_ADMIN','CLIENT') NOT NULL,
  locale_id INT NULL,
  CONSTRAINT fk_users_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE SET NULL
);

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
);

CREATE TABLE IF NOT EXISTS sensor_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_type_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  CONSTRAINT fk_sensor_templates_game_type FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locale_id INT NOT NULL,
  game_type_id INT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status ENUM('ONLINE','OFFLINE','IN_GAME','SYNC_PENDING') DEFAULT 'ONLINE',
  CONSTRAINT fk_games_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE CASCADE,
  CONSTRAINT fk_games_game_type FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS edge_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locale_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  status ENUM('ONLINE','OFFLINE') DEFAULT 'OFFLINE',
  last_seen DATETIME NULL,
  last_sync DATETIME NULL,
  CONSTRAINT fk_edge_devices_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE CASCADE
);

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
);

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
);

CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  locale_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teams_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (team_id, user_id),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  locale_id INT NOT NULL,
  participant_mode ENUM('INDIVIDUAL','TEAM') NOT NULL DEFAULT 'INDIVIDUAL',
  player1_id INT NULL,
  player2_id INT NULL,
  team1_id INT NULL,
  team2_id INT NULL,
  player1_name VARCHAR(100) NOT NULL,
  player2_name VARCHAR(100) NOT NULL,
  score1 INT DEFAULT 0,
  score2 INT DEFAULT 0,
  winner_name VARCHAR(100) NULL,
  status ENUM('LIVE','FINISHED','SYNC_PENDING') DEFAULT 'LIVE',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  CONSTRAINT fk_matches_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_player1 FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_player2 FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_team1 FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_team2 FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  event_uuid VARCHAR(100) UNIQUE NULL,
  event_type VARCHAR(80) NOT NULL,
  player_name VARCHAR(100) NULL,
  description VARCHAR(255) NOT NULL,
  event_value INT NULL,
  payload_json JSON NULL,
  sync_status ENUM('PENDING','SYNCED','FAILED') DEFAULT 'SYNCED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  game_type_id INT NULL,
  game_type VARCHAR(100) NOT NULL,
  participant_mode ENUM('INDIVIDUAL','TEAM') NOT NULL DEFAULT 'INDIVIDUAL',
  status ENUM('DRAFT','ACTIVE','FINISHED') DEFAULT 'DRAFT',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tournaments_game_type FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tournament_locations (
  tournament_id INT NOT NULL,
  locale_id INT NOT NULL,
  PRIMARY KEY (tournament_id, locale_id),
  CONSTRAINT fk_tournament_locations_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_locations_locale FOREIGN KEY (locale_id) REFERENCES locales(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournament_teams (
  tournament_id INT NOT NULL,
  team_id INT NOT NULL,
  PRIMARY KEY (tournament_id, team_id),
  CONSTRAINT fk_tournament_teams_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_teams_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  match_id INT NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  scheduled_at DATETIME NULL,
  CONSTRAINT fk_tournament_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_matches_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tournament_match (tournament_id, match_id)
);

CREATE INDEX idx_games_locale ON games(locale_id);
CREATE INDEX idx_games_type ON games(game_type_id);
CREATE INDEX idx_matches_locale ON matches(locale_id);
CREATE INDEX idx_matches_game ON matches(game_id);
CREATE INDEX idx_events_match ON match_events(match_id);
CREATE INDEX idx_edge_devices_locale ON edge_devices(locale_id);
CREATE INDEX idx_sensors_device ON sensors(edge_device_id);
CREATE INDEX idx_actuators_device ON actuators(edge_device_id);
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);

INSERT INTO locales (id, name, city, address) VALUES
  (1, 'Bar Belvedere', 'Roma', 'Via Roma 12'),
  (2, 'Sala Giochi Centrale', 'Torino', 'Corso Francia 88'),
  (3, 'Casa di Mario', 'Milano', 'Via Milano 5');

INSERT INTO users (id, username, password, password_hash, role, locale_id) VALUES
  (1, 'platform', 'platform123', NULL, 'PLATFORM_ADMIN', NULL),
  (2, 'localadmin', 'local123', NULL, 'LOCAL_ADMIN', 1),
  (3, 'client', 'client123', NULL, 'CLIENT', 1),
  (4, 'luigi', 'luigi123', NULL, 'CLIENT', 1),
  (5, 'mario', 'mario123', NULL, 'CLIENT', 1),
  (6, 'gameadmin', 'game123', NULL, 'GAME_ADMIN', NULL);

INSERT INTO game_types
  (id, name, description, start_event, score_event_player1, score_event_player2, end_event, score_limit, supports_teams)
VALUES
  (1, 'Calciobalilla', 'Goal rilevati da due sensori sulle porte.', 'MATCH_START', 'GOAL_PLAYER_1', 'GOAL_PLAYER_2', 'MATCH_END', 5, TRUE),
  (2, 'Freccette', 'Ogni tiro invia il valore ottenuto dal giocatore.', 'DARTS_START', 'DART_THROW_PLAYER_1', 'DART_THROW_PLAYER_2', 'DARTS_END', 301, TRUE),
  (3, 'Bocce', 'I sensori assegnano uno o piu punti al termine della manche.', 'BOCCE_START', 'POINT_PLAYER_1', 'POINT_PLAYER_2', 'BOCCE_END', 13, TRUE),
  (4, 'Monopoli', 'I pulsanti software registrano gli eventi principali della partita.', 'MONOPOLY_START', 'EVENT_PLAYER_1', 'EVENT_PLAYER_2', 'MONOPOLY_END', NULL, FALSE);

INSERT INTO sensor_templates (game_type_id, name, event_type, description) VALUES
  (1, 'Pulsante inizio', 'MATCH_START', 'Avvia la partita'),
  (1, 'Sensore porta 1', 'GOAL_PLAYER_1', 'Aggiunge un goal al partecipante 1'),
  (1, 'Sensore porta 2', 'GOAL_PLAYER_2', 'Aggiunge un goal al partecipante 2'),
  (1, 'Pulsante fine', 'MATCH_END', 'Termina la partita'),
  (2, 'Pulsante inizio freccette', 'DARTS_START', 'Avvia una partita di freccette'),
  (2, 'Tiro giocatore 1', 'DART_THROW_PLAYER_1', 'Invia il valore del tiro del giocatore 1'),
  (2, 'Tiro giocatore 2', 'DART_THROW_PLAYER_2', 'Invia il valore del tiro del giocatore 2'),
  (2, 'Pulsante fine freccette', 'DARTS_END', 'Termina la partita di freccette'),
  (3, 'Inizio manche bocce', 'BOCCE_START', 'Avvia una partita di bocce'),
  (3, 'Punto squadra 1', 'POINT_PLAYER_1', 'Assegna i punti alla squadra 1'),
  (3, 'Punto squadra 2', 'POINT_PLAYER_2', 'Assegna i punti alla squadra 2'),
  (3, 'Fine partita bocce', 'BOCCE_END', 'Termina la partita di bocce'),
  (4, 'Inizio Monopoli', 'MONOPOLY_START', 'Avvia la partita'),
  (4, 'Evento partecipante 1', 'EVENT_PLAYER_1', 'Registra un evento del partecipante 1'),
  (4, 'Evento partecipante 2', 'EVENT_PLAYER_2', 'Registra un evento del partecipante 2'),
  (4, 'Fine Monopoli', 'MONOPOLY_END', 'Termina la partita');

INSERT INTO games (id, locale_id, game_type_id, name, type, status) VALUES
  (1, 1, 1, 'Calciobalilla verde', 'Calciobalilla', 'ONLINE'),
  (2, 1, 2, 'Freccette Pro', 'Freccette', 'ONLINE'),
  (3, 2, 4, 'Monopoli Smart', 'Monopoli', 'OFFLINE');

INSERT INTO edge_devices (id, locale_id, name, status, last_seen, last_sync) VALUES
  (1, 1, 'Edge Bar Belvedere 01', 'ONLINE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 2, 'Edge Sala Giochi 01', 'OFFLINE', NULL, NULL);

INSERT INTO sensors (id, edge_device_id, game_id, name, type, sensor_type, mqtt_topic, status) VALUES
  (1, 1, 1, 'Pulsante avvio', 'MATCH_START', 'MATCH_START', 'locales/1/games/1/matches/{matchId}/events', 'ACTIVE'),
  (2, 1, 1, 'Sensore goal giocatore 1', 'GOAL_PLAYER_1', 'GOAL_PLAYER_1', 'locales/1/games/1/matches/{matchId}/events', 'ACTIVE'),
  (3, 1, 1, 'Sensore goal giocatore 2', 'GOAL_PLAYER_2', 'GOAL_PLAYER_2', 'locales/1/games/1/matches/{matchId}/events', 'ACTIVE'),
  (4, 1, 1, 'Pulsante fine', 'MATCH_END', 'MATCH_END', 'locales/1/games/1/matches/{matchId}/events', 'ACTIVE'),
  (5, 1, 2, 'Avvio freccette', 'DARTS_START', 'DARTS_START', 'locales/1/games/2/matches/{matchId}/events', 'ACTIVE'),
  (6, 1, 2, 'Tiro giocatore 1', 'DART_THROW_PLAYER_1', 'DART_THROW_PLAYER_1', 'locales/1/games/2/matches/{matchId}/events', 'ACTIVE'),
  (7, 1, 2, 'Tiro giocatore 2', 'DART_THROW_PLAYER_2', 'DART_THROW_PLAYER_2', 'locales/1/games/2/matches/{matchId}/events', 'ACTIVE'),
  (8, 1, 2, 'Fine freccette', 'DARTS_END', 'DARTS_END', 'locales/1/games/2/matches/{matchId}/events', 'ACTIVE');

INSERT INTO actuators (id, edge_device_id, game_id, name, actuator_type, state, mqtt_topic, status) VALUES
  (1, 1, 1, 'Display punteggio', 'SCOREBOARD', 'IDLE', 'locales/1/games/1/actuators/1/commands', 'ACTIVE'),
  (2, 1, 1, 'Luce partita', 'LED', 'OFF', 'locales/1/games/1/actuators/2/commands', 'ACTIVE'),
  (3, 1, 2, 'Display freccette', 'SCOREBOARD', 'IDLE', 'locales/1/games/2/actuators/3/commands', 'ACTIVE');

INSERT INTO teams (id, name, locale_id) VALUES
  (1, 'Red Lions', 1),
  (2, 'Blue Rockets', 1);

INSERT INTO team_members (team_id, user_id) VALUES
  (1, 3), (1, 5), (2, 4);

INSERT INTO tournaments (id, name, game_type_id, game_type, participant_mode, status, start_date, end_date) VALUES
  (1, 'Calciobalilla Summer Cup', 1, 'Calciobalilla', 'INDIVIDUAL', 'ACTIVE', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)),
  (2, 'Team Challenge Demo', 1, 'Calciobalilla', 'TEAM', 'DRAFT', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY));

INSERT INTO tournament_locations (tournament_id, locale_id) VALUES
  (1, 1), (1, 2), (2, 1);

INSERT INTO tournament_teams (tournament_id, team_id) VALUES
  (2, 1), (2, 2);

INSERT INTO matches (
  id, game_id, locale_id, participant_mode, player1_id, player2_id,
  player1_name, player2_name, score1, score2, winner_name, status, started_at, ended_at
) VALUES (
  1, 1, 1, 'INDIVIDUAL', 5, 4, 'mario', 'luigi', 5, 3, 'mario', 'FINISHED',
  DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY), DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
);

INSERT INTO tournament_matches (id, tournament_id, match_id, round_number, scheduled_at) VALUES
  (1, 1, 1, 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY));
