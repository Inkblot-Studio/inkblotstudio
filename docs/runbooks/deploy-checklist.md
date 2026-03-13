# Deploy Checklist

## Before Deploy

- [ ] `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:contracts`, and `npm run build` succeed in `web/`
- [ ] Required secrets set (`DATABASE_URL`, `REDIS_URL`)
- [ ] DB schema applied from `web/db/schema.sql`
- [ ] Webhook endpoint tested (if enabled)
- [ ] `bash infra/scripts/ci-smoke.sh` passes locally or in CI

## Deploy

- [ ] `bash infra/scripts/deploy.sh staging`
- [ ] smoke-test lead submission in staging
- [ ] `bash infra/scripts/deploy.sh prod`

## After Deploy

- [ ] Check web and worker rollout status
- [ ] Verify lead end-to-end in prod
- [ ] Confirm no active critical alerts
- [ ] Runbook evidence captured (command outputs + timestamp + operator)
