# Matrice dei requisiti

| Requisito | Implementazione | Verifica |
|---|---|---|
| Quattro tipi di utenti | `users.role`, middleware e dashboard | test accessRules |
| Giochi in locali identificabili | tabelle `locales` e `games` | API giochi/locali |
| Admin gioco e regole | `game_types`, `sensor_templates`, pagina game admin | test gameRules |
| Sensori reali o simulati | `sensors` e Edge Service | configurazione edge |
| REST | API Gateway e tre servizi | OpenAPI |
| MQTT | Mosquitto, eventi, heartbeat, attuatori | integrazione MQTT |
| Offline | coda JSON e ripubblicazione | scenario integrazione |
| Deduplicazione | `event_uuid` univoco | test integrazione |
| Partite individuali | riferimenti ai client | test validazione |
| Partite a squadre | `teams`, `team_members`, campi team | test tornei |
| Tornei multi-locale | `tournament_locations` | API tornei |
| Classifica | servizio torneo, 3/1/0 punti | test ranking |
| Statistiche | globali, locali, personali e per tipo | API statistics |
| Interfaccia utente | pagine web per tutti i ruoli | demo browser |
| Microservizi | catalog, match, tournament, gateway | Docker Compose |
| UML e sequenze | immagini in `docs/figures` | relazione |
| Test componenti | Node test runner | 29 test |
| Test integrazione | `scripts/integration-test.js` | esecuzione con Docker |
| Demo funzionante | script start/stop e guida | `15-guida-demo-esame` |
