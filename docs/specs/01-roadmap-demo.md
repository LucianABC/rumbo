# 01 — Roadmap subway map (front-end demo slice)

Status: draft, pending owner approval. Deadline: demo-ready 2026-10-25.

## What

A front-end-only slice of the F3 roadmap view: a user's combined roadmap drawn as a subway map, with seed data instead of the API. Each line is a path toward one job target (the active targets chosen in F2b), and its terminal station is that target role. Stations are the milestones the path requires, each closed by one of the three F3 item types (practice project, new work experience, education). An interchange is a milestone shared by several paths: it advances more than one target at once, which is why F3 ranks shared gaps higher. Clicking a station opens a detail panel. An "Analyze my progress" action streams a short assessment from Claude, standing in for the future Tracking agent.

## Why

- It gives the project a demo-able UI for a screen-shared walkthrough, where front-end craft is the point: layout, type, motion, tokens, accessibility and performance.
- It pulls one piece of the roadmap UI forward. Everything here must be reused as-is when the roadmap comes from the API, so components never know where the data comes from.

## Constraints and deliberate exceptions

- **Local only.** Nothing is deployed to Vercel or exposed in any way (hard limit in `CLAUDE.md`: no public exposure before real auth). Each milestone is "done" when it is merged, tagged and runs with `pnpm --filter @rumbo/web build && start` locally.
- **Lives in `apps/web`** under `/roadmap` and `/tokens`. The status page and the smoke e2e stay on `/`.
- **Route handlers under `/demo/*`**, not `/api/*`: `src/proxy.ts` forwards `/api/*` to the NestJS API (ADR 0002). `/demo/health` and `/demo/analyze` are a temporary exception to ADR 0002 §5 ("no backend logic in Vercel functions"). When F3/F5 land, the analyze call moves to the API/worker behind the router. A follow-up ticket tracks that move.
- **Model id from `ANTHROPIC_MODEL`**, not from `packages/router`. This is an exception to the "model ids only in the router" rule, scoped to this adapter and tracked by the same follow-up ticket.
- **Dependencies**, approved by the owner: `tailwindcss` + `@tailwindcss/postcss` (v4), `motion`, `ai`, `@ai-sdk/anthropic`. Fonts come from `next/font`. No UI kits. Anything else needs asking first.
- **Layout is hand-authored.** Coordinates and bends live in the seed, on a grid, with octilinear segments only. Where lines share a stretch, the parallel offset is also authored in the seed (no offset algorithm).
- **Seed is a fictional user.** Nothing in the seed, copy, prompts or tests refers to the owner's own projects, plan or targets: rumbo is a product for any job seeker, not a personal tool. The seed exists only in `roadmap.json`, and no component hard-codes any of its content.

## Contract (`packages/contracts/src/roadmap.ts`)

Changes from the brief, with reasons:

- **Lines are paths to targets, not projects.** A line ends at its own terminal station, the target role. The contract allows several lines to share a terminal (two paths to the same role) or to end at different ones (up to three active targets, F2b).
- **An interchange is a shared milestone.** It is still just a station with `lineIds.length > 1`, as in the brief. No separate "skill" stations are needed.
- `Station.kind`: `milestone` or `terminal`. A terminal has no tasks or status of its own; its progress comes from its line.
- `Station.itemType`: how a milestone is closed. It uses the three F3 item types (`project`, `work`, `education`) and drives the station's glyph and panel copy.
- `Line.targetStationId`: the terminal the path leads to. `Line.primary` marks the primary target (F2b: one target is primary).
- `Roadmap.to` is removed: the target roles are the terminals, so a single `to` label would be wrong with more than one target. `from` stays as the starting-point label.
- `Roadmap.journey`: the single-line (mobile/M2) view needs one total order across lines. Station `position` alone does not define it.
- `Station.summary`: one line of copy for the detail panel.
- `colorToken` is constrained to the token naming scheme, so it can never be a hex value.

