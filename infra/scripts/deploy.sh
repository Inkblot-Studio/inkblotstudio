#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"

if [[ "${ENVIRONMENT}" != "staging" && "${ENVIRONMENT}" != "prod" ]]; then
  echo "Usage: $0 [staging|prod]"
  exit 1
fi

kubectl apply -k "infra/k8s/overlays/${ENVIRONMENT}"
kubectl rollout status deployment/web-app -n "inkblot-web-${ENVIRONMENT}"
kubectl rollout status deployment/lead-worker -n "inkblot-web-${ENVIRONMENT}"

echo "Deploy completed for ${ENVIRONMENT}"
