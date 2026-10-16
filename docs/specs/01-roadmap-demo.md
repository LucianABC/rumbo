# 01 — Roadmap subway map (front-end demo slice)

Status: revision 2, approved by the owner on 2026-10-16 (contract realigned with ADR 0004, #101; app views and mock layer, #102). Deadline: demo-ready 2026-10-25. Epic #99.

## What

A front-end-only slice that pulls the F3 roadmap view forward, inside an app shell that already shows every tab. Data comes from contract-typed mocks instead of the API.

- **Roadmap (the showpiece).** The user's combined roadmap is drawn as a subway map:
  - each line is one active target (F2b: up to three, one primary), and its terminal station is that target role;
  - stations are the milestones on the way. Each milestone holds roadmap items of the three F3 types (practice project, new work experience, education), and each item closes one or more gaps;
  - an interchange is a milestone whose items close gaps that several targets need. It advances more than one target at once, which is why F3 ranks shared gaps higher;
  - clicking a station opens a detail panel. "Analyze my progress" streams a short assessment from Claude, standing in for the future Tracking agent.
- **Every other tab** (Profile, Skills & gaps, Projects, Sources) gets a light view over the same mocks, and Roadmap opens with a summary of the profile, the goal and how they connect. `docs/product/views.md` defines what each one shows and needs.

## Why

- It gives the project a demo-able UI for a screen-shared walkthrough, where front-end craft is the point: layout, type, motion, tokens, accessibility and performance.
- It pulls the UI forward without forking the architecture. The mocks use the shapes of ADR 0004, and components read data only through `lib/data`. When the API serves real data, the migration is replacing `lib/data` and deleting `mocks/`.

## Constraints and deliberate exceptions

- **Local only.** Nothing is deployed to Vercel or exposed in any way (hard limit in `CLAUDE.md`: no public exposure before real auth). Each milestone is "done" when it is merged, tagged and runs locally with `pnpm --filter @rumbo/web build && pnpm --filter @rumbo/web start`.
- **Lives in `apps/web`.**
  - Each tab is a route: `/roadmap`, `/profile`, `/skills`, `/projects`, `/sources`, plus `/tokens` for M1.
  - `/` redirects to `/roadmap`, so the demo opens on the map.
  - The status page moves to `/status`, and the e2e smoke test follows it (#107).
- **Route handlers under `/demo/*`**, not `/api/*`: `src/proxy.ts` forwards `/api/*` to the NestJS API (ADR 0002).
  - `/demo/health` and `/demo/analyze` are a temporary exception to ADR 0002 §5 ("no backend logic in Vercel functions").
  - Moving the analysis behind the API and the router is #121.
- **Model id from `ANTHROPIC_MODEL`**, not from `packages/router`. This is an exception to the "model ids only in the router" rule, scoped to this adapter and also tracked by #121.
- **Dependencies**, approved by the owner: `tailwindcss` + `@tailwindcss/postcss` + `postcss` (v4), `motion`, `ai`, `@ai-sdk/anthropic`. Fonts come from `next/font`. No UI kits. Anything else needs asking first.
- **Layout is hand-authored.** Geometry lives in a separate `RoadmapLayout`, on a grid, with octilinear segments only. Parallel offsets where lines share a stretch are authored too (no layout algorithm).
- **The demo starts after onboarding.** The mock user has already imported a profile and chosen three targets. The onboarding flow and changing the goal are documented in `docs/product/views.md`. Onboarding is not built. Change targets is a mocked entry: a read-only explainer with a sample preview, with no editing or recalculation.
- **Mocks are a fictional user.** Nothing in mocks, copy, prompts or tests refers to the owner's own projects, plan or targets.

## Contract

Two schemas, because they have different owners and lifetimes:

| Schema          | What it is                                                                   | Who produces it later                                                     | File                                       |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| `Roadmap`       | Domain view of one user's plan: targets, gaps, milestones, items, evidence   | The API (F3), from the tables in ADR 0004                                 | `packages/contracts/src/roadmap.ts`        |
| `RoadmapLayout` | Presentation only: where each station sits, line color slots, bends, offsets | Hand-authored for the demo; computed or stored per roadmap from F3 onward | `packages/contracts/src/roadmap-layout.ts` |

### Why the split and what changed from the first draft

- **ADR 0004 is the source of truth.** A line is a `Target`. A milestone holds `RoadmapItem`s, and the item (not the milestone) has the type, `doneWhen` and status. Items close `Gap`s. Each gap carries its demand per target: which targets need it and how often that target's market snapshot asks for it (`GapTarget` with `snapshotId`). Gaps are inferred from the chosen targets and the market, so the UI can always show the numbers that justify one. The first draft put type and tasks on the milestone, which contradicted the ADR.
- **Interchanges, routes and "you are here" are derived, not authored.** `deriveRoadmapView(roadmap)` in `packages/contracts/src/roadmap-derive.ts` computes them once per roadmap, so they can never disagree with the data and views do not recompute them per station:
  - a milestone's targets are the union of the targets in the demand of the gaps its items close. More than one target means it is an interchange;
  - a target's route is every milestone that serves it, in plan order, then its terminal;
  - a milestone's status follows from its items: all done → done; any done or in progress → in progress; else pending;
  - "you are here" is the first milestone in plan order that is not done.
- **No agent will ever produce coordinates.** Keeping geometry out of the domain means the API can replace the domain mock unchanged. The layout can then be computed, stored or dropped on its own.
- **Line color is presentation.** A target does not "have" a color. The layout assigns each target a color slot (`line-1…3`), which maps to a token. Every tab reads it through `targetColors(roadmap, layout?)`: the layout's slots when the layout passes `checkLayout`, otherwise target order with the primary first. A missing map never costs a target its color (`docs/product/views.md`).
- Removed from the first draft: `lines`, `routes`, `journey`, `currentStationId`, `Station.kind` and `itemType` on milestones. Each one is now either derived or moved to the layout.

### `Roadmap` (domain)

```ts
// Shared by roadmap and layout (packages/contracts/src/ids.ts)
const Id = z.string().regex(/^[a-z0-9-]+$/);
const WebUrl = z.url({ protocol: /^https?$/ }); // anything rendered as href
const IsoDate = z.iso.date();

/** Catalog entries are global (ADR 0004); the view carries just what the UI shows. */
export const SkillRef = z.object({ id: Id, name: z.string().min(1) });
export const RoleFamilyRef = z.object({
  id: Id,
  name: z.string().min(1),
  field: z.string().min(1),
});

export const Target = z.object({
  id: Id,
  roleFamily: RoleFamilyRef, // the terminal's label is roleFamily.name
  isPrimary: z.boolean(),
  seniority: z.string().optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  region: z.string().optional(),
});

export const Gap = z.object({
  id: Id,
  skill: SkillRef,
  priority: z.int().min(1), // 1 = highest
  rationale: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'closed']),
  demand: z
    .array(
      z.object({
        targetId: Id, // GapTarget
        snapshotId: Id, // the market snapshot that justifies the gap for this target
        share: z.number().min(0).max(1), // fraction of the snapshot's postings asking for the skill
        postingCount: z.int().min(1),
      }),
    )
    .min(1),
});

export const EvidenceRef = z.object({
  id: Id,
  sourceType: z.enum(['experience', 'project', 'commit', 'education', 'manual']),
  sourceRef: z.string().min(1), // checked per sourceType, see rules below
  excerpt: z.string().optional(),
  approvedAt: z.iso.datetime().nullable(), // null = waiting for the user (AI rule 2)
});

const ItemBase = z.object({
  id: Id,
  title: z.string().min(1),
  doneWhen: z.string().min(1), // verifiable completion criterion (ADR 0004)
  status: z.enum(['pending', 'in_progress', 'done']),
  gapIds: z.array(Id).min(1), // RoadmapItemGap
  evidence: z.array(EvidenceRef),
  expectedEnd: IsoDate.optional(),
  lastProgressAt: IsoDate.optional(),
});

export const RoadmapItem = z.discriminatedUnion('type', [
  ItemBase.extend({
    type: z.literal('project'),
    repo: z.string().optional(),
    tasks: z.array(z.object({ id: Id, title: z.string().min(1), done: z.boolean() })),
  }),
  ItemBase.extend({
    type: z.literal('education'),
    kind: z.enum(['course', 'workshop', 'degree', 'certification']),
    provider: z.string().min(1),
    url: WebUrl.optional(),
  }),
  ItemBase.extend({
    type: z.literal('work_experience'),
    context: z.string().min(1), // e.g. "own the weekly report at the current job"
  }),
]);

export const Milestone = z.object({
  id: Id,
  title: z.string().min(1),
  summary: z.string().optional(),
  items: z.array(RoadmapItem).min(1),
});

export const Roadmap = z
  .object({
    from: z.string().min(1), // starting point, e.g. the current role from the profile
    targets: z.array(Target).min(1).max(3),
    gaps: z.array(Gap),
    milestones: z.array(Milestone).min(1), // in plan order
    updatedAt: z.iso.datetime(),
  })
  .superRefine(/* rules below */);
```

Rules checked in `superRefine`. Each one fails with a readable message, for example `gap "sql" has no roadmap item`:

- ids are unique per collection (targets, gaps, milestones, items, evidence), within a project's tasks, and per target in a gap's demand;
- no milestone shares an id with a target, because terminals are drawn as stations;
- every `demand[].targetId` and `gapIds` entry resolves;
- exactly one target is primary;
- **F3 rule:** every gap is closed by at least one item;
- a gap's stored status agrees with its items: `open` when none has started, `in_progress` when one has, `closed` only when one is done;
- an item is `done` only with at least one approved evidence;
- evidence `sourceRef` matches its `sourceType`: a commit SHA, an http(s) URL for project and education proof, an id for experience, free text for manual entries (never rendered as a link);
- every milestone serves at least one known target, through its items' gaps.

### `RoadmapLayout` (presentation)

```ts
export const GridPoint = z.object({ x: z.int(), y: z.int() });

export const RoadmapLayout = z.object({
  lines: z.array(z.object({ targetId: Id, colorToken: z.enum(['line-1', 'line-2', 'line-3']) })),
  stations: z.array(z.object({ id: Id, at: GridPoint })), // milestone ids and target ids (terminals)
  bends: z.array(z.object({ targetId: Id, after: Id, points: z.array(GridPoint).min(1) })),
  offsets: z.array(z.object({ targetId: Id, from: Id, to: Id, lane: z.int().min(-2).max(2) })),
});
```

`checkLayout(roadmap, layout)` validates the layout against the roadmap:

- every milestone and target has a position, and every target has exactly one color slot, with no slot used twice;
- nothing stale: no positions for unknown stations, no colors for unknown targets, no station placed twice, no two stations on the same point;
- bends and offsets reference real stations on that target's derived route, and two lines never share a lane on the same stretch;
- every segment of every derived route, bends included, is horizontal, vertical or at 45°.

`/roadmap` renders without a layout too, as the single-line view. A missing or invalid layout degrades to that view; it does not error.

## Data access and mocks

```
apps/web/src/
  mocks/                    fictional user; delete when the API serves real data
    README.md               what each file mirrors and how to replace it
    roadmap.ts              Roadmap            (ADR 0004)
    roadmap-layout.ts       RoadmapLayout      (presentation)
    profile.ts              profile, evidence, profile sources (F1, ADR 0004)
    market.ts               market snapshots   (F2, provisional)
    sources.ts              market sources     (F2, provisional)
    drafts.ts               suggested changes  (F4, provisional)
    progress.ts             project activity   (F5, provisional)
  lib/data/                 the only thing components import
    index.ts                getRoadmap(), getRoadmapLayout(), getProfile(), getProfileSummary(),
                            getMarket(), getSources(), getDrafts(), getProgress()
```

- **Typed at compile time and checked at runtime.** Each mock is a `.ts` object declared with `satisfies` its contract type. A test parses every mock with its schema and runs `checkLayout`.
- **Components never import from `mocks/`.** An ESLint `no-restricted-imports` rule enforces it outside `lib/data`.
- **`lib/data` functions are async and return contract types.** Swapping a mock for the typed API client (#79) changes only that function.
- **Contracts that ADRs already back** (`Roadmap`, `RoadmapLayout`, `Profile`) live in `packages/contracts/src/`.
- **Contracts without a spec yet** (market, sources, drafts, progress) live in `packages/contracts/src/provisional/`, exported as `@rumbo/contracts/provisional`. The F2, F4 and F5 specs replace or promote them; nothing outside `apps/web` may import them.

## Mock user

A fictional customer support specialist with three active targets, chosen to be outside the owner's field. Together the data exercises every item type, status and visual state.

- **Targets:**
  - Data Analyst (primary), Analytics field;
  - Business Analyst, Business field;
  - Support Operations Lead, Customer operations field.
- **Gaps**, in priority order:
  1. SQL (all three targets);
  2. Data visualization (Data Analyst, Business Analyst);
  3. Requirements analysis (Business Analyst);
  4. Statistics (Data Analyst);
  5. Workforce planning (Support Operations Lead).
- **Milestones**, in plan order. Their interchanges and statuses follow from the items:

  | #   | Milestone                         | Items (type → gaps)                                                                                                        | Serves     |
  | --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
  | 1   | Learn the query basics            | SQL fundamentals certificate (education → SQL), done with approved evidence                                                | DA, BA, SO |
  | 2   | Own the weekly support report     | Automate the weekly report (work_experience → SQL, Data visualization), in progress                                        | DA, BA, SO |
  | 3   | Map a real process                | Requirements workshop (work_experience → Requirements analysis), done, evidence awaiting approval → item still in progress | BA         |
  | 4   | Plan the team's capacity          | Support operations certificate (education → Workforce planning)                                                            | SO         |
  | 5   | Build a public dashboard          | Sales dashboard project (project → Data visualization) with repo and tasks                                                 | DA, BA     |
  | 6   | Ground the analysis in statistics | Statistics course (education → Statistics); Open data case study (project → Statistics)                                    | DA         |

- Milestone 1 is done, and milestone 2 is "you are here".
- Milestone 3 deliberately shows the human-approval rule: its work is done, but the item is not, until the user approves the evidence.
- Dates are set relative to 2026-10-16.

## Acceptance criteria

**M0 — skeleton** (#104, tag `v0.0-skeleton`)

- Tailwind v4 is wired into `apps/web`, and lint, typecheck, test, build and the e2e smoke stay green.
- `/demo/health` returns `{ status: 'ok' }`.
- `/roadmap` renders the mock roadmap as an unstyled list through `getRoadmap()`, with milestones in plan order, derived targets and status, and "you are here".
- Contract tests (#101) cover every `superRefine` rule and `checkLayout` rule, with a readable message each.
- Mock tests (#103) parse every mock, and the import restriction is enforced.

**M1 — foundations** (#105, #106; no tag; owner approval gates M2)

- `/tokens` shows two directions side by side. Each one includes:
  - a palette with three line colors in light and dark, typeface pairing and type scale;
  - a sample station and segment;
  - the shared elements every tab uses: tab bar, card, table row, status chip, diff line, empty state and focus ring.
- Line colors meet ≥ 3:1 against the map background in both themes, and text meets ≥ 4.5:1. The measured values are shown.
- After the owner picks a direction, `@theme` covers:
  - colors (light and dark) and line colors;
  - type scale, spacing, radii;
  - durations and easings.

**Shell** (#107)

- Navigation reaches every tab defined in `docs/product/views.md`: a bottom bar on mobile and a side rail on desktop, with count pills and attention badges.
- The current tab is marked with `aria-current`, and every tab is reachable by keyboard.
- A tab not built yet shows the designed "Planned" state.

**M2 — single-line view** (#108–#110, tag `v0.1-presentable`)

- Milestones render as an `<ol>` in plan order, with:
  - line-colored segments per target and status styling (done, in progress, pending);
  - item-type glyphs and interchange markers;
  - one terminal per target at the end.
- Each station's accessible name has title, status, targets and "you are here", for example "Own the weekly support report, in progress, serves Data Analyst, Business Analyst and Support Operations Lead, you are here".
- The "you are here" marker has a micro-animation, disabled under `prefers-reduced-motion`.
- The detail panel shows:
  - the milestone's items, each with type, `doneWhen`, status and gaps it closes;
  - tasks for project items and evidence with approval state;
  - expected end and last progress, with empty states when missing.
- The panel is a side sheet at `md` and up and a bottom sheet below. It uses dialog semantics, traps focus, closes with Esc and returns focus to the station.
- Keyboard:
  - ↑/↓ (and ←/→) move between stations with roving tabindex, and Home/End jump to the first/last;
  - Enter/Space open the panel and Esc closes it;
  - focus is always visible.
- Dark mode follows the system. Layout works from 360px with no horizontal scroll.
- Playwright covers opening with the keyboard, closing with Esc and focus returning, plus zero axe violations on `/roadmap`.

**Roadmap summary and light tabs** (#111–#115)

- Roadmap opens with the summary band from `docs/product/views.md`: who the user is, their targets, and per target how much of the market's demand their evidence covers. **Change targets** opens the mocked, read-only explainer.
- Profile, Skills & gaps, Projects and Sources each meet their section in `docs/product/views.md`: content, states, data through `lib/data`, tokens, keyboard and 360px+.
- Every gap shows the market numbers that justify it, styled as data, apart from the model's rationale.
- A target looks the same on every tab.

**M3 — map** (#117, tag `v0.2-map`)

- From `lg` up, an SVG map draws every derived route from the layout:
  - octilinear segments with rounded corners at bends;
  - authored offsets on shared stretches;
  - interchange glyphs.
- Below `lg`, the M2 view.
- On load, lines draw in with `stroke-dashoffset`; under reduced motion they appear static.
- Hovering or focusing a station or line highlights its targets and dims the rest.
- The map uses the same station components and panel as M2. The SVG is `aria-hidden` decoration over the focusable station list, so keyboard and screen-reader behavior matches M2.

**M4 — analyze** (#118, tag `v0.3-agent`)

- `POST /demo/analyze` sends the roadmap to Claude and streams `{ summary, nextMilestoneId, risk }`.
- The final object is validated with Zod. An unknown id is shown without a link (rule 3).
- The prompt treats the roadmap as data. The key comes from `ANTHROPIC_API_KEY` and the model from `ANTHROPIC_MODEL`.
- Each call is capped by `maxOutputTokens`, and each analysis run has a token budget (input + output) that stops it when exceeded; retries count against the same run (rule 4). One server log line per call records run id, model, input/output tokens and estimated cost, with no roadmap content (rules 4–5).
- Prompt-injection test: a roadmap whose milestone title and summary carry instructions ("Ignore previous instructions…") is sent through the mock client. The test asserts the prompt marks the roadmap as data and the parsed output still matches the schema (rule 1).
- Mock mode: `DEMO_MOCK=1` or a missing key streams a recorded response with realistic timing. Tests use the mock only and never call the API.
- The UI has states for idle, thinking, streaming, done, error with retry, and empty (nothing in progress).

**M5 — polish** (#119, #120, tag `v1.0-demo`)

- Lighthouse performance and accessibility ≥ 95 on `/roadmap` against a local production build.
- Edge cases are covered:
  - long titles, an item with no evidence, missing dates;
  - a target served by one milestone;
  - a single active target.
- The README section covers:
  - what the demo is, a screenshot or GIF, and how to run it locally;
  - design decisions and trade-offs;
  - out of scope and where it lives.
- `docs/demo-script.md` holds a 10–12 minute walkthrough.

## Evals

A minimal golden set for the analyze prompt, in `evals/` and run by `pnpm eval` (real calls, never in `pnpm test`):

- three fictional roadmaps: on track, stalled (no progress in four weeks), and almost done;
- each case checks that the output parses, that `nextMilestoneId` exists and is not done, and that the risk names something present in the roadmap;
- before/after results are shown whenever the prompt changes (rule 6).

The real Tracking agent gets its own golden set when it is built (F5).

## Out of scope (stays in the plan)

| Item                                                                                                                              | Where in the plan   |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Ownership scoping, CV ingestion, real profile extraction                                                                          | Ownership, F1       |
| Real market search, job-postings MCP server                                                                                       | F2                  |
| Onboarding flow and target discovery (questionnaire, suggested paths, choosing and reprioritizing targets, recalculation preview) | F2b                 |
| Gap and roadmap agents with evals, persisted roadmaps, computed layout (reuse this UI)                                            | F3                  |
| Real drafting and export; writing to LinkedIn (its edit API is restricted to LinkedIn partners)                                   | F4                  |
| Tracking agent, GitHub App, per-push analysis, real evidence approval                                                             | F5                  |
| Typed API client replacing `lib/data` mocks                                                                                       | #79, per feature    |
| Routing for analyze, orchestration, tracing                                                                                       | #121, router tuning |
| Auth and any deploy (Vercel included)                                                                                             | Production launch   |
