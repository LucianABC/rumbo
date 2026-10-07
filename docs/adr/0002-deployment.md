# ADR 0002 — Deployment

- **Status:** Proposed (revision 2)
- **Date:** 2026-10-07

## Context

Production needs: Next.js web, NestJS API (public, receives GitHub webhooks), a **long-running worker** (pg-boss consumer — not a fit for serverless functions), Postgres with **pgvector**, private object storage for CVs, secrets, and deploy on merge. Load is tiny (one real user plus evaluators).

Constraints from the author: **practice AWS for the Solutions Architect Associate**, and **minimize the monthly bill** as much as possible. No custom domain yet (Route 53 purchase deferred until needed).

Facts that shape the options:
- AWS App Runner stopped accepting new customers on 2026-04-30 (maintenance mode). Its successor, **ECS Express Mode**, always provisions an ALB (~$16–18/month), the largest fixed cost in a small stack.
- A Fargate service without a load balancer has no stable address to put in front of webhooks.
- The ECS control plane is free; with the **EC2 launch type** you only pay for the instance.

## Options

| | A. ECS Express (Fargate + ALB) + RDS | B. ECS on one EC2 instance + CloudFront + RDS | C. Vercel + PaaS (Railway/Neon) |
| --- | --- | --- | --- |
| API + worker | 2 Fargate services behind a shared ALB | 2 ECS services (bridge networking) on one `t4g.micro` | PaaS services |
| Public entry / TLS | ALB + Express URL | CloudFront (`*.cloudfront.net` TLS, caching disabled) → instance origin | PaaS URL |
| Postgres + pgvector | RDS `db.t4g.micro` | RDS `db.t4g.micro` | Neon |
| Est. monthly cost | ~$45–65 | **~$25–28** | ~$0–25 |
| SAA surface | VPC, ECS/Fargate, ALB, RDS, IAM, S3, CloudWatch | VPC, EC2, ECS, CloudFront, RDS, IAM, S3, SSM, CloudWatch, (Route 53 + ACM later) | None |
| Downsides | Cost | Single instance: brief downtime on deploy, no HA | No AWS practice |

Cost sketch for B (us-east-1, on-demand): EC2 `t4g.micro` ≈ $6; 30 GB gp3 ≈ $2.4; one Elastic IP (public IPv4) ≈ $3.7; RDS `db.t4g.micro` single-AZ + 20 GB gp3 ≈ $14; CloudFront, S3, ECR, SSM Parameter Store (standard), CloudWatch with 7-day log retention ≈ $0–2. No ALB, no NAT Gateway, no Secrets Manager. Vercel Hobby for the web: $0. New AWS accounts' sign-up credits can cover the first months.

## Decision

**Option B: Vercel for the web; ECS on a single EC2 instance (API + worker) behind CloudFront; RDS PostgreSQL 16; S3.** Infrastructure as code with **AWS CDK in TypeScript** (`infra/`). Region **us-east-1** (cheapest; São Paulo is ~50% more expensive for little latency gain at this scale).

- **ECS on EC2**: one ECS cluster with a single `t4g.micro` in an Auto Scaling group of size 1 (self-healing if the instance dies). API and worker are separate ECS services, so they deploy and restart independently and the setup scales to Fargate later by changing the launch type.
- **CloudFront in front of the API** gives HTTPS without a domain and without an ALB. Cache disabled for `/api/*`; all headers, cookies and query strings forwarded. The instance only accepts traffic from the CloudFront managed prefix list plus a secret origin header.
- **RDS** in private subnets, reachable only from the instance's security group. Automated backups 7 days. No NAT: the instance sits in a public subnet with a tight security group.
- **Secrets** in SSM Parameter Store (SecureString, free tier) instead of Secrets Manager.
- **Deploys**: GitHub Actions via OIDC (no long-lived keys) → push images to ECR → run migrations as a one-off ECS task → update services. With one instance, deploys use `minimumHealthyPercent: 0` (a few seconds of downtime), accepted for the MVP.
- **Domain (deferred):** until a domain exists the web calls the API through a Next.js rewrite (`/api/*` → CloudFront), so the browser sees one origin and auth cookies stay first-party. When the domain is bought in Route 53: ACM certificate, `api.<domain>` alias on CloudFront, `app.<domain>` on Vercel.
- **Guardrails:** AWS Budgets alarms at $20 and $35; CloudWatch alarm on instance status and on API `/healthz` failures.

## Trade-offs

- **No high availability**: one instance, one AZ for RDS. A failure means minutes of downtime until the ASG replaces the instance. Fine for one user; the path to HA (Fargate + ALB, Multi-AZ RDS) is a config change in CDK, documented here for when it's worth paying for.
- **1 GB of RAM** for API + worker + ECS agent is tight. If memory pressure appears, move to `t4g.small` (+$6/month). A local embedding model would not fit — relevant to the embeddings decision in F2.
- More infrastructure to understand than Express Mode (ASG, capacity provider, CloudFront origin). That is the point for SAA, but it costs time in week 1.
- Reversibility: the app is containerized and reads a standard Postgres URL; moving to option A or C is days, not a rewrite.
