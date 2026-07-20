# Problemi incontrati

## Eventi duplicati

Con MQTT QoS 1 lo stesso messaggio puo essere ricevuto piu di una volta. E stato aggiunto `event_uuid` con indice univoco.

## Connessione assente

L'edge non deve perdere la partita. Gli eventi vengono scritti in una coda JSON con stato `PENDING` e ripubblicati quando la connessione torna disponibile.

## Tipi di gioco diversi

All'inizio gli eventi erano fissi per il calciobalilla. La logica e stata spostata nella tabella `game_types`, cosi ogni tipo possiede evento di inizio, due eventi di punteggio, evento di fine e limite.

## Separazione dei ruoli

I controlli sono stati inseriti sia nelle pagine sia nel backend. Il backend resta il controllo principale e impedisce l'accesso a dati di altri locali.
