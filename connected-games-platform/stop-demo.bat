@echo off
docker compose down
if errorlevel 1 exit /b 1
echo PlayConnect arrestato. I dati Docker sono stati conservati.
