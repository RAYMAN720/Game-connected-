# Validazione

## Test eseguiti senza Docker

- 29 test Node.js superati;
- controllo di sintassi JavaScript superato;
- controllo strutturale del progetto: 174 verifiche superate;
- controllo dei file e dei collegamenti del frontend;
- controllo dello schema SQL e dei servizi Docker;
- OpenAPI 3.0.3 con 41 percorsi pubblici.

## Test end-to-end

Lo script `scripts/integration-test.js` verifica:

1. gateway, database, MQTT e tre microservizi;
2. login dei quattro ruoli;
3. creazione di un tipo di gioco con eventi personalizzati;
4. configurazione di gioco, sensori e attuatore;
5. creazione di un torneo multi-locale;
6. uso del valore numerico dell'evento;
7. deduplicazione tramite UUID;
8. fine automatica al limite di punteggio;
9. collegamento automatico al torneo;
10. simulazione freccette offline e sincronizzazione;
11. heartbeat, attuatori e statistiche.

Comandi:

```bash
docker compose down -v
docker compose up --build -d
node scripts/integration-test.js
```
