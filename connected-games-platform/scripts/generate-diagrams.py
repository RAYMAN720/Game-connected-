from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / 'docs' / 'figures'
FIG.mkdir(parents=True, exist_ok=True)

COMMON = '''
graph [fontname="Arial", bgcolor="white", pad="0.25", nodesep="0.45", ranksep="0.65"];
node [fontname="Arial", fontsize=10, shape=box, style="rounded,filled", fillcolor="#F4F7FB", color="#34506B", fontcolor="#172B3A", margin="0.10,0.07"];
edge [fontname="Arial", fontsize=9, color="#526D82", fontcolor="#334E5E", arrowsize=0.7];
'''

diagrams = {
'01-casi-uso': f'''digraph G {{
{COMMON}
rankdir=LR;
node [shape=ellipse, fillcolor="#F8FBFD"];
subgraph cluster_system {{ label="PlayConnect"; color="#9CB3C5"; style="rounded";
  login [label="Accedere alla piattaforma"];
  games [label="Vedere giochi disponibili"];
  personal [label="Consultare partite e statistiche"];
  tournaments [label="Vedere tornei e classifiche"];
  manage_local [label="Gestire locale, giochi e utenti"];
  matches [label="Avviare e controllare partite"];
  devices [label="Configurare edge, sensori e attuatori"];
  types [label="Definire tipi e regole di gioco"];
  platform [label="Gestire utenti, locali e tornei"];
  global_stats [label="Consultare statistiche globali"];
}}
node [shape=box, fillcolor="#EAF1F7"];
player [label="Giocatore"];
local [label="Amministratore locale"];
gameadmin [label="Amministratore gioco"];
platformadmin [label="Amministratore piattaforma"];
player -> {{login games personal tournaments}};
local -> {{login manage_local matches devices tournaments}};
gameadmin -> {{login types devices global_stats}};
platformadmin -> {{login platform types global_stats tournaments}};
}}''',

'02-architettura': f'''digraph G {{
{COMMON}
rankdir=LR;
frontend [label="Frontend web\nHTML, CSS, JavaScript", fillcolor="#E7F1FA"];
gateway [label="API Gateway\nporta 3000", fillcolor="#DDECF7"];
catalog [label="Catalog Service\nlocali, utenti, giochi, sensori"];
match [label="Match Service\npartite, eventi, MQTT"];
tournament [label="Tournament Service\ntornei, squadre, statistiche"];
mysql [shape=cylinder, label="MySQL\nconnected_games", fillcolor="#FFF5DD"];
broker [shape=component, label="Broker MQTT\nMosquitto", fillcolor="#EDE7F6"];
edgeNode [label="Edge Service\nsensori simulati, coda offline", fillcolor="#E6F4EA"];
physical [label="Gioco fisico\no simulato", fillcolor="#F3E8E8"];
frontend -> gateway [label="REST / JSON"];
gateway -> catalog [label="/api/catalogo"];
gateway -> match [label="/api/matches"];
gateway -> tournament [label="/api/tornei e statistiche"];
{{catalog match tournament}} -> mysql [label="SQL"];
physical -> edgeNode [label="eventi sensore"];
edgeNode -> broker [label="MQTT QoS 1"];
broker -> match [label="eventi e heartbeat"];
match -> broker [label="comandi attuatori"];
edgeNode -> catalog [label="configurazione REST interna"];
}}''',

'03-dominio': f'''digraph G {{
{COMMON}
rankdir=TB;
node [shape=record, style="filled", fillcolor="#F7FAFC"];
locale [label="{{Locale|id; nome; citta; indirizzo}}"];
user [label="{{Utente|id; username; ruolo; locale_id}}"];
gt [label="{{TipoGioco|id; nome; eventi; limite; squadre}}"];
template [label="{{ModelloSensore|id; nome; event_type}}"];
game [label="{{Gioco|id; nome; stato; locale_id; tipo_id}}"];
edgeNode [label="{{DispositivoEdge|id; nome; stato; last_seen}}"];
sensor [label="{{Sensore|id; nome; sensor_type; topic; stato}}"];
actuator [label="{{Attuatore|id; tipo; stato; topic}}"];
match [label="{{Partita|id; modalita; punteggi; stato; vincitore}}"];
event [label="{{EventoPartita|uuid; tipo; valore; sync_status}}"];
team [label="{{Squadra|id; nome; locale_id}}"];
tournament [label="{{Torneo|id; tipo; modalita; stato; date}}"];
locale -> user [label="0..1 / molti"];
locale -> game [label="1 / molti"];
locale -> edgeNode [label="1 / molti"];
gt -> game [label="1 / molti"];
gt -> template [label="1 / molti"];
edgeNode -> sensor [label="1 / molti"];
game -> sensor [label="1 / molti"];
edgeNode -> actuator [label="1 / molti"];
game -> actuator [label="1 / molti"];
game -> match [label="1 / molti"];
match -> event [label="1 / molti"];
user -> match [label="partecipante"];
team -> match [label="partecipante"];
tournament -> match [label="molti / molti"];
tournament -> locale [label="molti / molti"];
tournament -> team [label="molti / molti"];
}}''',

'04-package': f'''digraph G {{
{COMMON}
rankdir=LR;
subgraph cluster_front {{ label="frontend"; color="#AFC7D8"; style="rounded";
  pages [label="pagine HTML"];
  js [label="moduli JavaScript"];
  css [label="stile e immagini"];
  pages -> js; pages -> css;
}}
subgraph cluster_gateway {{ label="gateway"; color="#AFC7D8"; style="rounded";
  gw [label="server.js\ninstradamento richieste"];
}}
subgraph cluster_backend {{ label="backend"; color="#AFC7D8"; style="rounded";
  routes [label="routes"];
  controllers [label="controllers"];
  services [label="services"];
  utils [label="utils"];
  db [label="db.js"];
  mqtt [label="mqttClient.js"];
  routes -> controllers;
  controllers -> services;
  controllers -> utils;
  controllers -> db;
  services -> utils;
  services -> db;
  mqtt -> services;
}}
subgraph cluster_edge {{ label="simulator"; color="#AFC7D8"; style="rounded";
  sim [label="simulator.js"];
  queue [label="coda JSON offline"];
  ui [label="interfaccia locale"];
  sim -> queue; ui -> sim;
}}
js -> gw [label="REST"];
gw -> routes [label="proxy"];
sim -> mqtt [label="MQTT"];
sim -> controllers [label="config REST interna"];
}}''',

'05-classi-implementazione': f'''digraph G {{
{COMMON}
rankdir=TB;
node [shape=record, style="filled", fillcolor="#F7FAFC"];
matchController [label="{{matchController|startMatch(); addMatchEvent(); endMatch(); simulateMatchMqtt()}}"];
matchService [label="{{matchEventService|processMatchEvent(); finishMatch(); saveEvent(); getMatchRow()}}"];
gameRules [label="{{gameRules|normalizeGameRules(); eventAction(); scoreValue(); reachedScoreLimit()}}"];
mqttClient [label="{{mqttClient|connectMqtt(); processHeartbeat(); markSilentDevicesOffline()}}"];
actuator [label="{{actuatorService|updateActuators()}}"];
tournament [label="{{tournamentService|linkMatchToActiveTournament(); getTournamentRankingRows()}}"];
internal [label="{{internalController|getEdgeGameConfiguration(); requireEdgeKey()}}"];
simulator [label="{{EdgeSimulator|loadConfiguration(); simulate(); publishOrQueue(); syncQueue()}}"];
db [label="{{db|query(); waitForDatabase(); pingDatabase()}}"];
matchController -> matchService;
mqttClient -> matchService;
matchService -> gameRules;
matchService -> actuator;
matchService -> tournament;
{{matchService mqttClient internal tournament actuator}} -> db;
simulator -> internal [label="REST"];
simulator -> mqttClient [label="MQTT"];
}}''',

'06-sequenza-online': f'''digraph G {{
{COMMON}
rankdir=LR;
node [shape=box, width=1.45];
user [label="Admin locale"];
frontend [label="Frontend"];
gateway [label="API Gateway"];
match [label="Match Service"];
edgeNode [label="Edge"];
broker [label="MQTT"];
db [shape=cylinder, label="MySQL"];
user -> frontend [label="avvia partita"];
frontend -> gateway [label="POST /matches/start"];
gateway -> match [label="inoltro REST"];
match -> db [label="crea partita LIVE"];
frontend -> gateway [label="POST /simulate-mqtt"];
gateway -> match [label="richiesta simulazione"];
match -> edgeNode [label="POST /simulate"];
edgeNode -> broker [label="evento con UUID e valore"];
broker -> match [label="QoS 1"];
match -> db [label="salva evento e aggiorna punteggio"];
match -> broker [label="comando display"];
match -> db [label="fine automatica al limite"];
frontend -> gateway [label="GET /matches/id"];
gateway -> match [label="lettura"];
match -> frontend [label="punteggio ed eventi"];
}}''',

'07-sequenza-offline': f'''digraph G {{
{COMMON}
rankdir=LR;
node [shape=box, width=1.5];
sensor [label="Sensore simulato"];
edgeNode [label="Edge Service"];
queue [shape=note, label="offline-queue.json"];
broker [label="Broker MQTT"];
match [label="Match Service"];
db [shape=cylinder, label="MySQL"];
sensor -> edgeNode [label="evento"];
edgeNode -> broker [label="publish"];
broker -> edgeNode [label="connessione assente", style=dashed];
edgeNode -> queue [label="salva PENDING"];
edgeNode -> edgeNode [label="ritorno online"];
edgeNode -> broker [label="ripubblica SYNCED"];
broker -> match [label="evento UUID"];
match -> db [label="controllo duplicato"];
match -> db [label="salvataggio e punteggio"];
edgeNode -> queue [label="rimuove evento sincronizzato"];
edgeNode -> broker [label="heartbeat queue_size=0"];
broker -> match [label="heartbeat"];
match -> db [label="edge ONLINE e last_sync"];
}}''',

'08-deployment': f'''digraph G {{
{COMMON}
rankdir=TB;
subgraph cluster_host {{ label="Computer con Docker Desktop"; color="#94AFC2"; style="rounded";
  browser [label="Browser\nlocalhost:8080"];
  frontend [label="Container frontend\nNginx :80"];
  gateway [label="Container API Gateway\nNode.js :3000"];
  catalog [label="Catalog Service :3001"];
  match [label="Match Service :3002"];
  tournament [label="Tournament Service :3003"];
  edgeNode [label="Edge Service :4000\nesposto su :8090"];
  mysql [shape=cylinder, label="MySQL :3306"];
  mqtt [label="Mosquitto :1883"];
}}
browser -> frontend;
frontend -> gateway;
gateway -> {{catalog match tournament}};
{{catalog match tournament}} -> mysql;
edgeNode -> catalog [label="rete Docker"];
edgeNode -> mqtt;
mqtt -> match;
}}'''
}

for name, dot in diagrams.items():
    dot_path = FIG / f'{name}.dot'
    png_path = FIG / f'{name}.png'
    svg_path = FIG / f'{name}.svg'
    dot_path.write_text(dot, encoding='utf-8')
    subprocess.run(['dot', '-Tpng', '-Gdpi=180', str(dot_path), '-o', str(png_path)], check=True)
    subprocess.run(['dot', '-Tsvg', str(dot_path), '-o', str(svg_path)], check=True)
    print(png_path)
