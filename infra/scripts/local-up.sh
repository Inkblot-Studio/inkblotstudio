#!/usr/bin/env bash
set -euo pipefail

docker compose -f infra/local/docker-compose.yml up -d --build

echo "Waiting for postgres to accept connections..."
for i in {1..30}; do
  if docker compose -f infra/local/docker-compose.yml exec -T postgres \
    psql -U inkblot -d inkblot -c "select 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker compose -f infra/local/docker-compose.yml exec -T postgres \
  psql -U inkblot -d inkblot -f /dev/stdin < web/db/schema.sql

echo "Local stack is up at http://localhost:4321"
