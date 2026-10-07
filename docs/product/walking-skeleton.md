# Walking skeleton

The thinnest vertical slice that crosses the whole stack and runs in production. Goal for week 1. It contains no product logic: its job is to surface deploy, CORS, migrations, secrets and build issues now, while they are cheap.

## The slice

**One route, one table, one screen, one job — deployed.**

```
Browser ──▶ web (Next.js, Vercel)
              │  GET /api/v1/healthz
              ▼
            api (NestJS, ECS) ──▶ Postgres (RDS, pgvector enabled)
              │  enqueue "ping" job          ▲
              ▼                              │
            worker (pg-boss consumer, ECS) ──┘  writes heartbeat row
```

| Layer | What exists |
| --- | --- |
| Repo | pnpm workspace, strict TS, ESLint + Prettier, husky + commitlint + lint-staged, `.nvmrc`. |
| CI | On every PR: lint, typecheck, unit tests (one per app), build. Actions pinned by SHA, minimal permissions, timeouts, concurrency. |
| DB | Prisma schema with one table (`heartbeat`) and the first migration, which also runs `CREATE EXTENSION vector`. Migrations run as a deploy step, not at app boot. |
| API | `GET /api/v1/healthz` → `{ status, db: "up" | "down", version, commit }`, pinging the DB with `SELECT 1`. Returns 503 if the DB is down. |
| Worker | Consumes a `system.heartbeat` job from pg-boss and writes a row. Proves the worker is deployed, connected and draining the queue. |
| Web | One page showing API health, DB status and the last worker heartbeat. Reads the API URL from env. |
| Deploy | Push to `main` → build images → run migrations → deploy API and worker → Vercel deploys web. Separate `production` environment with real secrets. |
| E2E | One Playwright smoke test against the production URL: page loads and shows `db: up`. |

## Done when

- [ ] A PR with a failing lint, test or build cannot be merged.
- [ ] Merging to `main` deploys web, API and worker without manual steps.
- [ ] `https://<api-domain>/api/v1/healthz` returns 200 with `db: "up"` in production.
- [ ] The production web page shows a worker heartbeat younger than 5 minutes.
- [ ] The pgvector extension is installed in the production database.
- [ ] Secrets live in the platform's secret store; nothing secret in the repo or the web bundle.
- [ ] The Playwright smoke test passes against production.

## Deliberately not included

Auth, `/api/v1` hardening (helmet, error envelope, validation pipe, Swagger), any LLM call, Langfuse, rate limiting. They come right after, in the order set in [cross-cutting.md](cross-cutting.md).

## Why the worker is in the skeleton

The brief lists web + API + DB. I added the worker because every agent run and webhook goes through the queue, and a second long-running service has its own deploy, scaling and secret wiring. Discovering that in F1 would block the first real feature.
