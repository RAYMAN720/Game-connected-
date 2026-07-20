# MQTT

## Topic eventi

```text
locales/{localeId}/games/{gameId}/matches/{matchId}/events
```

## Topic heartbeat

```text
locales/{localeId}/edge/{deviceId}/heartbeat
```

## Topic attuatori

```text
locales/{localeId}/games/{gameId}/actuators/{actuatorId}/commands
```

Gli eventi vengono pubblicati con QoS 1. Ogni evento ha un UUID. Il Match Service controlla l'UUID prima di salvare il messaggio, quindi una nuova consegna dello stesso messaggio non modifica due volte il punteggio.

L'heartbeat viene inviato ogni cinque secondi. Il server aggiorna `last_seen`, `last_sync` e lo stato del dispositivo. Se il dispositivo non invia heartbeat per venti secondi viene indicato come offline.
