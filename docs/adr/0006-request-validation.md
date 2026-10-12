# ADR 0006 — Request validation and OpenAPI on NestJS 12

- **Status:** Accepted (2026-10-12)
- **Date:** 2026-10-12

## Context

Every endpoint validates its input against a Zod schema from `packages/contracts` (#24) and the API publishes OpenAPI docs generated from those same schemas (#25). `nestjs-zod` does both, and `docs/product/cross-cutting.md` already names it. Its latest release (5.5.0) declares `@nestjs/common ^10 || ^11`, and the API runs NestJS 12. Two upstream PRs add Nest 12 support (BenLorantfy/nestjs-zod#472, #478); neither has a maintainer response yet (#77).

**Spike** (Nest 12.1.2, `@nestjs/swagger` 12.0.2, `nestjs-zod` 5.5.0, Zod 4.6.5), all working:

- Global `ZodValidationPipe` with a `createZodDto` body: a valid body passes, and keys missing from the schema are stripped.
- Invalid body → 400 with one issue per field (`path`, `code`, `message`). Zod 4 issues leave out the input value unless asked to.
- `SwaggerModule.createDocument` + `cleanupOpenApiDoc` emits the DTO schema (`minLength`, `format: email`, `required`).
- pnpm treats the peer range mismatch as a warning (`strict-peer-dependencies` is off).

## Options

1. **Use `nestjs-zod` 5.5 now** and allow its Nest 12 peer explicitly. No custom code; relies on a library that does not promise support for our Nest version.
2. **Wait for an upstream release.** No date; blocks #24, #25 and #27.
3. **Own `ZodValidationPipe` + OpenAPI generation.** The pipe is ~20 lines. OpenAPI is the expensive part: either reimplement `createZodDto`'s metadata for `@nestjs/swagger`, or build the document from a separate route registry (`zod-openapi`), declaring every route twice.

## Decision

**Option 1, `nestjs-zod` 5.5**, with these rules:

- `pnpm-workspace.yaml` allows the mismatch with `peerDependencyRules.allowedVersions` scoped to `nestjs-zod` only, with a comment pointing to #89, which removes it when `nestjs-zod` ships Nest 12 support.
- The e2e tests of #24 (validation) and #25 (`/api/docs`) are the canary: a Nest or `nestjs-zod` update that breaks them fails CI.
- The global error filter (#23) maps `nestjs-zod`'s validation exception to `ApiException('BAD_REQUEST', …, details)`. `details` carries only `path`, `code` and `message` per issue, so neither the user's input nor library internals such as regex patterns reach the client.
- DTOs are built from schemas in `packages/contracts` (`createZodDto(Schema)`), never from schemas defined inside `apps/api`, so web and API share one source.

## Trade-offs

- Running outside the declared peer range: a future Nest minor could break `nestjs-zod` silently at runtime. The e2e tests reduce that to a CI failure.
- If upstream stays stalled and something breaks, validation moves to option 3 quickly; OpenAPI is the part that costs time.
