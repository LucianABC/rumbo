/**
 * Liveness of the web app itself. Lives under /demo because /api/* is proxied to the NestJS API
 * (ADR 0002); spec 01 keeps it as a temporary exception for the local demo.
 */
export function GET(): Response {
  return Response.json({ status: 'ok' });
}
