import { z } from 'zod';

/** Machine-readable error codes; clients branch on these, never on the message (#23). */
export const ErrorCode = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'INTERNAL',
  'SERVICE_UNAVAILABLE',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** Body of every error response from the API (#23). */
export const ErrorEnvelope = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.unknown().optional(),
    /**
     * Same value as the `x-request-id` response header; quote it when reporting a problem. A guid,
     * not a uuid: the API keeps any canonical 8-4-4-4-12 hex id a caller sends (#26).
     */
    requestId: z.guid(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/** Zod 4 issue codes the API can report; a Zod upgrade that renames one fails the contract (#24). */
export const ValidationIssueCode = z.enum([
  'invalid_type',
  'too_big',
  'too_small',
  'invalid_format',
  'not_multiple_of',
  'unrecognized_keys',
  'invalid_union',
  'invalid_key',
  'invalid_element',
  'invalid_value',
  'custom',
]);
export type ValidationIssueCode = z.infer<typeof ValidationIssueCode>;

/**
 * One field that failed request validation. Only values taken from the schema, never the input or
 * the issue message, which can embed the input (ADR 0006, #24). Clients build the text from `code`,
 * `origin` and the bounds: date bounds are epoch milliseconds, bigint bounds arrive as strings.
 */
export const ValidationIssue = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: ValidationIssueCode,
  /** Kind of value the bound applies to: string, number, date, array… */
  origin: z.string().optional(),
  expected: z.string().optional(),
  format: z.string().optional(),
  minimum: z.union([z.number(), z.string()]).optional(),
  maximum: z.union([z.number(), z.string()]).optional(),
  inclusive: z.boolean().optional(),
  /** For issues inside a union: which option failed this way. */
  branch: z.int().nonnegative().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssue>;

/** `details` of a `BAD_REQUEST` error caused by request validation (#24). */
export const ValidationDetails = z.object({ issues: z.array(ValidationIssue) });
export type ValidationDetails = z.infer<typeof ValidationDetails>;
