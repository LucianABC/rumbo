# App views and navigation

What the web app shows, tab by tab: what each view is for, what it shows, its states, the data it needs and where that data's shape is decided. The roadmap demo (spec 01, epic #99) uses these views with mock data; each feature later fills them with real data. When a feature's spec changes a view, it updates this page.

## Tabs at a glance

| Tab                | Answers                                              | Features   | Demo                 |
| ------------------ | ---------------------------------------------------- | ---------- | -------------------- |
| **Roadmap** (home) | Where am I, where am I going, what's next?           | F3, F2b    | full (map) + summary |
| **Profile**        | What does rumbo know about me, from what source?     | F1, F4     | light                |
| **Skills & gaps**  | What do I have, what is missing, and why?            | F1, F2, F3 | light                |
| **Projects**       | What am I building, and what proves it?              | F3, F5     | light                |
| **Sources**        | Where does this data come from, and how fresh is it? | F1, F2     | light                |

Five tabs, so the phone bottom bar fits all of them without a "More" menu. The tabs only exist after onboarding: a first-time user goes through the onboarding flow below, not through the tabs.

## Onboarding flow — F1 (#41), F2b (#63), F3 (#43)

**Demo (spec 01): documented only, not built.** The demo starts after onboarding, with the profile loaded and three targets chosen.

A full-screen, step-by-step flow outside the tab shell, at `/onboarding`. It has a progress indicator, Back on every step, and a saved draft so the user can leave and resume. The AI proposes; the user decides at every step (AI rule 2).

| #   | Step                      | What happens                                                                                                                                                                                                                                                                                                                                                                  | AI's role                                                                                                                                   |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Welcome**               | What rumbo does, what it needs, and that nothing changes without the user's approval.                                                                                                                                                                                                                                                                                         | —                                                                                                                                           |
| 2   | **Bring your profile**    | Upload a CV and/or the LinkedIn PDF export; optionally link the public LinkedIn URL. Extraction progress is shown per section. _Proposed, pending #155:_ **No CV?** "Build it by answering questions" starts the Profile interviewer instead.                                                                                                                                 | Extracts experiences, education, skills and evidence (F1); or interviews the user to build the profile (Profile interviewer, general mode). |
| 3   | **Check your profile**    | The extracted profile, editable: fix experiences, remove wrong skills, approve candidate skills. Each skill shows the evidence it came from. A few questions about what the CV leaves thin; each answer is a proposed change to approve.                                                                                                                                      | Flags low-confidence extractions; asks about thin areas (Profile interviewer, general mode).                                                |
| 4   | **Your goal, your words** | Free text first: "What do you want your next job to be like?" Then the questionnaire on what a CV does not say: kind of work, IC vs. management, work mode, region, languages, salary floor, time horizon, weekly learning hours. Questions come from a fixed bank with skip rules (code). A shortcut: "I already know the role", which picks role families from the catalog. | Flags which questions the CV already answers, so they are skipped (Path advisor).                                                           |
| 5   | **Suggested paths**       | Three to five career paths, each a comparison card. The card shows:<ul><li>what the role does;</li><li>what the user already has (with evidence) and what is missing;</li><li>real market data, kept apart from the model's opinion;</li><li>estimated time to ready.</li></ul>Side-by-side compare. The user can also add a role that was not suggested.                     | Suggests and explains, citing profile evidence and market data (F2b).                                                                       |
| 6   | **Choose your targets**   | Pick one to three; mark one as primary. A summary of the choice and what it implies (shared gaps, time horizon).                                                                                                                                                                                                                                                              | Points out trade-offs, e.g. two targets with few shared gaps.                                                                               |
| 7   | **Building your roadmap** | Market snapshots, gaps and the roadmap are computed. Progress streams per stage: market → gaps → gap check → roadmap. At the gap check the user answers a few questions about the gaps only ("Have you used dbt anywhere?"); a yes with evidence closes the gap before it is planned. On success the user lands on Roadmap with "you are here" at the first milestone.        | Runs the market, gap and roadmap agents (F2, F3) and the Profile interviewer in gap check mode.                                             |

