# Mock data

Data for one fictional user after onboarding (spec 01). The user is a customer support specialist with three active targets: Data Analyst (primary), Business Analyst and Support Operations Lead. Nothing here comes from a real person.

| File                | Mirrors                       | Contract                                  |
| ------------------- | ----------------------------- | ----------------------------------------- |
| `roadmap.ts`        | ADR 0004: targets, gaps, plan | `Roadmap` (`@rumbo/contracts`)            |
| `roadmap-layout.ts` | Presentation of the map       | `RoadmapLayout` (`@rumbo/contracts`)      |
| `profile.ts`        | ADR 0004: profile, evidence   | `Profile` (`@rumbo/contracts`)            |
| `market.ts`         | One snapshot per target (F2)  | `Market` (`@rumbo/contracts/provisional`) |

The other tabs add their files here as they are built (#111–#115). Contracts that no spec backs yet go in a `@rumbo/contracts/provisional` export, created by the first tab that needs one.

Cross-mock references must resolve once both files exist. For example, the evidence `sourceRef: 'experience-current-job'` in `roadmap.ts` is an experience id that the Profile mock (#113) has to define.

## Rules

- **Components never import from this folder**, statically or with `import()`. They call `src/lib/data`, and ESLint enforces it.
- **Every mock is declared with `satisfies` its contract type**, and a test in `apps/web/test` parses it at runtime. A contract change breaks the build, not the demo.
- **Edit freely.** Ids are kebab-case, and dates are relative to 2026-10-16.

## Local override (owner's machine only)

To see the demo with your own data without committing it (#137), put JSON files in `.local/mocks/` at the repo root. The folder is gitignored; never commit it, because the repo is public and its history keeps everything.

- Each file is named after the mock it replaces: `roadmap.json`, `roadmap-layout.json`, `profile.json`, `market.json`. A missing file falls back to the fictional mock.
- `lib/data` reads them when `LOCAL_MOCKS_DIR` points at the folder. `docker compose` sets it and mounts the folder read-only. For `next dev`, set `LOCAL_MOCKS_DIR=../../.local/mocks` in `apps/web/.env.local`.
- They are validated with the same schemas: invalid data fails the same way. A roadmap with different milestones or targets needs its own `roadmap-layout.json`, or the map degrades to the single-line view.
- Unit tests and CI always use the fictional user. The local e2e run goes through `docker compose`, so it sees your files: e2e tests must not depend on mock content.

## Replacing with real data

1. Point the matching function in `src/lib/data/index.ts` at the typed API client (#79).
2. Delete the mock file and its line in the table above.
3. Once `lib/data` no longer imports anything from here, delete the folder.
