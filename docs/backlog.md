# Backlog

The board lives in **GitHub Issues** (repo `rumbo`) and the GitHub Project linked to it. This file documents only its structure, so there is a single source of truth for tasks and nothing to keep in sync.

## Conventions

- Title: `AREA — Verb + object`. Areas: ARCH, INFRA, BE, FE, AI, QA, DOCS (labels `area:*`).
- Other labels: `epic` (one-line story, not broken down), `decision` (one per ADR), `standby` (parked until a trigger, see the issue).
- Only the next 2–3 weeks are broken into tasks (≈ one PR each). Each task has What, Why and verifiable acceptance criteria.
- Search before creating an issue; edit or link existing ones, never duplicate. Superseded issues are closed as "not planned" with a link to what replaces them.
- Commits and PRs reference issues (`Refs #n`, `Closes #n`).

## Milestones, in order

1. **Phase 0 — Decisions** — closed: ADRs 0001, 0002, 0004, 0005 accepted. Auth (ADR 0003) is deferred to Production launch; embeddings (ADR pending) to the F2 spec.
2. **Walking skeleton (local)** — tooling, CI, prod-like Docker Compose, healthz, worker heartbeat, local smoke test.
3. **API skeleton** — config, helmet/CORS, error envelope, validation, Swagger, logging with PII redaction, contracts, coverage gate.
4. **Ownership** — `User` + ownership scoping, identity port with local single-owner adapter, `DELETE /me`.
5. **Features F1 → F2 → F2b → F3** — one epic each; broken down when they enter the 2–3 week horizon, starting with a spec in `docs/specs/`.
6. **Production launch** — after F3 (owner decision, 2026-10-11): auth mechanism (ADR 0003) + AWS account, CDK stack, deploy pipelines, Vercel, production smoke test, logs/alarms/backups. **Hard limit: nothing is deployed before auth exists.**
7. **Features F4 → F5**, then assisted apply, router tuning and the portfolio write-up.
8. **MVP acceptance** — one month of real weekly use.

## Timeline

Execution order, estimates (hours) and dates live on the GitHub Project: fields `Order`, `Estimate`, `Start`, `Target`, plus a due date per milestone. Planning capacity: 8–10 h per week (owner, 2026-10-11). Tasks are estimated when broken down; epics carry a rough estimate (±50%) until their spec.

## Parked (`standby`)

- Domain in Route 53 — when a task truly needs it.
- Embeddings provider — at the F2 spec.
- Hosting review — around month 5 of the AWS free plan.
- Auth mechanism — before the first production deploy.
