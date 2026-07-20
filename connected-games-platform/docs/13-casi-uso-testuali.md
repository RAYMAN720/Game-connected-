# Casi d'uso testuali

## CU1 - Accesso

**Attore:** tutti gli utenti.  
**Precondizione:** l'utente esiste.  
**Flusso:** inserisce username e password, il server controlla i dati e restituisce il ruolo.  
**Risultato:** viene aperta la dashboard corretta.

## CU2 - Configurare un tipo di gioco

**Attore:** amministratore gioco.  
**Flusso:** inserisce nome, descrizione, eventi, limite e supporto squadre. Aggiunge i modelli dei sensori.  
**Risultato:** il tipo puo essere scelto quando viene installato un gioco.

## CU3 - Installare un gioco

**Attore:** amministratore locale.  
**Flusso:** sceglie un tipo di gioco, assegna un nome e collega il gioco al locale. Configura sensori e attuatori sul dispositivo edge.  
**Risultato:** il gioco appare tra quelli disponibili.

## CU4 - Avviare una partita

**Attore:** amministratore locale.  
**Precondizione:** gioco online e due partecipanti validi.  
**Flusso:** seleziona giocatori o squadre e avvia la partita.  
**Risultato:** il gioco passa a `IN_GAME` e la partita a `LIVE`.

## CU5 - Registrare un evento

**Attore:** dispositivo edge.  
**Flusso:** pubblica un messaggio MQTT con UUID, tipo e valore. Il Match Service legge le regole del tipo di gioco e aggiorna il partecipante corretto.  
**Risultato:** evento e punteggio sono salvati.

## CU6 - Terminare al limite

**Attore:** Match Service.  
**Precondizione:** il tipo di gioco possiede un limite.  
**Flusso:** dopo ogni evento di punteggio confronta i due valori con il limite.  
**Risultato:** salva il vincitore, termina la partita, aggiorna il gioco e invia il comando agli attuatori.

## CU7 - Funzionare offline

**Attore:** dispositivo edge.  
**Flusso:** se MQTT non e disponibile salva gli eventi nella coda locale. Al ritorno online li invia in ordine.  
**Risultato:** nessun evento viene perso.

## CU8 - Gestire un torneo

**Attore:** amministratore piattaforma.  
**Flusso:** sceglie tipo, modalita, locali, date e stato. Le partite compatibili concluse vengono collegate.  
**Risultato:** il sistema calcola la classifica con 3 punti per vittoria e 1 per pareggio.

## CU9 - Consultare statistiche

**Attore:** tutti secondo il proprio ruolo.  
**Risultato:** vengono mostrati numero di partite, punti totali, media, percentuale vittorie, ranking e dati per tipo di gioco.
