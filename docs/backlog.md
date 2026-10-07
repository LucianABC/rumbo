# Backlog

Convention: `AREA — Verb + object`. Only the next 2–3 weeks are broken into tasks (≈ one PR each). Each task meets the Definition of Ready: what, why, verifiable acceptance criterion. Tracked as GitHub Issues in the `rumbo` repo; this file is the snapshot they were created from.

## Decisions (one ticket per ADR)

| ID | Title | Acceptance |
| --- | --- | --- |
| D1 | ARCH — ADR agent orchestration | ADR 0001 approved or amended |
| D2 | ARCH — ADR deployment | ADR 0002 approved or amended; domain chosen |
| D3 | ARCH — ADR authentication | ADR 0003 approved or amended |
| D4 | ARCH — ADR skill taxonomy and evidence model | ADR 0004 approved or amended |
| D5 | ARCH — ADR job queue and run ledger | ADR 0005 approved or amended |
| D6 | ARCH — ADR embeddings provider | Deferred to the F2 spec: provider and vector dimension chosen; must fit the 1 GB worker if local |

## Epic: Walking skeleton (week 1)

Why: surface deploy, CORS, migrations and secrets issues before any feature. See `docs/product/walking-skeleton.md`.

| ID | Title | Acceptance |
| --- | --- | --- |
| WS1 | INFRA — Set up pnpm workspace and TypeScript base | `pnpm install && pnpm typecheck` pass on empty apps/packages; strict tsconfig base shared |
| WS2 | INFRA — Configure ESLint and Prettier | `pnpm lint` and `pnpm format:check` run across the workspace |
| WS3 | INFRA — Add husky, commitlint and lint-staged | A non-conventional commit message is rejected locally |
| WS4 | INFRA — Add CI workflow for lint, test and build | PR with failing lint/test/build is blocked; actions pinned by SHA, minimal permissions, timeouts, concurrency |
| WS5 | INFRA — Enable Dependabot and dependency audit | Dependabot PRs open weekly; CI fails on high vulnerabilities |
| WS6 | BE — Scaffold NestJS API with health endpoint | `GET /api/v1/healthz` returns `db: up` with a real DB, 503 when DB is down (Testcontainers test) |
| WS7 | BE — Add Prisma with first migration and pgvector | Migration creates `heartbeat` table and `vector` extension; runs in CI against Testcontainers |
| WS8 | BE — Scaffold worker with pg-boss heartbeat job | Worker consumes `system.heartbeat` and writes a row; integration test |
| WS9 | FE — Scaffold Next.js app with status page | Page shows API health, DB status and last heartbeat; API URL from env |
| WS10 | INFRA — Provision AWS stack with CDK | VPC (no NAT), RDS Postgres 16 private, ECS cluster on one t4g.micro (ASG of 1) with api/worker services, CloudFront in front of the API, SSM parameters, S3 bucket, ECR, budget alarms at $20/$35; `cdk deploy` reproducible |
| WS11 | INFRA — Deploy backend on merge to main via OIDC | Merge to main builds images, runs migrations as a one-off task, updates services; no long-lived AWS keys |
| WS12 | INFRA — Deploy web to Vercel with API proxy | Web live on Vercel; `/api/*` rewritten to the CloudFront API URL; API rejects requests without the CloudFront origin header |
| WS14 | INFRA — Register domain in Route 53 (standby) | Bought only when it becomes necessary; ACM cert, `api.<domain>` on CloudFront, `app.<domain>` on Vercel, cookies scoped to parent domain |
| WS13 | QA — Add Playwright smoke test against production | Test passes against the production URL after deploy |

## Epic: API skeleton (week 2)

Why: every endpoint inherits versioning, security headers, error format and validation from here.

| ID | Title | Acceptance |
| --- | --- | --- |
| AS1 | BE — Validate environment config with Zod at boot | App refuses to start with a missing/invalid env var, naming it |
| AS2 | BE — Add helmet and CORS per environment | Security headers present; disallowed origin rejected (test) |
| AS3 | BE — Add global error filter with standard envelope | All errors return `{ error: { code, message, details?, requestId } }`; unknown errors don't leak stack traces (test) |
| AS4 | BE — Add global Zod validation pipe | Invalid body returns 400 with field errors in the envelope (test) |
| AS5 | BE — Add Swagger at /api/docs from Zod contracts | `/api/docs` lists healthz with schemas generated from `packages/contracts` |
| AS6 | BE — Add structured logging with PII redaction | JSON logs with request id; emails, names and tokens redacted (unit test on the redactor) |
| AS7 | QA — Add contract test harness for packages/contracts | Web client and API both validate against the same schemas; a breaking schema change fails CI |
| AS8 | QA — Add coverage threshold to CI | CI fails below the threshold (start at 80% lines for packages, 70% for apps) |

## Epic: Auth end to end (weeks 2–3)

Why: ownership must exist before the first domain endpoint. See ADR 0003.

| ID | Title | Acceptance |
| --- | --- | --- |
| AU1 | BE — Add User and AuthIdentity models | Migration applied; email unique; password hash argon2id |
| AU2 | BE — Endpoint POST /auth/register | Creates user, sets session cookies; duplicate email → 409 in envelope |
| AU3 | BE — Endpoint POST /auth/login | Valid credentials set access + refresh cookies (httpOnly, Secure, SameSite=Lax); invalid → 401 without user enumeration |
| AU4 | BE — Add refresh rotation and logout | Refresh rotates; reusing a rotated token revokes the family; logout revokes (tests) |
| AU5 | BE — Add auth guard and GET /me | `/me` returns the user for a valid session, 401 otherwise; guard exposes `userId` to handlers |
| AU6 | BE — Add CSRF origin check for mutations | Non-GET from a foreign `Origin` → 403 (test) |
| AU7 | BE — Add rate limiting to auth endpoints | Exceeding the limit → 429 in envelope (test) |
| AU8 | BE — Add demo user seed and POST /auth/demo | Evaluator enters with one click; demo data seeded; nightly reset job |
| AU9 | BE — Endpoint DELETE /me | Deletes the user and all owned rows/files; e2e test proves nothing remains |
| AU10 | FE — Add register and login screens | Forms validated with shared Zod schemas; errors shown from the envelope |
| AU11 | FE — Add session handling and protected routes | Unauthenticated access to app routes redirects to login; silent refresh works |
| AU12 | QA — Add e2e auth flow against production build | Register → login → /me → logout → demo login pass in Playwright |

## Epics (one line each, not broken down yet)

- **F1 · Profile** — Upload LinkedIn PDF/CV, extract structured profile with evidence per skill, review/correct screen. Brings router v0, run ledger, Langfuse tracing, evals v0, fixtures, S3 uploads.
- **F2 · Market** — Postings from Greenhouse, Lever, Remotive and Anthropic web search; normalized requirements; snapshots; semantic search; MCP jobs server; prompt-injection test set.
- **F3 · Gaps, target and roadmap** — Prioritized gaps, editable target, roadmap with the every-gap-has-a-project rule, graphical path view.
- **F4 · Drafting with approval** — LinkedIn/CV proposals as per-item diffs, approve/reject, export PDF/DOCX.
- **F5 · Tracking and GitHub** — Checklist, GitHub App, push-analysis agent with two-stage routing, applications log, weekly recalculation.
- **Router tuning** — Replace routing table with eval / telco-router results, before/after report.
- **Later** — Billing/SaaS, auto-apply, scraping-based integrations, LinkedIn API, email notifications, native mobile, interview coach, multi-language UI.
