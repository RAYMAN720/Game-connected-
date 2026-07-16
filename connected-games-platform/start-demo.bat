@echo off
echo Avvio PlayConnect...
docker compose down -v
if errorlevel 1 goto error
docker compose up --build -d
if errorlevel 1 goto error
timeout /t 12 /nobreak >nul
docker compose ps
echo.
echo Applicazione: http://localhost:8080
echo Edge locale:  http://localhost:8090
echo API health:   http://localhost:3000/api/health
echo.
echo Test integrazione: node scripts\integration-test.js
goto end
:error
echo Errore: controllare che Docker Desktop sia installato e avviato.
exit /b 1
:end
