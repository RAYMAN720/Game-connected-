# Inizia da qui

## 1. Requisiti sul nuovo computer

Installare soltanto:

- Docker Desktop;
- facoltativo: Node.js 20, necessario solo per eseguire i test fuori dai container.

## 2. Avvio piu semplice

### Windows

Fare doppio clic su `start-demo.bat`.

### macOS o Linux

Nel terminale aperto nella cartella del progetto:

```bash
./start-demo.sh
```

In alternativa usare direttamente:

```bash
docker compose down -v
docker compose up --build -d
```

## 3. Pagine da aprire

- piattaforma: `http://localhost:8080`
- edge locale: `http://localhost:8090`
- stato API: `http://localhost:3000/api/health`
- MySQL Docker, solo per ispezione manuale: `localhost:3307`

Nota: i microservizi Docker usano internamente `mysql:3306`; il port mapping esterno e `3307:3306` per non interferire con un eventuale MySQL gia installato sul computer.

## 4. Account principali

- `platform / platform123`
- `localadmin / local123`
- `gameadmin / game123`
- `client / client123`

## 5. Controlli

```bash
cd backend
npm test
npm run check
cd ..
node scripts/validate-project.js
node scripts/integration-test.js
```

L'ultimo comando richiede che Docker sia gia avviato.

Risultato atteso nell'ambiente preparato: 27 test Node.js superati, 127 controlli strutturali superati e 7 test di integrazione superati.

## 6. Demo orale

Seguire `docs/15-guida-demo-esame.md`. La relazione finale e disponibile in `docs/final/`. I diagrammi principali sono in `docs/03-diagrammi.pdf`; la versione estesa e in `docs/14-diagrammi-completi.pdf`.

Per preparare la discussione individuale, seguire anche `docs/17-preparation-orale.md`.