- **States:**
  - per step: loading, error with retry, and a manual fallback (enter the profile by hand if extraction fails);
  - step 7 also has a budget-exceeded state (AI rule 4).
- **Resume:** reopening rumbo mid-onboarding returns to the last unfinished step.

## Changing the goal

**Demo (spec 01): mocked only.** **Change targets** is visible and opens a read-only explainer of this flow with a sample preview. Nothing is edited or recalculated.

Targets can change at any time from **Change targets** in the Roadmap summary band. It reopens the flow at step 4 with everything prefilled. The profile is kept and can be re-imported from Profile.

1. **Steps 4–6 again:** previous answers and targets prefilled, with fresh suggestions.
2. **Preview before applying.** Recalculation changes the user's plan visibly, so the user sees a preview and confirms it (AI rule 2). The preview shows, per target:
   - which gaps appear, stay or disappear, with their market numbers;
   - which roadmap items are kept, added or dropped.
3. **Apply:**
   - targets that were removed are archived, not deleted (`Target.status = archived`, ADR 0004);
   - market snapshots, gaps and the roadmap are recalculated;
   - approved evidence and completed items are never lost. The preview can drop only pending or in-progress items. A done item whose gap disappears stays in the roadmap, marked "not needed for current targets". Its evidence belongs to the profile, so it keeps counting toward any target that needs that skill.
