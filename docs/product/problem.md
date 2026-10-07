# Problem

## The problem

A senior developer who wants to move into a new kind of role (here: customer-facing AI roles) has no reliable way to answer three questions:

1. **What does the market actually ask for?** Job descriptions are noisy, inconsistent and spread across many boards. Reading twenty of them gives an impression, not data.
2. **How far am I from it, with evidence?** Self-assessment is biased in both directions. A CV lists skills; it rarely says where and how each one was used, so it is hard to tell a real gap from a skill that is simply not written down.
3. **What exactly should I do next, and am I making progress?** Generic advice ("learn RAG", "build a portfolio") is not a plan. Learning without a concrete project produces nothing a recruiter can see, and progress is invisible unless someone tracks it.

Existing tools cover pieces: job boards (search), CV builders (wording), course platforms (learning), LinkedIn (presence). None closes the loop from _market_ → _gaps_ → _projects_ → _visible evidence_ → _updated profile_.

## For whom (MVP persona)

**A senior developer in Buenos Aires (the author)** — the first and only real user of the MVP.

- 8+ years building web products; strong in TypeScript, frontend and APIs.
- Wants a role such as AI Engineer, AI Solutions Engineer, Forward Deployed Engineer or AI Solutions Architect, remote or hybrid, for companies hiring from LATAM.
- Has limited weekly time (evenings, weekends) and wants every hour to produce visible evidence.
- Distrusts tools that rewrite their profile without asking.

The app is multi-user and secure from day one, and has a demo user with sample data so an evaluator can explore it without registering — but product decisions are made for this persona.

## The journey (one path, end to end)

1. **Upload** the LinkedIn PDF export (or a CV). rumbo extracts a structured profile: experiences, skills and, per skill, the evidence of where and how it was used. The user reviews and corrects it.
2. **Survey the market** for the chosen role families and region. rumbo collects real postings from public sources, normalizes their requirements and builds a snapshot with frequencies per role family.
3. **See the gaps**: profile vs. market, prioritized and justified ("asked in 62% of AI Solutions Engineer postings; no evidence in your profile").
4. **Get a target and a roadmap**: a proposed role, seniority and work mode (editable), plus milestones with concrete ways to close each gap: a practice project, a new work experience or education (course, workshop, degree). No loose learning: every gap has at least one, and it only counts as closed with verifiable proof.
5. **Approve profile changes**: proposed headline, summary and bullets shown as a diff; each change is approved or rejected individually. Export the approved CV.
6. **Follow the roadmap weekly**: assign a repo to each project; every push is analyzed and tasks are completed with the commit as evidence (or flagged for review). Gaps and progress are recalculated weekly; applications are logged.

## Success for the MVP

- The persona uses it weekly for a month and the roadmap reflects real work without manual bookkeeping.
- Every gap shown can be traced to postings (market side) and to evidence or its absence (profile side).
- Every model call has a recorded model, token count and cost; every run stays within budget.
- An evaluator can open the live URL, enter as the demo user and understand the product in five minutes.
