# PlayConnect - Connected Games Platform

PlayConnect è il progetto finale del laboratorio PISSIR 2025/2026. La piattaforma collega giochi fisici a un sistema centrale tramite sensori simulati, dispositivo edge, MQTT, API REST, microservizi e Docker.

## Funzioni presenti

- quattro ruoli con permessi diversi;
- gestione di locali, utenti, giochi e dispositivi edge;
- tipi di gioco con eventi e limite di punteggio configurabili;
- sensori, attuatori e simulazione degli eventi;
- funzionamento online e offline con sincronizzazione della coda;
- partite individuali e a squadre;
- tornei tra più locali, turni e classifica;
- statistiche personali, per gioco e globali;
- API Gateway e tre microservizi applicativi;
- documentazione OpenAPI, diagrammi, casi d'uso e test.

## Avvio

Su Windows fare doppio clic su `start-demo.bat`.

Su macOS o Linux:

```bash
./start-demo.sh
```

Comandi equivalenti:

```bash
docker compose down -v
docker compose up --build -d
```

Pagine principali:

- applicazione: `http://localhost:8080`
- interfaccia edge: `http://localhost:8090`
- stato API: `http://localhost:3000/api/health`

## Account demo

| Ruolo | Username | Password |
|---|---|---|
| Amministratore piattaforma | `platform` | `platform123` |
| Amministratore locale | `localadmin` | `local123` |
| Amministratore gioco | `gameadmin` | `game123` |
| Giocatore | `client` | `client123` |
| Giocatore | `mario` | `mario123` |
| Giocatore | `luigi` | `luigi123` |

## Test

```bash
cd backend
npm test
npm run check
cd ..
node scripts/validate-project.js
node scripts/integration-test.js
```

Il test di integrazione richiede i container Docker avviati.

## Documentazione principale

- `docs/final/PlayConnect_Relazione_Finale.pdf`
- `docs/final/PlayConnect_Relazione_Finale.docx`
- `docs/final/PlayConnect_Diagrammi.pdf`
- `docs/13-casi-uso-testuali.pdf`
- `docs/15-guida-demo-esame.pdf`
- `docs/16-matrice-requisiti.pdf`
- `docs/openapi.yaml`

La guida iniziale si trova in `START_HERE.md`.

## Autore 
- `TCHAMBA SADIO RAYANN JOVANY`
- `MAURICE BEACK` 
- `ANDRE JUNIOR NGUETCHOUO BOUYOM `
