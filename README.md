# rumbo

A multi-agent assistant for a job search, end to end (built tech-first, open to any field): it reads your professional profile, surveys the market with real job postings from public sources, measures your skills against them with evidence, helps you choose a target role and a roadmap where every gap has a verifiable way to close it (a project, a work experience or a course), drafts LinkedIn/CV changes you approve, and tracks progress — including automatic analysis of every push to the roadmap's project repos.

> **Status:** Phase 0 complete (product docs and ADRs). Next: local walking skeleton. Runs locally only until auth exists.

## Why it exists

Besides being useful, rumbo is a portfolio piece for AI engineering: real agentic workflows, model routing in production, evals in CI, per-run tracing and explicit cost control. The engineering decisions are documented as ADRs.

## Docs

- Product: [problem](docs/product/problem.md) · [MVP scope](docs/product/mvp-scope.md) · [walking skeleton](docs/product/walking-skeleton.md) · [cross-cutting concerns](docs/product/cross-cutting.md)
- Architecture decisions: [docs/adr](docs/adr)
- Specs per vertical slice: [docs/specs](docs/specs)
- Backlog: [docs/backlog.md](docs/backlog.md)

## Repository layout

```
apps/web            Next.js (App Router)
apps/api            NestJS (HTTP + webhooks)
apps/worker         queue consumer: agent runs and push analysis
packages/db         Prisma schema, migrations and client
packages/config     environment validation shared by every service
packages/logger     JSON logging with PII redaction
packages/contracts  shared Zod schemas and types
packages/agents     agent definitions, versioned prompts and tools
packages/router     routing policy, cascade, budget and cost ledger
packages/mcp-jobs   MCP server for job postings
evals/              golden sets and runner
docs/               product docs, ADRs, specs
```

## Requirements

Node 24 (see `.nvmrc`) and pnpm. A version manager that reads `.nvmrc` is recommended, e.g. [fnm](https://github.com/Schniz/fnm) with `--use-on-cd`. Enable pnpm with `corepack enable pnpm` (it uses the exact version pinned in `package.json` → `packageManager`); `npm install -g pnpm` also works.

```bash
pnpm install
pnpm typecheck
```

## Run in development

From the repository root, after `pnpm install`:

```bash
pnpm dev:web     # web only, at http://localhost:3000
pnpm dev:api     # API only, at http://localhost:3001
pnpm dev:worker  # worker only
pnpm dev         # web, API and worker together
```

The API and worker commands require Docker. They start only the compose `postgres` service, build
shared packages, apply migrations, then recompile and restart each app as its source changes. The
web command uses Next.js development mode. All of them read the repo-root `.env` and listen on
`127.0.0.1` only. Stop the
prod-like stack first (`docker compose down`): both serve the web app on port 3000. Node 24 is
required. On Windows PowerShell, use `pnpm.cmd` if `pnpm.ps1` is blocked.

## Run it locally (prod-like)

Requires Docker. Builds the production images and starts Postgres + pgvector, a one-off migration step, the API, the worker and the web app. Everything binds to `127.0.0.1` only.

```bash
docker compose up --build --wait
```

Open http://localhost:3000 for the status page (API, database, last worker heartbeat). Every variable has a default; copy `.env.example` to `.env` to change ports or credentials.

API docs (Swagger UI) are at http://localhost:3000/api/docs, and the OpenAPI document at http://localhost:3000/api/docs/openapi.json. The document is generated at boot; documented request and response schemas come from the Zod schemas in `packages/contracts`, and every endpoint includes the standard error envelope.

With the stack up, run the end-to-end smoke test (installs Chromium the first time):

```bash
pnpm --filter @rumbo/e2e exec playwright install chromium
pnpm test:e2e
```