```ts
const IsoDate = z.iso.date();
const Id = z.string().regex(/^[a-z0-9-]+$/);
const Point = z.object({ x: z.int(), y: z.int() }); // grid units

export const Line = z.object({
  id: Id,
  name: z.string(), // the path, e.g. "Data Analyst path"
  targetStationId: Id, // its terminal
  primary: z.boolean(),
  colorToken: z.string().regex(/^line-[a-z0-9-]+$/), // maps to --color-line-* in @theme
});

export const Task = z.object({ id: Id, title: z.string(), done: z.boolean() });

const StationBase = z.object({
  id: Id,
  title: z.string(),
  summary: z.string().optional(),
  lineIds: z.array(Id).min(1), // >1 means interchange: a milestone shared by several paths
  position: Point,
});

export const Station = z.discriminatedUnion('kind', [
  StationBase.extend({
    kind: z.literal('milestone'),
    itemType: z.enum(['project', 'work', 'education']),
    status: z.enum(['done', 'in_progress', 'pending']),
    targetDate: IsoDate.optional(),
    lastProgressAt: IsoDate.optional(),
    tasks: z.array(Task).min(1),
  }),
  StationBase.extend({ kind: z.literal('terminal') }), // the target role
]);

export const LineRoute = z.object({
  lineId: Id,
  stationIds: z.array(Id).min(2), // ends at the line's terminal
  bends: z.array(Point).optional(),
});

export const Roadmap = z
  .object({
    from: z.string(),
    currentStationId: Id, // must be a milestone
    journey: z.array(Id), // single-line order; terminals come last
    lines: z.array(Line).min(1).max(3),
    stations: z.array(Station),
    routes: z.array(LineRoute),
  })
  .superRefine(/* referential integrity, see acceptance criteria */);
```

## Data access

`getRoadmap(): Promise<Roadmap>` in `apps/web/src/lib/roadmap.ts` is the only entry point for data. Today it imports `src/data/roadmap.json` and parses it with `Roadmap`. Once the API serves roadmaps (F3), it calls the API. Its signature does not change, and no component imports the JSON.

## Seed

A fictional user, chosen to be clearly not the owner and outside the owner's field: a customer support specialist (`from`) with three active targets. Together the paths exercise all three item types and every visual state.

- Lines (3, one per active target):
  - `data-analyst` (primary) → terminal "Data Analyst".
  - `business-analyst` → terminal "Business Analyst".
  - `support-ops` → terminal "Support Operations Lead".
- Shared milestones (interchanges):
  - "SQL fundamentals certificate" (education): `data-analyst`, `business-analyst`.
  - "Automate the weekly support report" (work): all three lines. This is the current station, `in_progress`.
  - "Sales dashboard project" (project): `data-analyst`, `business-analyst`.
- Single-path milestones:
  - `data-analyst`: "Statistics course" (education); "Open data case study" (project).
  - `business-analyst`: "Requirements workshop with the product team" (work); "Process-mapping case study" (project).
  - `support-ops`: "Lead the ticket-triage rotation" (work); "Support operations certificate" (education).
- Every milestone has 2–4 plausible tasks and a mix of statuses and dates.

## Acceptance criteria

**M0 — skeleton** (tag `v0.0-skeleton`)

- Tailwind v4 is wired into `apps/web`, and existing lint, typecheck, test and build stay green.
- `/demo/health` returns `{ status: 'ok' }`.
- `/roadmap` renders the seed as an unstyled list, through `getRoadmap()`.
- Unit tests: the seed parses, and a broken seed fails with a readable Zod error. Referential integrity:
  - every `lineId`, `stationId` and `targetStationId` resolves;
  - each route's stations carry that line, and the route ends at the line's terminal;
  - exactly one line is primary;
  - `journey` covers each station exactly once, with terminals last;
  - `currentStationId` is a milestone;
  - every route segment, including bends, is horizontal, vertical or at 45°.

**M1 — foundations** (no tag; owner approval gates M2)

- `/tokens` shows two directions side by side: palette with three line colors in light and dark, typeface pairing, type scale, sample station and segment.
- Every line color meets ≥ 3:1 contrast against the map background in both themes. Text tokens meet ≥ 4.5:1.
- After the owner picks a direction, the `@theme` tokens cover:
  - colors (light and dark) and line colors;
  - type scale, spacing, radii;
  - durations and easings.

