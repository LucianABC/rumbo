# Walking skeleton

The thinnest vertical slice that crosses the whole stack. It contains no product logic: its job is to surface build, wiring, migration and configuration issues while they are cheap.

**Hard limit:** rumbo does not go to production without auth (ADR 0003). So the skeleton is built in two stages:

1. **Local walking skeleton** (week 1): the whole stack running locally in a **prod-like environment** — the same Docker images that production will run, started with Docker Compose.
2. **Production launch** (after the auth mechanism exists): the same images deployed to AWS + Vercel (ADR 0002).

## Stage 1 — Local walking skeleton

**One route, one table, one screen, one job — running in prod-like Docker Compose.**

```
Browser ──▶ web (Next.js production build, container)
              │  GET /api/v1/healthz  (proxied by Next rewrite)
              ▼
            api (NestJS image) ──▶ Postgres 16 + pgvector (container)
              │  enqueue "ping" job          ▲
              ▼                              │
            worker (pg-boss consumer image) ─┘  writes heartbeat row
```

| Layer | What exists |
| --- | --- |
| Repo | pnpm workspace, strict TS, ESLint + Prettier, husky + commitlint + lint-staged, `.nvmrc`, `.gitattributes`. |
| CI | On every PR: lint, typecheck, unit tests, build, **Docker image build** for api, worker and web. Actions pinned by SHA, minimal permissions, timeouts, concurrency. |
| DB | Prisma schema with one table (`heartbeat`); first migration also runs `CREATE EXTENSION vector`. Migrations run as a separate one-off step, not at app boot. |
| API | `GET /api/v1/healthz` → `{ status, db: "up" \| "down", version, commit }`, pinging the DB. 503 if the DB is down. |
| Worker | Consumes a `system.heartbeat` job from pg-boss and writes a row. |
| Web | One page showing API health, DB status and the last worker heartbeat; calls the API through the same `/api/*` rewrite production will use. |
| Local prod-like env | `docker compose up` starts postgres, a migrate one-off, api, worker and web from production images, with env from `.env` (validated at boot). |
| E2E | One Playwright smoke test against the local production build: page loads and shows `db: up`. Runs in CI too. |

### Done when

- [ ] A PR with failing lint, test, build or image build cannot be merged.
- [ ] `docker compose up` from a clean checkout brings the stack up with migrations applied and pgvector installed.
- [ ] `healthz` returns 200 with `db: "up"`; the page shows a worker heartbeat younger than 5 minutes.
- [ ] The Playwright smoke test passes locally and in CI.

## Stage 2 — Production launch (gated by auth)

Provision AWS with CDK, deploy on merge via OIDC, deploy the web to Vercel, run the same smoke test against production. Blocked until the auth mechanism (ADR 0003) is implemented.

The AWS account is created **at the start of this stage**, not before: the free plan's 6-month clock starts at sign-up.

## Why the worker is in the skeleton

Every agent run and webhook goes through the queue, and a second long-running service has its own image, config and lifecycle. Discovering that in F1 would block the first real feature.

## What we give up by deploying later

The brief wanted a production deploy in week 1 to surface CORS, secrets and infra issues early. Running the exact production images locally and building them in CI covers most of that; what remains (AWS networking, IAM, CloudFront) is surfaced at the Production launch, which is treated as its own walking-skeleton-style milestone with a smoke test.
