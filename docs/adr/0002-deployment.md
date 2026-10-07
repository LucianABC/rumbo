# ADR 0002 — Deployment

- **Status:** Proposed
- **Date:** 2026-10-07

## Context

Production needs: Next.js web, NestJS API (public, receives GitHub webhooks), a **long-running worker** (pg-boss consumer — not a fit for serverless functions), Postgres with **pgvector**, private object storage for CVs, secrets, and deploy on merge. Load is tiny (one real user plus evaluators). The author wants AWS practice for the **Solutions Architect Associate** certification.

**Brief correction:** AWS App Runner stopped accepting new customers on 2026-04-30 and is in maintenance mode; AWS points to **Amazon ECS Express Mode** (Fargate service + shared ALB + TLS + autoscaling, no extra charge beyond the resources). The AWS option below uses that instead.

## Options

| | A. All on AWS | B. Vercel + managed PaaS | C. Hybrid: Vercel web + AWS backend |
| --- | --- | --- | --- |
| Web | ECS (Next standalone) or Amplify | Vercel | Vercel |
| API + worker | ECS Express Mode (Fargate) | Railway / Render / Fly | ECS Express Mode (Fargate) |
| Postgres + pgvector | RDS PostgreSQL 16 (pgvector supported) | Neon / Supabase (pgvector supported) | RDS PostgreSQL 16 |
| Object storage | S3 | S3 or the platform's | S3 |
| Est. monthly cost | ~$55–75 | ~$0–25 | ~$45–65 |
| SAA practice | Max (VPC, RDS, ECS, ALB, IAM, Secrets Manager, S3, CloudWatch) | None | Nearly all of A |
| Effort to first deploy | High | Low | Medium–high |
| Next.js fit | Manual (caching, images, ISR) | Native | Native |

Cost sketch for C (us-east-1, on-demand, rough): RDS `db.t4g.micro` single-AZ + 20 GB gp3 ≈ $15; two Fargate tasks (0.25 vCPU / 0.5 GB, always on) ≈ $18; shared ALB ≈ $18; public IPv4 + CloudWatch + S3 + Secrets Manager ≈ $8. Vercel Hobby $0. Avoid NAT Gateway (~$33/month): tasks in public subnets with security groups, RDS private.

## Decision

**Option C: Vercel for the web; AWS for API, worker, database and storage.** Infrastructure as code with **AWS CDK in TypeScript** inside the monorepo (`infra/`).

- The parts that teach SAA material (networking, RDS, IAM roles for tasks, Secrets Manager, S3 policies, ALB, CloudWatch alarms, budgets) are all on AWS.
- Next.js runs where it is first-class; hosting Next on ECS teaches little relevant to SAA and costs real time.
- One custom domain for both: `app.<domain>` on Vercel and `api.<domain>` on the ALB, so auth cookies are first-party (see ADR 0003).
- GitHub Actions deploys via OIDC to an IAM role (no long-lived AWS keys). Migrations run as a one-off ECS task before the service update.
- AWS Budgets alarm at $40 and $70.

## Trade-offs

- Two platforms to operate and two places for env config. Accepted for the learning value.
- ~$45–65/month vs. near-zero on B. Can drop to ~$30 by running API and worker in one task (two processes) if needed — at the cost of independent scaling and deploys.
- ECS Express Mode is recent; if it gets in the way, fall back to a plain ECS Fargate service + ALB defined in CDK (same primitives, more code).
- Preview environments per PR are easy for the web (Vercel) but not for the backend; the MVP has only `production` plus local dev with Docker Compose. A `staging` stack can be added by instantiating the CDK stack twice.
- Reversibility: the app is containerized and talks to a standard Postgres URL, so moving to option B later is a few days of work, not a rewrite.