**M2 — single-line view** (tag `v0.1-presentable`)

- Stations are rendered as an `<ol>` in `journey` order, with line-colored segments, status styling (done, in progress, pending), interchange markers for shared milestones, an item-type glyph and distinct terminals (the target roles).
- Each station's accessible name includes its title, status and lines (for example "Automate the weekly support report, in progress, shared by Data Analyst, Business Analyst and Support Operations Lead paths, you are here").
- A "You are here" marker has a micro-animation that is disabled under `prefers-reduced-motion`.
- The detail panel shows:
  - the item type, the paths (target roles) the milestone advances, the summary and tasks with done state;
  - target date and last progress date, with an empty state when missing.
- The panel is a side sheet at `md` and up and a bottom sheet below. It uses dialog semantics, traps focus, closes with Esc and returns focus to the station.
- Keyboard: ↑/↓ (and ←/→) move between stations with roving tabindex, Home/End jump to the first/last station, Enter/Space open the panel, Esc closes it. Focus is always visible.
- Dark mode follows the system. Layout works from 360px with no horizontal scroll.
- Playwright: open with keyboard, close with Esc, focus returns; zero axe violations on `/roadmap`.

**M3 — map** (tag `v0.2-map`)

- From `lg` up, an SVG map draws every route:
  - octilinear segments with rounded corners at bends;
  - authored parallel offsets;
  - interchange glyphs.
- Below `lg`, the M2 view.
- On load, lines draw in with `stroke-dashoffset`; under reduced motion they appear static.
- Hovering or focusing a station or line highlights its line(s) and dims the rest.
- Stations are the same components and use the same panel. The map is `aria-hidden` decoration over a focusable station list, so keyboard and screen-reader behavior matches M2.

**M4 — analyze** (tag `v0.3-agent`)

- `POST /demo/analyze` sends the roadmap to Claude and streams a structured object: `{ summary, nextStationId, risk }`.
- The final object is validated with Zod. An unknown `nextStationId` is shown without a link (rule 3).
- External content is limited to the seed, and the prompt treats it as data.
- The key comes from `ANTHROPIC_API_KEY` and the model from `ANTHROPIC_MODEL`.
- Each call is capped by `maxOutputTokens`. One server log line records model, input/output tokens and estimated cost, with no roadmap content (rules 4–5).
- Mock mode: `DEMO_MOCK=1` or a missing key streams a recorded response with realistic chunk timing. Tests use the mock only and never call the API.
- The UI has states for idle, thinking, streaming, done, error with retry, and empty (no stations in progress).

**M5 — polish** (tag `v1.0-demo`)

- Lighthouse performance and accessibility ≥ 95 on `/roadmap` against a local production build.
- Edge cases are covered: long titles, a station with no tasks, missing dates, a line with one milestone.
- The README section covers:
  - what the demo is, a screenshot or GIF, and how to run it locally (no live link, since the demo is local only);
  - design decisions and trade-offs;
  - what is out of scope and where it lives in the plan.
- `docs/demo-script.md` holds a 10–12 minute walkthrough.

## Evals

None in this slice. The analysis is a stand-in shown to the user and nothing feeds logic beyond the validated `nextStationId`. The real Tracking agent gets a golden set when it is built (F5, per rule 6).

## Out of scope (stays in the plan)

| Item                                                                               | Where in the plan |
| ---------------------------------------------------------------------------------- | ----------------- |
| Ownership scoping, CV ingestion and the profile                                    | Ownership, F1     |
| Market search, job-postings MCP server                                             | F2                |
| Target discovery (suggested paths, questionnaire, choosing targets); progress %    | F2b, F3           |
| Real gaps and roadmap from the API, gap and goal agents with evals (reuse this UI) | F3                |
| Drafting with human approval                                                       | F4                |
| Tracking agent, GitHub App, per-push analysis                                      | F5                |
| Routing for analyze, orchestration, tracing                                        | router tuning     |
| Auth and any deploy (Vercel included)                                              | Production launch |
