# rumbo

A multi-agent assistant for a tech job search, end to end: it reads your professional profile, surveys the market with real job postings from public sources, measures your skills against them with evidence, proposes a target role and a roadmap where every gap has a verifiable way to close it (a project, a work experience or a course), drafts LinkedIn/CV changes you approve, and tracks progress — including automatic analysis of every push to the roadmap's project repos.

> **Status:** Phase 0 — product docs and architecture decisions. No product code yet.

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
packages/contracts  shared Zod schemas and types
packages/agents     agent definitions, versioned prompts and tools
packages/router     routing policy, cascade, budget and cost ledger
packages/mcp-jobs   MCP server for job postings
evals/              golden sets and runner
docs/               product docs, ADRs, specs
```

## Requirements

Node 22 (see `.nvmrc`) and pnpm (`corepack enable`).
