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
