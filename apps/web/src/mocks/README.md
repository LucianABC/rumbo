# Mock data

Data for one fictional user after onboarding (spec 01). The user is a customer support specialist with three active targets: Data Analyst (primary), Business Analyst and Support Operations Lead. Nothing here comes from a real person.

| File                | Mirrors                       | Contract                             |
| ------------------- | ----------------------------- | ------------------------------------ |
| `roadmap.ts`        | ADR 0004: targets, gaps, plan | `Roadmap` (`@rumbo/contracts`)       |
| `roadmap-layout.ts` | Presentation of the map       | `RoadmapLayout` (`@rumbo/contracts`) |

The other tabs add their files here as they are built (#111–#115). Contracts that no spec backs yet come from `@rumbo/contracts/provisional`.

## Rules

- **Components never import from this folder.** They call `src/lib/data`, and ESLint enforces it.
- **Every mock is declared with `satisfies` its contract type**, and a test in `apps/web/test` parses it at runtime. A contract change breaks the build, not the demo.
- **Edit freely.** Ids are kebab-case, and dates are relative to 2026-10-16.

## Replacing with real data

1. Point the matching function in `src/lib/data/index.ts` at the typed API client (#79).
2. Delete the mock file and its line in the table above.
3. Once `lib/data` no longer imports anything from here, delete the folder.
