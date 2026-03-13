# Inkblot Web Foundation

Production-ready foundation for the Inkblot interactive 3D website with async lead workflow and Kubernetes delivery assets.

## Stack

- Astro + TypeScript
- React islands
- Three.js via React Three Fiber + Drei
- Tailwind CSS v4
- GSAP, Zod
- BullMQ + Redis
- PostgreSQL
- Pino + Sentry baseline

## Local Development

```bash
npm install
npm run dev
```

Run lead worker locally:

```bash
npm run worker
```

One-command local stack from repository root:

```bash
bash infra/scripts/local-up.sh
bash infra/scripts/local-smoke.sh
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

- `LEAD_WEBHOOK_URL`: optional ops webhook for manual-review lead routing.
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `LOG_LEVEL`: logging level (`info` by default).
- `PUBLIC_ANALYTICS_ENDPOINT`: optional browser analytics endpoint.

## Current Scope

- Premium homepage structure with conversion-first messaging
- 3D hero scene as React island
- Design token system in global styles
- Lead API with validation, scoring, persistence, and async queue support
- CRM adapter interface (`NoopAdapter`, `WebhookAdapter`)
- Worker process for background lead routing
- DB schema for leads and audit trail (`db/schema.sql`)
- Kubernetes manifests and environment overlays in `infra/k8s/`

## Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`     |
| `npm run build`           | Builds server output to `./dist/`               |
| `npm run preview`         | Preview build locally                            |
| `npm run worker`          | Runs lead worker process                         |
| `npm run lint`            | Astro diagnostics and type-aware checks          |
| `npm run typecheck`       | TypeScript no-emit validation                    |
| `npm run test:contracts`  | Schema and scoring contract smoke test           |

## Infra and Operations

- Kubernetes base and overlays: `infra/k8s/`
- Deploy/rollback scripts: `infra/scripts/`
- Monitoring SLO/alerts: `infra/monitoring/`
- Runbooks: `docs/runbooks/`
