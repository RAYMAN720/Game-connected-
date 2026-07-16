#!/usr/bin/env sh
set -e
docker compose down
printf '%s\n' 'PlayConnect arrestato. I dati Docker sono stati conservati.'
