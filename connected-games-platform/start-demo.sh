#!/usr/bin/env sh
set -e
printf '%s\n' 'Avvio PlayConnect...'
docker compose down -v
docker compose up --build -d
printf '%s\n' 'Attendo che i servizi siano pronti...'
sleep 12
docker compose ps
printf '%s\n' ''
printf '%s\n' 'Applicazione: http://localhost:8080'
printf '%s\n' 'Edge locale:  http://localhost:8090'
printf '%s\n' 'API health:   http://localhost:3000/api/health'
printf '%s\n' ''
printf '%s\n' 'Test integrazione: node scripts/integration-test.js'
