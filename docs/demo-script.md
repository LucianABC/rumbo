# Roadmap demo — walkthrough script

A 10–12 minute screen-shared walkthrough of the roadmap demo ([spec 01](specs/01-roadmap-demo.md)). It shows the product idea first, then the front-end craft: layout, type, motion, tokens, accessibility and performance. Timings are a guide; the whole script fits in 11 minutes with room for one question.

## Before you start

- Run `docker compose up --build --wait` and open http://localhost:3000.
- Use the fictional user: move any `.local/mocks/` folder aside (or point `LOCAL_MOCKS_DIR` at an empty folder) and restart the `web` container. The page header should read "Toward Data Analyst" and the summary band "Alex Rivera".
- Browser at about 1440 px wide, light mode, zoom 100%. Have a second window at phone width (or DevTools device mode at 375 px) ready for step 6.
- Reload before you start: approvals and profile edits live in memory, so a reload resets the demo.

## 1. What rumbo is (1 min) — Roadmap, top of the page

**Show:** the page as it loads; let the lines draw in.

**Say:**

- rumbo supports a job search end to end: it reads your profile, surveys real postings for the roles you aim at, finds the gaps with evidence, and turns them into a plan where every gap has a verifiable way to close it.
- This is a front-end slice built before the API: every screen reads contract-typed mock data through one data layer, so real data later replaces that layer and nothing else.
- The user is fictional: Alex, a customer support specialist aiming at three targets.

## 2. Summary band (1.5 min)

**Show:** "Where you start" on the left, "Your targets" on the right.

**Say:**

- Left: where Alex starts, years of relevant experience and the strongest skills, each with its evidence count. Relevant experience is derived from evidence for the skills the targets ask for, not tagged by hand.
- Right: the three targets, primary first. Each meter is coverage: "3/5 top skills" means Alex has evidence for 3 of the 5 skills most Data Analyst postings ask for. "1 shared" means a gap another target also needs.
- A target keeps the same color on every tab, and color is never the only cue: the name always goes with it.

**Do:** hover a coverage figure to show which targets share it. Click **Change targets**.

**Say:** changing targets is a later feature, so this is an explainer with a sample preview: what would happen if Alex dropped Support Operations Lead. Nothing changes without a preview the user confirms. Close it with Esc.

## 3. The subway map (2.5 min)

**Show:** the map.

**Say:**

- Every line leaves from the starting point, Alex's current role, and ends at a target. Stations are objectives in plan order.
- A station that several lines pass through is an interchange: it advances more than one target at once, which is why shared gaps rank higher in the plan.
- Interchanges, routes and "you are here" are derived by code from the plan. The only hand-authored part is the geometry: grid positions with horizontal, vertical or 45° segments. Each line keeps one lane for its whole route, primary on top, so shared stretches run side by side.

**Do:** hover the Business Analyst line, then the "Map a real process" station: the others dim. Click the Data Analyst terminal (or the Data Analyst chip in the switcher under the map).

**Say:** one line at a time. The choice lives in the URL (`?line=data-analyst`), so it survives a reload and can be shared. The list below shows that line's stations, and the map dims the others.

## 4. Stations and the panel (1.5 min)

**Do:** Tab into the station list, move with ↑/↓, Home and End. Press Enter on "Own the weekly support report".

**Say:**

- The map is an `aria-hidden` drawing over this list. Keyboard and screen-reader users get the same plan, with roving tabindex and accessible names like "Own the weekly support report, in progress, serves Data Analyst, Business Analyst and Support Operations Lead, you are here".
- The panel shows the deliverable: a work experience at Alex's current job, with a verifiable "Done when", the gaps it closes and its dates.
- It is a dialog: focus is trapped, Esc closes it and focus returns to the station.

**Do:** Esc. Open "Build a public dashboard" and point at "See project".

## 5. Projects and human approval (1.5 min)

**Do:** follow "See project" to Projects (or click the Projects tab; note its attention badge).

**Say:**

- A project is its repo. Each card shows the station it serves, its lines, the gaps it closes, the tasks and the evidence.
- Commit `a3f9c21` was matched to a task by the future tracking agent, so it waits as "awaiting approval": nothing an agent proposes changes the user's data without approval.

**Do:** Approve it.

**Say:** the task is done, the deliverable goes to 2 of 3, and the badge on the tab is gone. Every tab reads one store and one progress rule, so the same decision shows on Roadmap too.

**Do:** click the card's station, "Build a public dashboard": it opens that station's panel on Roadmap, with tasks at 2/3 and both commits approved.

## 6. Skills & gaps (1 min)

**Do:** open Skills & gaps.

**Say:**

- For each target, the market across the top: the skills real postings ask for, as a share of that target's postings, marked "You have it" with evidence, or "Gap".
- Each gap shows its numbers ("72% of 140 postings") apart from the model's rationale: facts and opinion look different, and the opinion links to the data behind it.
- Each gap links to the station that closes it.

## 7. Profile (1 min)

**Do:** open Profile, then the bell in the header.

**Say:**

- The profile reads like a CV, with its sources on top and a completeness bar computed by code.
- The bell holds suggested changes: proposed text as a diff with Approve/Reject. rumbo drafts; the user applies it on LinkedIn, because LinkedIn's write API is closed to apps like this.
- Edit profile works in place, with old and new side by side for every changed field. One sub-tab per target holds a CV tailored to it.

## 8. Craft details (1 min)

**Do:** switch to the phone-width window and open Roadmap.

**Say:**

- Phones get the single-line list and a bottom tab bar; the panel becomes a bottom sheet. Nothing scrolls sideways from 360 px.
- The look is "Field notes": paper tones, three line colors measured at ≥ 3:1 and text at ≥ 4.5:1 in light and dark, by a test that reads the tokens. Dark mode follows the system.
- Under `prefers-reduced-motion` every animation is cut, including the line draw-in and the "you are here" pulse.
- Lighthouse on the production build: 100 for performance and accessibility on desktop, 93 and 100 on mobile; Playwright runs axe on Roadmap, Profile and Skills & gaps.

## 9. Close (30 s)

**Say:**

- Sources and Jobs show their Planned state: where the market data and the jobs inbox will live.
- Next is the market radar: real postings from public sources, the first model calls through a router with evals and a visible cost per run.
- Questions.

## If something goes wrong

- **The map does not show:** the window is under 1024 px; widen it, or present the single-line list instead.
- **A decision is stuck from a rehearsal:** reload the page.
- **The data is not Alex Rivera:** the container is reading `.local/mocks/`; see "Before you start".