4. **History:** Roadmap shows "Targets changed on …" with a link to the previous version, read-only. This needs roadmap versions, which ADR 0004 does not model yet. The F3 spec decides them (#43).

The weekly recalculation (F5) recomputes the plan for the current targets (as in onboarding step 7), then shows the same preview and waits for the user to apply it. It never asks for new targets, and nothing changes without that confirmation.

## Shell

| Breakpoint     | Navigation                        |
| -------------- | --------------------------------- |
| < `md` (phone) | Bottom tab bar with the five tabs |
| ≥ `md`         | Side rail with the five tabs      |

- **Header:**
  - product name;
  - the primary target as context ("Toward Data Analyst");
  - a user menu with Settings and "Delete all my data" (`DELETE /api/v1/me`, #37).
- **Order of tabs** follows the user's loop: see the plan, see who I am, see why, do the work, check the data.
- **Badges:** neutral **count** pills for collections (Projects: open tasks). A distinct **attention** badge for things waiting on the user (Projects: evidence awaiting approval; Profile: suggested changes to review).
- **Routes:**
  - `/roadmap`, `/profile`, `/skills`, `/projects`, `/sources`;
  - `/onboarding`, outside the shell; a user with no profile or no active targets is sent there from any tab;
  - `/` opens Roadmap;
  - the status page lives at `/status`, outside the tabs.
- **Page header** on every tab: title, then one line of provenance, e.g. "Market data from 3 sources, checked 6 Oct 2026 · see Sources".
- **A11y:**
  - a skip link and landmarks (`nav`, `main`);
  - `aria-current="page"` on the active tab;
  - every tab reachable by keyboard.

## Conventions every view follows

- **A target looks the same everywhere.** Each active target has a color slot (`line-1…3`) that marks it on the map, on gap chips and in market bars. Every tab gets it from one function, `getTargetColors()` in `lib/data`: it reads the slots from `RoadmapLayout` when there is a valid layout, and otherwise assigns them in target order (primary first). A missing map never costs a target its color. Color is never the only cue: the target's name or initial always goes with it.
- **Status vocabulary is shared:**
  - items and milestones are `pending`, `in progress` or `done`;
  - gaps are `open`, `in progress` or `closed`;
  - evidence and suggested changes are `awaiting approval` or `approved`;
  - each status has one chip style, defined in tokens.
- **Human approval is visible.** Anything an agent proposed and the user has not approved shows an "awaiting approval" state with Approve/Reject (AI rule 2).
- **Facts and opinions look different.** Market numbers and sources (data) are visually distinct from model-written rationale (opinion), and opinion always links to the data behind it.
- **Every view has four designed states:**
  - loading: a skeleton matching the layout;
  - empty: what this view will show, and the step that fills it;
  - error: what failed, with a retry;
  - content.
- **Planned state.** A tab whose view is not built yet shows a designed empty state naming the feature and its phase. It is the fallback for any tab the detour does not finish.
- **Data comes only from `lib/data`** and has contract types. Views never import mocks.

## Look and feel: Field notes

The subway map is the metaphor for the plan, not the theme for every pixel. The rest of the app is a calm, legible work tool that borrows from transit signage only where it helps wayfinding:

- strong type hierarchy;
- line colors as identity;
- clear "you are here" orientation.

**Direction: B, "Field notes"**, picked by the owner on 2026-10-16 over A, "Wayfinding" (transit signage), after comparing both in light and dark (#105). The tokens live in `apps/web/src/app/globals.css` (#106); components use their utilities, never raw color values.

- **Why this direction:** a hand-drawn map in a notebook feels personal and calm, which suits a long job search more than a dashboard; muted inks leave strong color for status, so "awaiting approval" stands out.
- **Palette:** paper background (`#f3eee4` light, `#1a1814` dark), lighter paper cards, warm ink text, deep green primary.
  - lines: green, slate blue and plum (`line-1…3`), each ≥ 3:1 against the background in both themes. The primary line is green because the first terracotta read as an error (owner, 2026-10-23); it is a brighter, bluer green than `success`, so the two never share a value;
  - status: success (green), attention (amber) and pending (warm gray); status text ≥ 4.5:1 on background and cards;
  - errors use crimson (`destructive`) and focus rings the primary green, never a line color, so neither reads as a target;
  - hover fills, skeletons and secondary buttons use a darker paper (`muted`), never the background itself;
  - `apps/web/test/theme.test.ts` measures every ratio from `globals.css`.
- **Typefaces** (from `next/font`, self-hosted):
  - Bricolage Grotesque for headings: characterful without the formality of a serif;
  - Figtree for text and UI;
  - IBM Plex Mono for data, dates and figures, with tabular figures (`tabular-nums`);
  - the owner rejected Fraunces + Instrument Sans and also compared Source Serif/Sans, Newsreader + Public Sans and Young Serif + Figtree.
- **Type scale and spacing:** Tailwind's defaults (1rem body, 0.25rem step), plus `text-2xs` (11px) for tab-bar and map labels.
- **Shape:** 12px base radius (`--radius`); map strokes 6px with round caps and joins (`--map-stroke`), thick enough that the lines lead, as on a transit map, stations 6px (`--map-station`).
- **Motion:** `ease-soft` for things entering (sheet, line draw-in) and `ease-soft-in-out` for the "you are here" pulse; durations `--duration-quick` 120ms, `--duration-base` 200ms, `--duration-slow` 360ms and `--duration-pulse` 1.6s. Under `prefers-reduced-motion` every animation and transition is cut to an instant.
- **Dark mode** follows the system preference; there is no in-app toggle yet.

## Roadmap (home) — F3 (#43), F2b (#63)

- **For:** see the whole plan at a glance, how the user's profile connects to their goal, and what to do next.
- **Summary band** (top):
  - **Who:** current role, years of relevant experience, three strongest skills with their evidence count. Links to Profile. Relevant experience is derived, not tagged: the positions whose approved evidence backs a skill the active targets ask for most (same definition as below), overlaps counted once, so it follows the targets when they change.
  - **Goal:** the primary target and the other active ones (max three), each with role family, field and seniority, and **Change targets** (see Changing the goal).
  - **How they connect**, per target, on one line: a coverage meter and "6/11 top skills · 5 to close, 2 shared", with which targets share them on hover. The band is one wide, low card that reads as the page's header; field and seniority sit in the target name's tooltip. "Top skills" (asked for most) means the skills in at least 30% of that target's snapshot postings, capped at 12. Covered means the profile has evidence for the skill; the rest are that target's gaps. The numbers link to Skills & gaps, which uses the same definition.
- **Map:**
  - subway map on desktop and single line on mobile, one line per active target ending at its terminal;
  - every line leaves from the starting point (the current role), drawn as the origin station;
  - milestones as stations, with interchange glyphs where a milestone serves several targets, and "you are here";
  - **one line at a time** (#148): a line switcher under the map, which is also its legend, picks the target whose line the station list shows. The choice lives in the URL (`?line=<targetId>`; anything unknown counts as no choice). The list shows the starting point, that target's milestones and its terminal, and choosing a line scrolls to it. Clicking a line or its terminal on the map selects it too, as a mouse shortcut to the switcher;
  - **nothing is selected by default.** On desktop the map shows the whole plan and the station list stays hidden until the user picks a line. Phones have no map, so their list shows the primary's line until another is chosen. Once a line is chosen, the map dims the others and hovering still previews any line;
  - "you are here" is per line: the first milestone on the shown route that is not done, on the list, the map and the station sheet. With no line chosen, the map marks the plan's first open milestone;
  - the station sheet shows items, `doneWhen`, tasks (projects), evidence with approval state, and dates.
- **Analyze my progress:** a streamed summary, the suggested next milestone and one risk.
- **Full feature adds:**
  - recalculation when targets change;
  - progress % per target;
  - the target discovery flow (questionnaire, suggested paths, comparison);
  - a computed layout.
- **States:**
  - empty: no profile or no targets → the onboarding flow;
  - no layout: single-line view only;
  - analysis: idle, thinking, streaming, done, error with retry.
- **Data:**
  - `getRoadmap()` → `Roadmap` and `getRoadmapLayout()` → `RoadmapLayout` (spec 01, ADR 0004);
  - `getProfileSummary()` → derived from `Profile`;
  - `getMarket()` for the coverage numbers;
  - `getTargetColors()` for target identity.

## Profile — F1 (#41), F4 (#44)

- **For:** the user's full professional profile, presented as well as a good CV, and where it came from.
- **Shows:**
  - header: name, headline, location, linked LinkedIn URL;
  - about;
  - experience as a timeline (role, organization, period, highlights);
  - education and certifications;
  - skills grouped by category, each with an evidence count (details in Skills & gaps).
- **Sources of the profile:**
  - **Upload CV** (PDF).
  - **Build by interview** (proposed, pending #155): for a user with no CV, the Profile interviewer (general mode) builds the profile from answers.
  - **Import from LinkedIn:** a short guide to LinkedIn's "Save to PDF" export, then upload. It is the only supported way to bring LinkedIn data in (see below).
  - **Link LinkedIn profile:** stores the public profile URL to show it and to open the right edit page later.
  - Each source shows when it was last imported.
- **Suggested changes** (F4): proposed headline, about and per-position bullets as diffs (removed/added, not color alone). Each says which target it is written for and has Approve/Reject. Approved text has **Copy** and **Open on LinkedIn** (the matching edit page), because the user applies it there.
  - Every suggestion has passed the runtime fidelity check, so it claims nothing the profile lacks.
  - When a bullet needs a fact the profile does not have (a metric, the scope), the suggestion asks for it inline ("How many users did this serve?") instead of inventing one; the answer is a profile change to approve (Profile interviewer, draft mode).
- **Demo interaction:**
  - upload, import and link controls render but do not process files;
  - Approve/Reject in Suggested changes is local state only.
- **Full feature adds:**
  - extraction progress;
  - editing and correcting the extracted profile;
  - approving candidate skills;
  - a ready-to-send CV per active target, exported to PDF and DOCX from one ATS-friendly template (F4).
- **States:**
  - empty: no profile yet, so the upload step is the whole page (plus the Profile interviewer as the no-CV path, pending #155);
  - extraction failed: retry, or enter the profile manually.
- **Data:** `getProfile()` → `Profile`, new in `packages/contracts/src/profile.ts`, from ADR 0004 (`ProfileSkill`, `Evidence`). Suggested changes use `DraftChange` in `@rumbo/contracts/provisional` until the F4 spec.

### Why rumbo cannot write to LinkedIn

- LinkedIn's Profile Edit API is restricted to developers LinkedIn approves, and its write permission is private.
- Standard "Sign in with LinkedIn" only reads basic identity (name, photo, email).
- `mvp-scope.md` already rules out automation on linkedin.com (User Agreement 8.2).
- So rumbo drafts and the user applies: suggested text with Copy and a deep link to the right edit page. That is also what AI rule 2 asks for.
- Revisit only if LinkedIn grants partner access. Reading identity through LinkedIn sign-in is an auth decision for ADR 0003.

## Skills & gaps — F1 (#41), F2 (#42), F3 (#43)

- **For:** see what the user has, what is missing for their targets, and the market evidence that justifies each gap.
- **How gaps are inferred**, shown on the page in one sentence: for each active target, rumbo reads a market snapshot of real postings for that role family and region. The skills those postings ask for that the profile lacks evidence for become gaps. Gaps needed by several targets rank higher.
- **Filter:** every target by default; picking one (`?target=`, which the Roadmap summary band links to) narrows the market, the gaps and the skills to that target.
- **Layout:** market across the top (every target's snapshot side by side, or one target's across the full width), then gaps beside the skills the user has, with "on this page" links so the skills stay reachable when the gaps run long.
- **Shows:**
  - **Market per target:** the snapshot (role family, region, date, posting count) and the top requested skills as a ranked bar list with percentages, readable without the bars, and a line saying each percentage is the share of the target's postings that ask for the skill. Each skill is marked _you have it_ (with evidence count) or _gap_.
  - **Gaps** in priority order, each with:
    - the skill and its status;
    - per target, "asked in 64% of 140 Data Analyst postings";
    - "shared by N targets";
    - the model's rationale, styled as opinion and linked to the numbers;
    - the roadmap items that close it, linking to their station on Roadmap.
  - **Skills you have:** each with its evidence (source type, excerpt) and how often the market asks for it.
- **Full feature adds:**
  - live snapshots and refresh;
  - evidence strength weighting;
  - candidate skill review;
  - recalculation history.
- **States:**
  - empty: no targets or no snapshot yet;
  - stale snapshot: a hint to refresh;
  - no gaps: "Your evidence covers what these postings ask for".
- **Data:**
  - `getRoadmap()` for gaps and the items that close them;
  - `getProfile()` for skills and evidence;
  - `getMarket()` → `MarketSnapshotView[]` (provisional until the F2 spec).
  - Each `Gap` carries its demand per target (see spec 01).

## Projects — F3 (#43), F5 (#45)

- **For:** follow the practice projects in the roadmap and what proves their progress.
- **Shows:**
  - one card per project item: title, the gaps it closes and their targets, `doneWhen`;
  - repo, last activity, tasks with done state;
  - **evidence awaiting approval** (e.g. a commit the tracking agent matched to a task), with Approve/Reject;
  - a completed section with approved evidence.
- **Badges:** open-task count, plus an attention badge for evidence awaiting approval.
- **Demo interaction:** Approve/Reject is local state only.
- **Full feature adds:**
  - GitHub App push analysis;
  - linking a repo;
  - weekly recalculation summary;
  - application log (until the jobs inbox, #57, has its own place).
- **States:** empty: no project items in the roadmap; repo not linked: a hint.
- **Data:** `getRoadmap()` (project items, tasks, evidence) and `getProgress()` for activity (provisional until the F5 spec). Evidence reuses `EvidenceRef`.

## Sources — F1 (#41), F2 (#42)

- **For:** transparency about every input rumbo uses.
- **Shows:**
  - **Market sources:**
    - Greenhouse, Lever, Remotive and web search;
    - for each one: when it was checked, postings found per target and links to the individual postings.
  - **Profile sources:** CV and LinkedIn export files with import date, plus the linked LinkedIn URL.
  - A short note on what is data and what is model output.
- **Full feature adds:**
  - per-source errors and retry;
  - removing a source's data;
  - source adapters for other fields.
- **States:** empty means nothing imported or searched yet.
- **Data:** `getSources()` → `SourceView[]`, provisional until the F2 spec. Profile sources come from `Profile`.

## Later, not a tab yet

**Jobs inbox and assisted apply** (#57): ranked postings the user can apply to now. It gets a tab when its spec is written. Until then it does not appear, not even as Planned, so the demo does not promise it.
