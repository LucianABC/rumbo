/**
 * Security headers for the pages the web app serves (#22). /api/* is left out: those responses come
 * from the API through the proxy and already carry the API's headers.
 *
 * The CSP holds only directives that need no per-request nonce. Restricting scripts would need
 * nonces for Next's inline hydration scripts, which is its own change.
 */
export const SECURITY_HEADERS = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  // includeSubDomains is decided with the domain at the Production launch (ADR 0002).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
] as const;

/** Every path except /api/* (path-to-regexp syntax used by next.config `headers`). */
export const PAGES_SOURCE = '/((?!api/).*)';
