# ADR 0001 — Agent orchestration

- **Status:** Accepted (2026-10-07)
- **Date:** 2026-10-07

## Context

rumbo runs six kinds of agent work (profile, market, gaps, roadmap, drafting, tracking) inside a pg-boss worker. The things the project must demonstrate are exactly the things an orchestration layer tends to own: **per-call model routing** from a config table, **cascade escalation** when output fails Zod validation, **per-run budget** with a hard cut, **cost/token ledger per call**, **one trace per run**, and **tests that never hit the real API** (recorded fixtures).

Current API facts that shape the choice (verified 2026-10-07):

- Routing targets: `claude-haiku-4-5-20251001` ($1/$5 per MTok, 200K ctx), `claude-sonnet-5-5` ($2/$10, 1M), `claude-opus-5-5` ($4/$20, 1M).
- The models differ in request shape: Haiku 4.5 uses `thinking.budget_tokens` and has no `effort`; Sonnet 5.5 / Opus 5.5 use adaptive thinking + `output_config.effort` (Opus 5.5 defaults to `medium`), reject forced `tool_choice` (`any`/`tool`), and get structured output via `output_config.format`. The router must therefore hold a **per-model capability profile**, not just an ID.
- Prompt caches are model-scoped, so every escalation pays for a cold cache.

## Options

|                               | A. Own loop on `@anthropic-ai/sdk`                             | B. Claude Agent SDK                                                                                                          | C. Mastra                                                                                |
| ----------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| What it is                    | Thin orchestrator + manual tool loop we write (~200–300 lines) | Claude Code packaged as a library: built-in Read/Write/Bash/Grep/Web tools, subagents, hooks, sessions                       | TS agent framework: provider-agnostic agents, workflows, memory, evals, tracing          |
| Per-call routing & escalation | Native: every call goes through `router.call(task, req)`       | Subagent model is an alias (`haiku`/`sonnet`/`opus`/`inherit`); per-call escalation on Zod failure is not a first-class hook | Possible via model config per agent/step; escalation is custom code around the framework |
| Own tools                     | Zod-defined tools, our executor                                | In-process custom tools and MCP; built-in filesystem/bash tools are surface we don't want next to untrusted content          | Good tool API                                                                            |
| In a queue worker             | Plain async function                                           | Designed around a long-lived agent session with a workspace; heavier per run                                                 | Fine, but its workflow engine/storage overlaps with pg-boss + our `Run` table            |
| Testability                   | Inject the client; replay recorded responses by request hash   | Harder to record/replay at the message level                                                                                 | Medium; extra abstraction between our tests and the wire                                 |
| Portfolio signal              | High: routing, budget, ledger are visible code                 | Shows "used the SDK", hides the decisions                                                                                    | Shows framework fluency; routing becomes framework config                                |
| Lock-in / churn               | Only the Anthropic SDK                                         | Tied to Claude Code harness evolution                                                                                        | Fast-moving framework, multi-provider abstraction we don't need                          |

## Decision

**Option A: own orchestrator and tool loop on `@anthropic-ai/sdk`.**

1. **Orchestrator is deterministic code, not an LLM.** Each run type (`profile.import`, `market.snapshot`, `gaps.analyze`, `roadmap.build`, `drafts.propose`, `push.analyze`) is a typed sequence of steps with persisted state, so steps are resumable and budget is enforced across them. **This departs from the brief**, which routes "orchestration" to Sonnet: our flows are known in advance, and an LLM choosing the next subagent would add cost, latency and non-determinism without adding capability. An LLM planner can be added later for open-ended requests if a real one appears.
2. **Subagents** are `AgentDefinition`s in `packages/agents` (versioned prompt, Zod tools, output schema, routing task key). They run a manual tool loop; tool execution is ours, and write tools are never exposed to agents that read untrusted content.
3. **Every model call** goes through `packages/router`: resolve route → apply model capability profile → call → validate with Zod → on failure retry once with the validation error → then escalate along the route's cascade → record `LlmCall` (model, tokens in/out, cache tokens, cost, run id, prompt version) → check run budget → emit OTel span.
4. **Routing table** is a versioned, Zod-validated config file in `packages/router`, not a DB table: a routing change is a PR, which triggers evals (AI rule 6). Swapping in telco-router results is a config change.
5. Manual loop rather than the SDK's beta Tool Runner, because we need budget/routing checks between turns; revisit if Tool Runner hooks cover that.
6. Refusal handling: check `stop_reason` before reading content; enable the server-side `fallbacks` parameter on Sonnet 5.5 / Opus 5.5 routes.

## Trade-offs

- We own ~300 lines of loop and retry code and its bugs. Mitigated by keeping it small and heavily unit-tested with fixtures.
- No built-in memory, UI or eval dashboards; Langfuse covers traces, `evals/` covers evals.
- If a future feature needs a coding agent with a sandbox (e.g., running a user's repo tests), the Claude Agent SDK becomes the right tool **for that feature only**; this ADR does not prevent it.
- Cascades forfeit cache reuse across models. Evals must also compare "stronger model at lower effort" vs. "cheap model + escalation" before the cascade is kept for a route.
