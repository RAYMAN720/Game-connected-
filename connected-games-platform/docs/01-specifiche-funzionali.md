# Specifiche funzionali

## Obiettivo

PlayConnect collega giochi fisici a una piattaforma centrale. I sensori rilevano gli eventi della partita, il dispositivo edge li invia tramite MQTT e il server aggiorna punteggi, statistiche e tornei.

## Utenti

| Ruolo | Funzioni principali |
|---|---|
| Giocatore | Vede giochi disponibili, partite, statistiche personali, tornei e classifiche. |
| Amministratore locale | Gestisce giochi, client, dispositivi edge, sensori, attuatori e partite del proprio locale. |
| Amministratore gioco | Definisce tipi di gioco, eventi, limite di punteggio e modelli dei sensori. |
| Amministratore piattaforma | Gestisce locali, amministratori, tornei e statistiche globali. |

## Funzioni richieste

- gestione di locali pubblici o privati;
- identificazione univoca dei giochi nel locale;
- tipi di gioco configurabili;
- partite individuali e a squadre;
- eventi sensore con valore numerico;
- registrazione degli eventi con UUID per evitare duplicati;
- funzionamento offline dell'edge e sincronizzazione successiva;
- tornei su uno o piu locali;
- classifiche e statistiche;
- interfaccia web per tutti i ruoli;
- API REST documentate con OpenAPI;
- comunicazione MQTT con QoS 1.

## Requisiti non funzionali

Il sistema deve essere semplice da avviare, separato in microservizi, testabile e utilizzabile anche quando la connessione tra edge e server non e disponibile per un breve periodo.
