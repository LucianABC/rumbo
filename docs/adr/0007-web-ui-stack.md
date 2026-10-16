# ADR 0007 — Web UI stack

- **Status:** Accepted (2026-10-16)
- **Date:** 2026-10-16

## Context

`apps/web` (Next.js 16, React 19) needs a styling approach, accessible components, forms and data fetching before its first real screens (#78). The roadmap demo (#99, spec 01) builds the app shell and every tab with mock data first; F1 brings the first real forms (CV upload, profile review with editable lists), F2b an adaptive questionnaire and a role-family search, F4 approvals, F5 progress polling.

Constraints: zero cost, accessible (WCAG AA, keyboard first), responsive from 360px, solo owner with ~9 h/week. The owner's rule for this decision: **whatever a maintained library can do, a library does**, so time goes to the product and to the pieces that show front-end craft.

Already in place: Tailwind v4 (#104); `motion`, `ai` and `@ai-sdk/anthropic` approved in spec 01; reads in Server Components through `apps/web/src/lib/data` (#103).

**Measurements** (esbuild, minified + gzip, over a 67.5 kB React 19 baseline; Dialog + Tabs for the primitives):

| Library                                      | Added   |
| -------------------------------------------- | ------- |
| Radix (`radix-ui` 1.8)                       | 18.5 kB |
| Base UI (`@base-ui/react` 1.9)               | 29.5 kB |
| React Aria Components 1.22                   | 41.3 kB |
| `react-hook-form` 7.90 + resolver (over Zod) | 12.5 kB |
| `@tanstack/react-query` 5.104                | 9.9 kB  |
| `swr` 2.5                                    | 6.3 kB  |

## Options

1. **Hand-built components** on native HTML (`<dialog>`, `popover`) plus headless primitives only where needed; native forms; Server Component reads only. Smallest bundle, most code to write and test (focus traps, roving tabindex, combobox).
2. **shadcn/ui** (component code copied into the repo) over a headless library, plus libraries for forms, server state, URL state, upload and charts. Most time saved; the look starts generic unless the tokens are our own.
3. **A packaged UI kit** (MUI, Mantine, Chakra). Fast, but styling fights Tailwind and the components are not ours to change.

Headless base for option 2: Radix is the lightest but has no Combobox, which F2b's role-family search needs; React Aria has the strongest a11y and i18n but is the heaviest and most verbose; Base UI (by the Radix and Floating UI authors) has Combobox, Autocomplete, Drawer, Toast, Field and Form, is actively released, and is the shadcn CLI's default base.

## Decision

**Option 2.** The stack:

| Need                 | Choice                                               | Notes                                                                                                          |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Styling              | Tailwind v4, design tokens in `@theme`               | Unchanged (#104, #106)                                                                                         |
| Components           | shadcn/ui with Base UI (`shadcn` CLI, `--base base`) | Generated into `apps/web/src/components/ui`; owned code, restyled with our tokens                              |
| Style helpers        | `class-variance-authority`, `cn`                     | Variants, and `cn()` as the shadcn CLI generates it: shadcn's replacement for `clsx` + `tailwind-merge` (#105) |
| Icons                | `lucide-react`                                       |                                                                                                                |
| Mobile bottom sheet  | Base UI `Drawer`                                     | Not `vaul` (no release since 2024-12)                                                                          |
| Toasts               | What shadcn ships for the chosen base                |                                                                                                                |
| Forms                | `react-hook-form` + `@hookform/resolvers`            | Schemas from `packages/contracts`; shadcn `Field` wires labels and errors                                      |
| Client server state  | `@tanstack/react-query` (+ devtools in dev only)     | Mutations, invalidation, retries, run-status polling, optimistic approvals                                     |
| URL state            | `nuqs`                                               | Filters, path comparison, in-view tabs                                                                         |
| File upload          | `react-dropzone`                                     | F1                                                                                                             |
| Charts               | `recharts` through shadcn's chart component          | Loaded lazily, only on the views that chart                                                                    |
| API client (#79)     | `openapi-typescript` + `openapi-fetch`               | Types generated from the API's OpenAPI document (#25), itself generated from `packages/contracts`              |
| Motion, AI streaming | `motion`, `ai`                                       | Already approved in spec 01                                                                                    |

Rules:

- **Hand-made on purpose:** the subway map SVG, the single-line roadmap view and the station panel content. No library draws an authored octilinear layout, and they are the demo's showcase.
- **Reads** stay in Server Components through `lib/data`, which calls the API client server-side when a feature goes live. TanStack Query owns client-side reads that change while the page is open (polling, after mutations) and every mutation.
- **No Server Actions.** Mutations go through the typed client and the `/api/*` proxy, so the API stays the only write surface: auth, validation and ownership are enforced and tested in one place (ADR 0002 §5, ADR 0006).
- **Validation errors** from the API are mapped from `code` to text in one web module (ADR 0006); forms show them through `Field`, never the API's message.
- **Responses that feed logic** are still parsed with their `packages/contracts` schema; `openapi-fetch` types do not validate at runtime.
- **The `shadcn` package stays out of the lockfile.** Its CLI dependencies carry a high advisory with no patch (GHSA-vfj7-8cjw-p6xm), so the CLI runs through `pnpm dlx shadcn@<version>` and the CSS its components need is vendored in `apps/web/src/app/shadcn.css` (#105).
- **New UI dependencies** outside this table still need the owner's approval.

## Trade-offs

- **Generic look.** shadcn apps tend to look alike. Mitigation: our own tokens, type and motion (M1, #105–#106), and hand-made signature views.
- **Generated code is ours to maintain.** Upstream fixes to shadcn components do not arrive with `pnpm update`; Base UI fixes do, through the dependency.
- **Bundle:** about 30 kB (Base UI) + 12.5 kB (forms) + 10 kB (TanStack Query) gzip on top of React, plus Recharts on chart views only. Acceptable for an app shell; the Lighthouse ≥ 95 target (#119) checks it.
- **Two read paths** (Server Components and TanStack Query) need one rule per feature on who owns a piece of data; the default is Server Components.
- **Forms and data fetching** are decided before any screen exercises them: the demo uses mock reads and no real forms. F1 is where they are validated; revisit there if they fight the flows.
