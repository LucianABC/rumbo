# Agent catalog

Which steps of rumbo are agents (a model call behind `packages/router`) and which are plain code, per feature. ADR 0001 fixes how agents run: a deterministic orchestrator runs each run type as typed steps, and every call goes through the router (route, Zod-validated output, retry once with the error, then escalate, ledger, budget). This page fixes **which** agents exist. Each agent's detailed design (inputs, output schema, tools, budget, prompt version, evals) is #156; slice specs reference it instead of re-deciding it.

> **Status: design intent, nothing here is built yet.** The no-CV path (a profile built only from the Profile interviewer's answers, then a ready-to-send CV) is **proposed, pending #155**: this page assumes #155's option A (the no-CV interview in F1, the ready-to-send CV in F4). Until #155 is decided, read every mention of building a profile or a CV from scratch as proposed, not committed behavior.

**Names used across the product docs:** the agent is the **Profile interviewer**; its modes are **general**, **gap check** and **draft**. The Drafter's modes are **propose** and **tailor**; the Roadmap planner's are **build** and **revise**. The **Fidelity checker** is the agent; the **runtime fidelity check** is the step it runs.

## Agents

| Agent                   | Feature       | Run type                                            | Route          | Shape                                     | Untrusted input                                                  | Approval path                                                                                                                                                                     |
| ----------------------- | ------------- | --------------------------------------------------- | -------------- | ----------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document classifier     | F1            | `profile.import`                                    | Haiku          | single call                               | uploaded PDF text                                                | none: it only decides LinkedIn export, CV or neither; "neither" is an explicit upload error                                                                                       |
| Profile extractor       | F1            | `profile.import`                                    | Haiku          | single call                               | uploaded PDF text                                                | the user reviews and corrects the extracted profile before anything uses it (onboarding step 3)                                                                                   |
| Skill normalizer        | F1, F2, F5    | `profile.import`, `market.snapshot`, `push.analyze` | Haiku          | single call                               | free-text skill mentions taken from CVs, postings and evidence   | a skill it cannot map becomes a `candidate` (ADR 0004): profile candidates are approved by the user, catalog candidates by curation, and neither counts in frequencies until then |
| **Profile interviewer** | F1, F3, F4    | `profile.enrich`                                    | Sonnet         | short conversation, capped turns          | the user's answers; the profile, which came from an uploaded PDF | every answer becomes a proposed profile change or evidence, approved item by item                                                                                                 |
| Market scout            | F2            | `market.snapshot`, `matches.scan`                   | Haiku → Sonnet | read-only tool loop                       | postings and web search results                                  | none: it changes market data, not user data; role families it proposes enter the catalog as `candidate`                                                                           |
| Requirement extractor   | F2            | `market.snapshot`, `matches.scan`                   | Haiku          | single call, high volume                  | posting text                                                     | none: market data                                                                                                                                                                 |
| Path advisor            | F2b           | `targets.discover`                                  | Sonnet         | single call                               | the profile                                                      | suggestions only: the user picks one to three targets and the primary                                                                                                             |
| Gap analyst             | F3            | `gaps.analyze`                                      | Sonnet         | single call                               | the profile; normalized requirements                             | first build lands directly; any recalculation (targets changed, weekly) shows a preview the user confirms                                                                         |
| Roadmap planner         | F3, F5        | `roadmap.build`                                     | Opus           | single call + one retry on a domain error | the gaps and the profile                                         | same as the Gap analyst; revise mode never drops done items or approved evidence                                                                                                  |
| Drafter                 | F1, F4, apply | `profile.import`, `drafts.propose`, `apply.tailor`  | Sonnet         | single call                               | the profile; in tailor mode, the posting text                    | every proposed change is approved or rejected one by one; nothing is copied, exported or sent before that; review mode (proposed, #113) is labeled opinion and changes nothing    |
| Fidelity checker        | F1, F4, apply | `profile.import`, `drafts.propose`, `apply.tailor`  | Haiku          | judge                                     | the draft and the profile                                        | none of its own: a claim it rejects is regenerated or dropped before the user sees the draft, never shown as if it passed                                                         |
| Push triage             | F5            | `push.analyze`                                      | Haiku          | single call                               | commit messages and diff summaries                               | none: it only decides whether a push is worth judging                                                                                                                             |
| Progress judge          | F5            | `push.analyze`                                      | Sonnet         | read-only tool loop                       | diffs and repository files                                       | a clear match completes the task with the commit as evidence; a doubtful one is shown as "awaiting approval" (AI rule 2); what it finds beyond the plan is only ever a proposal   |

Every agent that reads untrusted content has no write tools, and its prompt says that content is data, not instructions (AI rule 1). The two tool loops only read: the Market scout searches postings (through `packages/mcp-jobs`) and the web; the Progress judge reads the repository through the GitHub App's read-only access.

### Modes

Two agents serve several slices with one design and one prompt family, switched by a mode input:

- **Profile interviewer.** It exists because a thin profile produces false gaps, and no extraction can recover what the CV never said.
  - **general** (F1): enrich the profile after extraction, or build it from scratch for a user with no CV (proposed, pending #155);
  - **gap check** (F3): between gaps and roadmap, ask only about the gaps, so a skill the user has but never wrote down is not planned as something to learn;
  - **draft** (F4): ask for the facts the Drafter flagged as missing (metrics, scope, impact) instead of inventing them.
- **Drafter.**
  - **review** (F1, proposed, #113): once the user confirms the extraction, read the profile back: a short subtitle, a summary, and feedback on what works and what to improve. It also checks that the sources agree with each other: when the CV and the LinkedIn export contradict each other (dates, titles, companies, claims), it flags each inconsistency for the user to fix. It never picks a winner: only the user knows which one is right. It is the same reading that drives propose, so a second agent would describe the same profile twice;
  - **propose** (F4): LinkedIn and CV text for the primary target or a blend, and one CV variant per active target;
  - **tailor** (assisted apply, #57): a CV, and an optional cover letter, for one posting, using the posting's terms only where they are true for the user;
  - in both modes it outputs the drafts plus a list of **missing facts**, which the Profile interviewer's draft mode asks about.
- **Roadmap planner** has a **revise** mode for target changes, the weekly recalculation and work found in a repo: it starts from the current roadmap and keeps done items and approved evidence.

### Reading a repo beyond the plan

The Progress judge does not only check the plan against the repo. It also looks for what the plan and the profile do not cover yet (owner, 2026-11-05, #45):

- **New skills:** a skill or tool the code uses that the profile lacks goes through the Skill normalizer and becomes a proposed profile skill, with the commit as its evidence.
- **New objectives:** work that fits no deliverable becomes a proposed task, deliverable or station. The Roadmap planner's revise mode places it, and the user confirms the preview.

Both are proposals: nothing reaches the profile or the roadmap until the user approves it (AI rule 2). A skill must show in the code that uses it: a commit message, a README or a dependency list is untrusted content and proves nothing on its own (AI rule 1). An approved skill then feeds the gaps like any other evidence, so it can close one.

Analysis runs on every push and on demand: **Check repo now** on a project runs `push.analyze` over the commits not analyzed yet, which covers work from before the repo was linked and pushes that never arrived. Analyzed commits are skipped, so it spends nothing when there is nothing new.

The Fidelity checker runs on every draft at runtime, not only in evals: it compares each claim against the approved profile and rejects achievements, metrics or technologies the profile does not have.

## Deliberately code, not agents

| Step                                              | Why it is code                                                                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source adapters (Greenhouse, Lever, Remotive)     | Public APIs with fixed shapes: fetching and paging need no judgment, and code keeps each source's terms enforceable.                                                                                     |
| Profile completeness                              | A fixed rubric over the profile. A percentage must mean the same thing every time, so a model never scores it; the Drafter reads it, and a suggested change's points are the rubric before and after it. |
| Snapshot frequencies, profile × requirements join | Counting and set logic. It must be exact and reproducible, so every gap traces to postings and evidence.                                                                                                 |
| F2b preferences questionnaire                     | A question bank with skip rules. Questions stay stable, comparable and cheap; the Path advisor only flags which questions the CV already answers.                                                        |
| Inbox matching and its reason text                | A threshold on covered must-haves ("7 of 9 must-have requirements; missing: Evals") is explainable and testable; a model would add cost per posting and drift.                                           |
| Weekly recalculation                              | A cron that re-runs existing agents (`gaps.analyze`, `roadmap.build` in revise mode). It is scheduling, not a new agent.                                                                                 |
| CV export                                         | A fixed ATS-friendly template rendered to PDF and DOCX. Layout must be deterministic, and the round-trip test (export, then re-read with the Profile extractor) needs it.                                |
| Roadmap rule checks                               | "Every gap has at least one item" and "done only with verifiable evidence" are validated in code; a violation is the domain error the Roadmap planner retries on.                                        |

## Shared prompt modules

rumbo uses no Anthropic Agent Skills: ADR 0001 chose an own loop with no sandbox, and in rumbo "skills" already means profile skills (ADR 0004). Rules several agents share become versioned prompt modules in `packages/agents`, composed into each agent's prompt and versioned with it:

- CV and ATS writing rules (one column, standard headings, real text, no tables or images);
- LinkedIn section limits (headline 220, about 2,600, experience description 2,000 characters), also validated in code;
- the untrusted-content preamble (AI rule 1).

## Run types

The full list is in ADR 0001, amendment 1. Runs that serve a conversation (`profile.enrich`) keep a turn cap and a budget for the whole conversation, like any other run.

## Open

- Whether a clear match can complete a task alone is open: see F5 in `mvp-scope.md`.
- **Analyze my progress** (Roadmap, #118) runs on mock output in the demo. Which agent produces it, and on which route, is decided when #121 leaves standby.
- Where building a CV from scratch lands is #155, still open. This catalog assumes its proposed option A (the no-CV interview in F1, the ready-to-send CV in F4); if #155 picks another option, this page, `mvp-scope.md` (F1, F4), `views.md` (onboarding step 2, Profile) and `problem.md` change with it.
