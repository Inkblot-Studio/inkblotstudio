#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT_DIR}/web"

LOG_FILE="$(mktemp)"
node dist/server/entry.mjs >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
  rm -f "${LOG_FILE}"
}
trap cleanup EXIT

for i in {1..30}; do
  if curl -sS "http://localhost:4321/" >/dev/null; then
    break
  fi
  sleep 1
done

RESPONSE=$(curl -sS -X POST "http://localhost:4321/api/lead" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName":"CI Smoke",
    "country":"Bulgaria",
    "industry":"Services",
    "painPoints":["Disconnected tools"],
    "whatTried":"Attempted multiple software tools.",
    "investmentReady90Days":true,
    "timeline":"1-2-months",
    "role":"ops-lead",
    "workEmail":"ci-smoke@example.com",
    "website":""
  }')

echo "${RESPONSE}" | grep -q '"ok":true'
echo "CI smoke passed."
