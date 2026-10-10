import { type NextRequest, NextResponse } from 'next/server';

import { getApiInternalUrl } from './lib/config';

/**
 * Forwards /api/* to the API so the browser only talks to the web origin and cookies stay
 * first-party (ADR 0002). Done here instead of `rewrites` in next.config, which are fixed at build
 * time: proxy reads API_INTERNAL_URL per request, so the same image works in every environment.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, getApiInternalUrl()));
}

export const config = {
  matcher: '/api/:path*',
};
