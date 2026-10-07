# ADR 0004 — Skill taxonomy and evidence model

- **Status:** Accepted (2026-10-07, revision 3: role families as a catalog)
- **Date:** 2026-10-07

## Context

The core computation of rumbo is a join: **market requirements (F2) vs. profile skills with evidence (F1)** → gaps (F3) → roadmap items that close each gap (F3) → evidence produced when they are completed (F3–F5) → updated profile. If profile skills and posting requirements use different vocabularies ("LLM orchestration" vs. "agentic workflows" vs. "LangGraph"), every downstream feature gets fuzzy. This is the most expensive data decision to reverse: it shapes five features, the evals and the embeddings.

A gap can be closed in more than one way. The owner's rule: **no loose learning** — every gap must be tied to at least one way of acquiring the skill that leaves **verifiable proof**: a practice project, a new work experience, or education (course, workshop, degree, certification). Projects are not mandatory per gap.

## Options

1. **Free text everywhere, match at comparison time** (LLM or embeddings decide if two skills are the same on each run). Flexible, but non-deterministic gaps, expensive comparisons, and impossible to aggregate frequencies reliably.
2. **JSONB documents** per profile and per posting. Fast to start; no referential integrity, hard to query "postings that ask for X", and the F3 rule cannot be enforced reliably.
3. **Canonical skill catalog + relational links + raw extraction kept as JSONB for audit.**

## Decision

**Option 3.**

```
-- Global, shared by all users (public data, no userId)
Skill            id, slug, name, category, aliases[], embedding(vector)?, status(canonical|candidate)
RoleFamily       id, slug, name, field, description, aliases[], status(canonical|candidate)
JobPosting       id, source, sourceId, url, company, title, roleFamilyId, region, postedAt, raw(jsonb), embedding?
Requirement      id, postingId, skillId, importance(must|nice), rawText

-- Owned by a user (userId on every row, every query scoped)
ProfileSkill     id, userId, skillId, selfLevel?, assessedLevel?
Evidence         id, userId, profileSkillId, roadmapItemId?, sourceType(experience|project|commit|education|manual),
                 sourceRef, excerpt, occurredAt?, confidence, createdBy(agent|user), approvedAt?
MarketSnapshot   id, userId, roleFamilyId, region, createdAt  +  SnapshotSkillFreq(snapshotId, skillId, frequency)
Gap              id, userId, skillId, snapshotId, priority, rationale, status(open|in_progress|closed)
RoadmapItem      id, userId, milestoneId, type(project|work_experience|education), title, doneWhen, status
                   + ProjectDetail(itemId, repo?, tasks…)          -- type = project (F5 push analysis)
                   + EducationDetail(itemId, kind(course|workshop|degree|certification), provider, url?, expectedEnd?)
                   + WorkExperienceDetail(itemId, context, expectedEnd?)   -- e.g. "own the LLM feature at current job"
RoadmapItemGap   (roadmapItemId, gapId)                            -- the F3 rule lives here
```

- **Ownership boundary:** the catalog, postings and requirements are public, global data; everything derived from a user's profile, searches or plans carries `userId`. Postings are never duplicated per user.
- **Normalization:** extraction agents (Haiku route) output free-text skill mentions; a normalizer maps them to `Skill` by **alias match** → **LLM choice among catalog candidates** → (from F2, once embeddings exist) **embedding nearest-neighbor** above a threshold → otherwise a `candidate` skill. F1 does not depend on embeddings. Candidates are reviewed (by the user for profile skills; by a curation process for the catalog) before they count in frequencies.
- **Seed catalogs** versioned in the repo, so evals and tests are deterministic: a **role family catalog** spanning any field (`RoleFamily` with a `field` attribute; seeded tech-first for the MVP) and a **skill catalog** sized to those families. Neither is tied to the owner's own targets; evals cover several role families, not only the persona's.
- **Evidence is one table for all sources.** A commit that completes a project task (F5), a certificate for a finished course, or a new experience added to the profile all create `Evidence` linked to the roadmap item that produced it. The weekly recalculation reads it the same way; no special cases.
- **F3 rule (hard, in code):** every gap in a persisted roadmap has **at least one `RoadmapItem` of any type** that addresses it, and every item has a verifiable `doneWhen`. Enforced in the domain service that persists a roadmap, inside a transaction, with tests; it returns a readable error ("gap _Evals_ has no roadmap item") so the roadmap agent can retry. Not a DB trigger.
- **Closing a gap requires evidence**, not just ticking a box: a roadmap item becomes `done` only with an approved `Evidence` row (commit, certificate link/file, or new experience entry). Agent-created evidence needs user approval (AI rule 2).
- **Evidence strength depends on its source.** Gap scoring weighs evidence by `sourceType` (e.g., work experience and shipped projects count more than a short course). Weights are config, set in the F3 spec and tuned with evals.
- Raw model outputs are kept (`raw` JSONB / `LlmCall` payload refs) for audit and eval building, never as the source of truth.

## Trade-offs

- A catalog needs curation; candidates can pile up. Mitigation: candidate review screen in F1, a weekly report of top candidates.
- Normalization errors propagate (a wrong mapping creates a false gap). Covered by an eval set for skill normalization in F2.
- Three roadmap item types mean three detail shapes and three ways to verify completion; only projects get automatic verification (F5). Education and work experience are verified by the user attaching proof, so they rely on honesty more than commits do.
- Weighting evidence by source is a judgment call that can feel arbitrary; it is explicit, configurable and covered by evals instead of hidden in a prompt.
- More tables and migrations than a JSONB approach. Accepted: these are exactly the queries the product makes.
- Embedding model choice (Anthropic has no embeddings endpoint) is deferred to the F2 spec; the `vector` columns are nullable until then.
