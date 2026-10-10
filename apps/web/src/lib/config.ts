/**
 * Base URL of the API as seen from the web server (e.g. http://api:3001 inside Docker Compose).
 * Read per request, not at build time, so one image runs in every environment.
 * Replaced by Zod-validated config together with the API's (#21).
 */
export function getApiInternalUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): URL {
  const raw = env.API_INTERNAL_URL;
  if (!raw) {
    throw new Error('Missing required environment variable API_INTERNAL_URL');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid API_INTERNAL_URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid API_INTERNAL_URL: ${raw}`);
  }
  return url;
}
