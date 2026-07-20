# Inizia da qui

## 1. Requisiti

Installare Docker Desktop. Node.js 20 serve solo per eseguire i test direttamente dal computer.

## 2. Avvio del progetto

### Windows

Fare doppio clic su `start-demo.bat`.

### macOS o Linux

Aprire il terminale nella cartella del progetto ed eseguire:

```bash
./start-demo.sh
```

In alternativa:

```bash
docker compose down -v
docker compose up --build -d
```

## 3. Pagine da aprire

- piattaforma: `http://localhost:8080`
- edge locale: `http://localhost:8090`
- stato API: `http://localhost:3000/api/health`

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

L'ultimo comando richiede Docker già avviato.

## 6. Demo e relazione

- procedura demo: `docs/15-guida-demo-esame.pdf`
- relazione finale: `docs/final/PlayConnect_Relazione_Finale.pdf`
- diagrammi: `docs/final/PlayConnect_Diagrammi.pdf`
