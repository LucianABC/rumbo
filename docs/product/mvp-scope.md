# MVP scope

Each feature is a vertical slice (backend, frontend, tests). Until the Production launch (gated by auth, ADR 0003) "done" means merged and passing in the prod-like local environment; afterwards it means deployed to production. Slices are built in order F1 → F5, after the local walking skeleton, the API skeleton and ownership.

## In

| #   | Feature                          | Smallest version that counts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | **Profile**                      | Upload LinkedIn PDF or CV → structured profile (experiences, skills, evidence per skill) → review/correct screen.                                                                                                                                                                                                                                                                                                                                                                                                  |
| F2  | **Market**                       | Search postings by role family and region from Greenhouse Job Board API, Lever Postings API, Remotive and Anthropic web search; normalized requirements per posting; snapshot with frequencies per role family; semantic search over saved postings.                                                                                                                                                                                                                                                               |
| F3  | **Gaps, target and roadmap**     | Prioritized, justified gaps; editable target (role, seniority, work mode); roadmap with milestones and items of three types — practice project, new work experience, education (course, workshop, degree, certification); **hard rule validated in code: every gap has at least one roadmap item, and an item is done only with verifiable evidence** (commit, certificate, new experience); graphical path view (horizontal on desktop, vertical on mobile) with progress % and last-activity date per milestone. |
| F4  | **Drafting with human approval** | Proposed headline, summary and per-position bullets for LinkedIn and CV, shown as a diff; per-change approve/reject; export approved CV to PDF and DOCX.                                                                                                                                                                                                                                                                                                                                                           |
| F5  | **Tracking and GitHub**          | Roadmap checklist with change dates; repo and last commit per project; push-analysis agent (webhook → queue → cheap filter → stronger decision against "done when" criteria → auto-complete with evidence or "needs review"); application log; weekly recalculation.                                                                                                                                                                                                                                               |

Role families for the MVP: AI Engineer, AI Solutions Engineer, Forward Deployed Engineer, AI Solutions Architect, Frontend with AI.

Cross-cutting work (orchestrator, model routing, observability, evals, auth, privacy) grows inside every slice — see [cross-cutting.md](cross-cutting.md).

## Out — epic "Later" (not broken down into tasks)

- Billing and a public SaaS offering.
- Automatic applications to postings.
- Any integration that requires scraping. **LinkedIn is never scraped.**
- LinkedIn API integration (writing to the profile directly).
- Email notifications.
- Native mobile app (the web app is responsive).
- Interview coach.
- Multi-language UI (the UI ships in one language).

## Explicit non-goals and constraints

- **No silent writes.** Nothing that visibly changes user data (profile, LinkedIn/CV text, doubtful task completions) is applied without the user's approval.
- **Sources must allow the use.** Each job source's terms are checked before integration and recorded in its slice spec. If a source's terms forbid storage or reuse, it is dropped, not worked around.
- **One real user.** Scale targets are "works for a handful of users with a sensible monthly bill", not high traffic. Multi-user correctness (ownership on every row and endpoint) is still mandatory.
- **Cost is a feature.** Every run has a budget and is cut when it exceeds it.

## Open scope questions (to settle in each slice spec)

- F1: do we also accept DOCX CVs, or only PDF? (Default: PDF only.)
- F2: how fresh must a snapshot be? (Default: manual refresh, plus weekly job.)
- F4: CV template — one fixed ATS-friendly template for the MVP.
- F5: which branches trigger analysis? (Default: default branch only.)
