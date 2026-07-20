# Risultati dei test

| Controllo | Risultato |
|---|---|
| Test unitari Node.js | 29 superati, 0 falliti |
| Sintassi backend | superata |
| Sintassi gateway e simulatore | superata |
| Controllo strutturale | 174 verifiche superate |
| Collegamenti frontend | controllati |
| Struttura microservizi Docker | controllata |
| OpenAPI | 3.0.3, 41 percorsi pubblici |
| Test end-to-end | script completo in `scripts/integration-test.js` |

Il test end-to-end deve essere eseguito dopo l'avvio dei container, perche usa MySQL e Mosquitto reali.
