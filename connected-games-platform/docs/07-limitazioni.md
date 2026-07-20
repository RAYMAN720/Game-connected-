# Limiti del prototipo

Il progetto e un prototipo universitario. Le password demo sono salvate in chiaro per rendere semplice l'avvio. In un sistema reale verrebbero usati hash, token e HTTPS.

I sensori sono simulati via software. L'architettura permette di sostituire il simulatore con Arduino, ESP32 o Raspberry Pi senza cambiare il formato degli eventi.

La gestione dei tornei produce classifica e calendario delle partite collegate, ma non genera automaticamente tutti gli accoppiamenti di un tabellone ad eliminazione.
