# ADR 0005 — Job queue and run ledger

- **Status:** Accepted (2026-10-07)
- **Date:** 2026-10-07

## Context

Every agent run and every GitHub webhook goes through a queue, so HTTP requests stay fast and work can be retried. Cost and tracing requirements need a durable record of each run and each model call. The brief proposes pg-boss to avoid adding Redis; this ADR records that and the run/ledger model, which every feature will write to.

## Options

1. **pg-boss on the same Postgres.** Transactional enqueue with domain writes, retries, cron, singleton/throttle keys; no new infra. Throughput limited by Postgres — irrelevant at our scale.
2. **BullMQ + Redis (ElastiCache or managed).** Mature, fast, nice dashboards; adds ~$15+/month and one more stateful service, and enqueue is not transactional with domain writes.
3. **SQS + Lambda/ECS consumer.** Good SAA practice; no transactional enqueue, more plumbing for delays/cron, and long agent runs fit poorly in Lambda.

## Decision

**pg-boss**, with these rules:

- **Enqueue in the same transaction** as the domain write that causes it (e.g., create `Run` row + enqueue `run.execute`), so there are no orphan runs or lost jobs.
- **Webhooks are enqueue-only:** verify signature, store `deliveryId` with a unique constraint (idempotency), enqueue, return 202.
- Job handlers are idempotent and step-based: a retried run resumes from the last completed step.
- Queues: `run.execute`, `push.analyze`, `market.refresh` (cron), `weekly.recalculate` (cron), `system.heartbeat`.
- **Missed schedules are caught up.** pg-boss does not backfill cron runs that fired while no worker was up, and until the Production launch rumbo runs only on the owner's machine. Each scheduled job records its last successful run (`ScheduledJobRun(name, lastSucceededAt)`); on startup the worker enqueues any job whose last success is older than its interval, using a singleton key so a catch-up and a regular firing never run twice. This also covers restarts in production.

**Run ledger** (owned by `packages/router`, written for every call):

```
Run       id, userId, type, status, budgetUsd, spentUsd, startedAt, finishedAt, traceId, error?
RunStep   id, runId, name, status, attempt, startedAt, finishedAt
LlmCall   id, runId, stepId, routeKey, model, attempt, escalatedFrom?, inputTokens, outputTokens,
          cacheReadTokens, cacheWriteTokens, costUsd, latencyMs, promptVersion, validation(ok|retry|failed)
```

- Budget check happens **before** each call (estimated) and **after** (actual); exceeding it marks the run `budget_exceeded` and stops it.
- Prices live next to the routing config, versioned; `costUsd` is computed at write time so historic costs don't change when prices do.
- No prompt or completion text in `LlmCall`: payloads that are needed for debugging go to Langfuse with PII stripped.

## Trade-offs

- Queue load shares the database with the app. Fine at this scale; revisit (SQS) if the queue ever competes with queries.
- No out-of-the-box dashboard like BullMQ's; run status is visible through our own `Run` table and Langfuse.
- SQS would be better SAA practice; ADR 0002 already covers a large part of the exam surface, and transactional enqueue is worth more here.
