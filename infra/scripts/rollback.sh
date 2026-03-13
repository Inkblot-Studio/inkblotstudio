#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"

if [[ "${ENVIRONMENT}" != "staging" && "${ENVIRONMENT}" != "prod" ]]; then
  echo "Usage: $0 [staging|prod]"
  exit 1
fi

NAMESPACE="inkblot-web-${ENVIRONMENT}"

kubectl rollout undo deployment/web-app -n "${NAMESPACE}"
kubectl rollout undo deployment/lead-worker -n "${NAMESPACE}"
kubectl rollout status deployment/web-app -n "${NAMESPACE}"
kubectl rollout status deployment/lead-worker -n "${NAMESPACE}"

echo "Rollback completed for ${ENVIRONMENT}"
