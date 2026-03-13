# Kubernetes Environment Matrix

## Environments

- `staging` namespace: `inkblot-web-staging`
- `prod` namespace: `inkblot-web-prod`
- Namespaces are managed by overlay manifests (`overlays/*/namespace.yaml`).

## Required Secrets

- `DATABASE_URL`
- `REDIS_URL`
- `LEAD_WEBHOOK_URL`
- `LOG_LEVEL`
- `PUBLIC_ANALYTICS_ENDPOINT`
- `SENTRY_DSN`

Use `infra/k8s/base/web-secrets.template.yaml` as the reference template.

## Apply Commands

- Staging: `kubectl apply -k infra/k8s/overlays/staging`
- Prod: `kubectl apply -k infra/k8s/overlays/prod`
