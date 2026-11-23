import { createHash } from 'node:crypto';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'gh_src',
  'lever-source',
  'ashby_jid',
  'fbclid',
  'gclid',
  'trk',
  'tracking',
]);

/**
 * Normalizes a URL by stripping tracking parameters, normalizing host and path.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = ''; // Drop fragments

    // Strip tracking query parameters
    const searchParams = new URLSearchParams(parsed.search);
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        searchParams.delete(key);
      }
    }
    // Sort parameters alphabetically
    searchParams.sort();
    parsed.search = searchParams.toString();

    let clean = parsed.toString();
    // Strip trailing slash if present on path
    if (clean.endsWith('/') && parsed.pathname !== '/') {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Calculates SHA-256 hash of normalized canonical URL.
 */
export function hashCanonicalUrl(url: string): string {
  const normalized = normalizeCanonicalUrl(url);
  return createHash('sha256').update(normalized).digest('hex');
}
