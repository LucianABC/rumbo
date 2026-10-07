# ADR 0002 — Deployment

- **Status:** Accepted (2026-10-07, revision 3)
- **Date:** 2026-10-07

## Context

Production needs: Next.js web, NestJS API (public, receives GitHub webhooks), a **long-running worker** (pg-boss consumer — not a fit for serverless functions), Postgres with **pgvector**, private object storage for CVs, secrets, and deploy on merge. Load is tiny (one real user plus evaluators).

Constraints from the author:

- **Zero cost** is the default; a paid option needs a big technical or learning advantage.
- **Practice AWS** for the Solutions Architect Associate.
- No custom domain yet (Route 53 purchase deferred until needed).

Facts checked on 2026-10-07:

- No managed PaaS runs an always-on worker for free: Railway's free plan has $1/month of credit (Hobby is $5), Render's free tier has no background workers and sleeps web services after 15 min, Koyeb's single free service cannot be a worker, and Neon's free compute hours would be exhausted by pg-boss polling.
- **AWS Free Tier for new accounts** (since 2025-07): free account plan with $100 credit at sign-up plus up to $100 more for five activities (EC2, RDS, Lambda, Bedrock, Budgets). The plan ends after **6 months** or when credits run out; nothing is charged until the account is upgraded to paid.
- AWS App Runner is closed to new customers (2026-04-30); its successor, ECS Express Mode, always provisions an ALB (~$16–18/month).
- Oracle Always Free halved its Ampere allowance without notice in June 2026 and reclaims idle instances, which matches this app's usage profile.

## Options

|                     | A. ECS Express (Fargate + ALB) + RDS                  | B. ECS on one EC2 + CloudFront + RDS            | C. Vercel + PaaS (Railway/Neon) | D. Free PaaS with keep-alive (Render + Supabase)                                                                  |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cost now            | ~$45–65/mo, mostly covered by credits for ~3–4 months | **$0 for ~6 months** (credits), then ~$25–28/mo | ~$5–10/mo                       | $0                                                                                                                |
| AWS practice        | High                                                  | **High**                                        | None                            | None                                                                                                              |
| Technical drawbacks | None relevant                                         | Single instance, no HA                          | Small                           | Sleeps: lost GitHub webhooks (cold start > 10 s timeout, no auto-retry), missed crons; no DB backups on free plan |

## Decision

> **Timing:** this setup is built at the **Production launch** milestone, which is gated by auth (ADR 0003). Until then rumbo runs only locally, and the AWS account is created at the start of that milestone so the free plan's 6-month clock is not spent idle.

**Option B on a new AWS account using the free plan: Vercel for the web; ECS on a single EC2 instance (API + worker) behind CloudFront; RDS PostgreSQL 16; S3.** Infrastructure as code with **AWS CDK in TypeScript** (`infra/`). Region **us-east-1**.

- **ECS on EC2**: one ECS cluster with a single `t4g.micro` in an Auto Scaling group of size 1. API and worker are separate ECS services (independent deploys and restarts).
- **CloudFront in front of the API**: HTTPS without a domain and without an ALB. Cache disabled for `/api/*`; headers, cookies and query strings forwarded. The instance only accepts traffic from the CloudFront managed prefix list plus a secret origin header.
- **RDS** `db.t4g.micro` single-AZ in private subnets, reachable only from the instance's security group; automated backups 7 days. No NAT Gateway.
- **Secrets** in SSM Parameter Store (SecureString) instead of Secrets Manager.
- **Deploys**: GitHub Actions via OIDC (no long-lived keys) → ECR → migrations as a one-off ECS task → service update. `minimumHealthyPercent: 0` (seconds of downtime per deploy).
- **Domain (deferred)**: until it exists the web proxies `/api/*` to CloudFront through a Next.js rewrite, so cookies stay first-party. Later: Route 53 + ACM, `api.<domain>` on CloudFront, `app.<domain>` on Vercel.
- **Credit guardrails**: AWS Budgets alarms on the monthly cost _before credits_ at $25 and $35, plus an alarm when remaining credits drop below $50. Do the five bonus activities early (EC2 and RDS happen in the walking skeleton; Lambda, Bedrock and Budgets are small one-offs).

### Portability rules (keep the exit cheap)

1. API and worker run as Docker images; nothing depends on a platform buildpack.
2. Postgres is reached through a standard `DATABASE_URL` and driver; no provider-specific features.
3. Queue and crons live in pg-boss, so they move with the database.
4. Files go through the S3 API.
5. No backend logic in Vercel functions; Vercel only serves the web.
6. Migrations are a separate deploy step, never run at app boot.
7. All infra is in CDK; nothing is created by hand in the console except the account itself.

### Exit plan (month 5)

Before the free plan ends, reassess with real data: upgrade to paid (~$25–28/month) or move to the cheapest option that meets the zero-cost rule at that time. Given the rules above, moving is a container + `pg_dump` exercise, not a rewrite.

## Trade-offs

- **Time-boxed free period.** After ~6 months this option costs money or forces a move. Accepted: the MVP should be done by then, and the decision will use real usage data.
- **No high availability**: one instance, one AZ for RDS; minutes of downtime if the instance fails. Path to HA (Fargate + ALB, Multi-AZ) is a CDK change.
- **1 GB of RAM** for API + worker + ECS agent is tight; `t4g.small` is the fallback. A local embedding model would not fit (relevant to the F2 embeddings decision).
- More infrastructure to learn in week 1 than a PaaS. That is the point for SAA, but it slows the walking skeleton.
