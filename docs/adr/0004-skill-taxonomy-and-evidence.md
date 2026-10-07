# ADR 0004 — Skill taxonomy and evidence model

- **Status:** Proposed
- **Date:** 2026-10-07

## Context

The core computation of rumbo is a join: **market requirements (F2) vs. profile skills with evidence (F1)** → gaps (F3) → projects that practice each gap (F3) → evidence produced by commits (F5) → updated profile. If profile skills and posting requirements use different vocabularies ("LLM orchestration" vs. "agentic workflows" vs. "LangGraph"), every downstream feature gets fuzzy. This is the most expensive data decision to reverse: it shapes five features, the evals and the embeddings.

## Options

1. **Free text everywhere, match at comparison time** (LLM or embeddings decide if two skills are the same on each run). Flexible, but non-deterministic gaps, expensive comparisons, and impossible to aggregate frequencies reliably.
2. **JSONB documents** per profile and per posting. Fast to start; no referential integrity, hard to query "postings that ask for X", and the F3 hard rule (every gap has a project) cannot be enforced by the database.
3. **Canonical skill catalog + relational links + raw extraction kept as JSONB for audit.**

## Decision

**Option 3.**

```
Skill            id, slug, name, category, aliases[], embedding(vector), status(canonical|candidate)
ProfileSkill     id, userId, skillId, selfLevel?, assessedLevel?
Evidence         id, userId, profileSkillId, sourceType(experience|project|commit|certification|manual),
                 sourceRef, excerpt, occurredAt?, confidence, createdBy(agent|user)
JobPosting       id, source, sourceId, url, company, title, roleFamily, region, postedAt, raw(jsonb), embedding
Requirement      id, postingId, skillId, importance(must|nice), rawText
MarketSnapshot   id, userId, roleFamily, region, createdAt + SnapshotSkillFreq(snapshotId, skillId, frequency)
Gap              id, userId, skillId, snapshotId, priority, rationale
Project          id, userId, milestoneId, ...  +  ProjectGap(projectId, gapId)   -- F3 hard rule lives here
```

- **Normalization:** extraction agents (Haiku route) output free-text skill mentions; a normalizer maps them to `Skill` by alias match → embedding nearest-neighbor above a threshold → otherwise creates a `candidate` skill. Candidates are reviewed (by the user for profile skills; by an admin/seed process for the catalog) before they count in frequencies.
- **Seed catalog** of ~150 skills for the five role families, versioned in the repo, so evals and tests are deterministic.
- **Evidence is one table for all sources.** A commit that completes a task in F5 creates `Evidence(sourceType=commit)`, which is how the weekly recalculation closes the gap. Same model, no special case.
- **F3 hard rule** ("every gap has at least one project") is enforced in the domain service that persists a roadmap, inside a transaction, with tests. Not a DB trigger: the rule needs a readable error for the agent's retry loop.
- Raw model outputs are kept (`raw` JSONB / `LlmCall` payload refs) for audit and eval building, never as the source of truth.

## Trade-offs

- A catalog needs curation; candidates can pile up. Mitigation: candidate review screen in F1, a weekly report of top candidates.
- Normalization errors propagate (a wrong mapping creates a false gap). Covered by an eval set for skill normalization in F2.
- More tables and migrations than a JSONB approach. Accepted: these are exactly the queries the product makes.
- Embedding model choice (Anthropic has no embeddings endpoint) is deferred to the F2 spec; the `vector` dimension is a migration away.
