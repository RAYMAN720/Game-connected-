# Guida demo esame

## Avvio

```bash
docker compose down -v
docker compose up --build -d
```

Aprire:

- applicazione: `http://localhost:8080`;
- edge: `http://localhost:8090`;
- stato servizi: `http://localhost:3000/api/health`.

## Account

| Ruolo | Username | Password |
|---|---|---|
| Piattaforma | platform | platform123 |
| Locale | localadmin | local123 |
| Gioco | gameadmin | game123 |
| Giocatore | client | client123 |

## Percorso consigliato

1. Accedere come `gameadmin` e mostrare le regole diverse di Calciobalilla e Freccette.
2. Aprire la pagina sensori e mostrare gli eventi configurati.
3. Accedere come `localadmin` e avviare una partita di calciobalilla o freccette.
4. Premere **Simula con MQTT** e mostrare la timeline live.
5. Aprire l'interfaccia edge, passare offline e avviare un'altra simulazione.
6. Mostrare gli eventi nella coda, poi tornare online e osservare la sincronizzazione.
7. Aprire tornei e classifica.
8. Accedere come `platform` e mostrare statistiche globali e gestione locali.

## Test finale

```bash
cd backend
npm test
npm run check
cd ..
node scripts/validate-project.js
node scripts/integration-test.js
```
