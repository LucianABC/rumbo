# Cross-cutting concerns

What is not a feature but every feature depends on, and **when** each piece lands. Rule: a concern is installed before the first feature that needs it, never "at the end".

## Timeline

| When | Concern | What lands |
| --- | --- | --- |
| Walking skeleton | Tooling & CI | Lint, format, commit hooks, CI (lint + test + build), Dependabot, deploy on merge. |
| Walking skeleton | Health | `/api/v1/healthz` with DB ping; worker heartbeat. |
| API skeleton | HTTP baseline | `/api/v1` prefix, helmet, CORS per environment, global error filter with standard envelope, global Zod validation pipe (nestjs-zod), Swagger at `/api/docs`, env validated with Zod at boot. |
| API skeleton | Logging | Structured JSON logs (pino) with request id and **PII redaction** by default. |
| API skeleton | Contracts | `packages/contracts` consumed by web and API; contract test harness. |
| Auth | Identity & ownership | Register, login, guard, `GET /me`, protected routes, demo user. Every domain table has `userId`; every query is scoped by it (repository-level helper + tests that prove cross-user access fails). |
| Auth | Rate limiting | On auth endpoints first (they are the first public, unauthenticated mutations). Extended to every public endpoint as it appears. |
| Auth | Privacy | `DELETE /api/v1/me` deletes all user data (cascade, plus stored files). Built with auth so every later table must honor it. |
| F1 | Router v0 | `packages/router`: routing table in versioned config, one call path, Zod-validated structured output, retry-with-error then escalate, per-call cost ledger, per-run budget. |
| F1 | Run model & tracing v0 | `Run` and `LlmCall` tables; every LLM call belongs to a run. OpenTelemetry spans exported to Langfuse; PII stripped before export. |
| F1 | Evals v0 | `evals/` runner + first golden set (profile extraction). `pnpm eval` calls the real API; CI runs it when prompts, tools or routing change. |
| F1 | Fixtures | Recorded model responses for tests; tests never call Anthropic. |
| F1 | File storage | CV uploads in object storage (S3), private, deleted with the user. |
| F2 | Prompt-injection defenses | Postings are untrusted data; injection test set with malicious postings; no write tool reachable from posting content. |
| F2 | MCP | `packages/mcp-jobs` server exposing posting search; the market agent consumes it. |
| F2 | Embeddings | pgvector columns + index for postings and skills. |
| F3 | Orchestrator v1 | Multi-step runs (gap analysis → target → roadmap) with resumable steps and budget across steps. |
| F4 | Human approval pattern | Generic "proposal → diff → approve/reject per item" model reused for profile edits and F5 doubtful tasks. |
| F5 | Webhooks | GitHub App webhook endpoint with signature verification, idempotency by delivery id, enqueue-only handler. |
| F5 | Scheduled jobs | Weekly recalculation via pg-boss cron. |
| End of MVP | Routing tuned | Routing table updated from eval results (and later from the telco-router benchmark); before/after report. |

## Standing rules (apply from the first line of code)

- **External content is data, not instructions**: postings, PDFs, diffs, commit messages. Prompts say so explicitly; no write tool executes because that content asks for it.
- **Human approval** for every visible change to user data.
- **Structured output validated with Zod** for every model output that feeds logic; on failure, retry with the error, then escalate per the routing table.
- **Visible cost**: model, input/output tokens, estimated cost and run id per call; per-run budget with hard cut.
- **Privacy**: no personal data in traces or logs.
- **Evals before optimizing**: no prompt or routing change merges without the eval's before/after.
- **Tests never call the Anthropic API**; real calls live only in `pnpm eval`.
- **Quality gates**: coverage threshold breaks CI; E2E black-box against the production build; contract tests on `packages/contracts`; no open high vulnerabilities.
