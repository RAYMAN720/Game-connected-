# PlayConnect - Connected Games Platform

Progetto finale PISSIR 2025/2026. Collega giochi fisici a una piattaforma centrale usando sensori simulati, dispositivo edge, MQTT, REST, microservizi e Docker.

## Requisiti coperti

- quattro ruoli completi;
- amministratore gioco con tipi, regole e modelli sensore;
- edge, sensori, attuatori e offline;
- partite individuali e a squadre;
- tornei multi-locale con turni e classifica;
- API Gateway e tre microservizi;
- Swagger/OpenAPI, UML, casi d'uso e test.

## Avvio pulito

Su Windows fare doppio clic su `start-demo.bat`. Su macOS/Linux eseguire `./start-demo.sh`.

Comandi equivalenti:

```bash
docker compose down -v
docker compose up --build -d
```

Aprire:

- Applicazione: http://localhost:8080
- Edge locale: http://localhost:8090
- API health: http://localhost:3000/api/health

## Account demo

| Ruolo | Username | Password |
|---|---|---|
| Piattaforma | platform | platform123 |
| Locale | localadmin | local123 |
| Gioco | gameadmin | game123 |
| Giocatore | client | client123 |
| Giocatore | mario | mario123 |
| Giocatore | luigi | luigi123 |

## Test

```bash
cd backend
npm test
npm run check
cd ..
node scripts/validate-project.js
node scripts/integration-test.js  # con Docker avviato
```

## Guida rapida

Aprire `START_HERE.md` per installazione, avvio, account e demo.

## Documentazione

- `docs/00-relazione-finale.md`
- `docs/13-casi-uso-testuali.md`
- `docs/14-diagrammi-completi.pdf`
- `docs/15-guida-demo-esame.md`
- `docs/16-matrice-requisiti.md`
- `docs/openapi.yaml`
- `docs/final/PlayConnect_Relazione_Finale.docx`
- `docs/final/PlayConnect_Relazione_Finale.pdf`

## Spiegazione in una frase

Il sensore manda un evento all'edge, l'edge lo pubblica su MQTT, il Match Service aggiorna partita e attuatori, e il browser legge il risultato tramite REST.
