# API REST

La descrizione completa e presente in `docs/openapi.yaml` nel formato OpenAPI 3.0.3.

## Gruppi di rotte

| Prefisso | Contenuto |
|---|---|
| `/api/auth` | login demo |
| `/api/users` | utenti e ruoli |
| `/api/locales` | locali |
| `/api/game-types` | tipi di gioco e modelli sensore |
| `/api/games` | giochi installati |
| `/api/devices`, `/api/sensors`, `/api/actuators` | componenti edge |
| `/api/matches` | partite ed eventi |
| `/api/teams` | squadre e membri |
| `/api/tournaments` | tornei e classifiche |
| `/api/statistics` | statistiche globali, locali e personali |

## Evento partita

Esempio di evento inviato al Match Service:

```json
{
  "event_uuid": "edge-1-20-1720000000-3",
  "event_type": "DART_THROW_PLAYER_1",
  "match_id": 20,
  "game_id": 2,
  "locale_id": 1,
  "device_id": 1,
  "value": 60,
  "sync_status": "SYNCED"
}
```

Il campo `value` permette di gestire goal, punti delle bocce e valori dei tiri alle freccette. Se non e presente, il valore usato e 1.
