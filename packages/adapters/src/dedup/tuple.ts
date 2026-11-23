import { createHash } from 'node:crypto';

/**
 * Normalizes company name by stripping legal suffixes and punctuation.
 */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|gmbh|co|technologies|solutions)\b/gi, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes job title.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes location string.
 */
export function normalizeLocation(loc?: string): string {
  if (!loc) return 'unknown';
  const l = loc.toLowerCase().trim();
  if (l.includes('remote') || l.includes('anywhere') || l.includes('دورکاری')) {
    return 'remote';
  }
  return l.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generates normalized tuple hash: company|title|location.
 */
export function hashJobTuple(company: string, title: string, location?: string): string {
  const normCompany = normalizeCompany(company);
  const normTitle = normalizeTitle(title);
  const normLoc = normalizeLocation(location);

  const raw = `${normCompany}|${normTitle}|${normLoc}`;
  return createHash('sha256').update(raw).digest('hex');
}
