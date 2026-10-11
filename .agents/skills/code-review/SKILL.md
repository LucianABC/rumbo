---
name: code-review
description: Review changes in the Rumbo repository in chat for code quality, issue acceptance criteria, and documented product and architecture decisions. Use when asked for a code review; do not publish the review to GitHub.
---

# Rumbo code review

Review the requested change and report findings in this chat in Rioplatense Spanish. This is a read-only review: do not edit code, create a GitHub review or comment, or change issue state unless the user separately asks.

## Establish the review scope

Use the range, files, or issue the user names. If none is named, review the current working-tree changes against `HEAD`, including untracked files. State the scope used. Identify the related issue from the request, branch, commits, or change references; read its acceptance criteria when accessible. If no issue can be identified or read, say which criteria could not be verified. Do not invent them.

## Check the change

- Read the changed code and enough surrounding code to assess behavior. Prioritize correctness, regressions, security/privacy, and missing tests; also review project standards, naming, structure, and legibility. Apply the conventions in `CLAUDE.md` and the relevant package configuration.
- Compare each applicable issue acceptance criterion with implementation and test evidence. Distinguish verified, unmet, and unverified criteria. If the issue describes work beyond the reviewed scope, say so.
- Read the relevant `docs/specs/`, `docs/product/`, `docs/adr/`, and `docs/backlog.md` material. Check whether the change follows established decisions and approved scope. Cite the specific document and section when reporting a conflict. Treat a proposed or superseded decision according to its stated status.
- Run focused checks only when they materially clarify a finding. Report what ran and what could not run; do not treat passing checks as proof of all acceptance criteria.

## Reply format

Put actionable findings first, ordered by severity. For each, give the file and line, the concrete problem, its impact, and the relevant criterion or documented decision where applicable. Do not manufacture findings to fill a list. Then provide a compact acceptance-criteria and documentation status, any important verification gaps, and a short plain-language summary of the changes being reviewed for a non-technical reader. Describe what the change actually does; do not imply that the reviewer applied it.
