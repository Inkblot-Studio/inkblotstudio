#!/usr/bin/env bash
set -euo pipefail

echo "Submitting lead payload..."
RESPONSE=$(curl -sS -X POST "http://localhost:4321/api/lead" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName":"Inkblot Test Company",
    "country":"Bulgaria",
    "industry":"Professional Services",
    "painPoints":["Disconnected tools","Manual handoffs"],
    "whatTried":"We tried multiple tools but still have fragmented workflows.",
    "investmentReady90Days":true,
    "timeline":"1-2-months",
    "role":"ops-lead",
    "workEmail":"ops@example.com",
    "website":""
  }')

echo "API response: ${RESPONSE}"

echo "Latest leads:"
docker compose -f infra/local/docker-compose.yml exec -T postgres \
  psql -U inkblot -d inkblot -c "select id,status,score,created_at from leads order by created_at desc limit 3;"

echo "Latest lead audit:"
docker compose -f infra/local/docker-compose.yml exec -T postgres \
  psql -U inkblot -d inkblot -c "select lead_id,message,created_at from lead_audit order by created_at desc limit 5;"

echo "Smoke check complete."
