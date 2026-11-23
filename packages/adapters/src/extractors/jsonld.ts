import { load } from 'cheerio';
import { htmlToMarkdown } from './markdown.js';
import type { EmploymentType, RemoteType, SalaryRange } from '@kaarjoo/shared';

export interface ExtractedJobLd {
  title?: string;
  company?: string;
  location?: string;
  remoteType: RemoteType;
  employmentType?: EmploymentType;
  salary?: SalaryRange;
  postedAt?: string;
  expiresAt?: string;
  descriptionMarkdown?: string;
  rawJsonLd?: Record<string, unknown>;
}

/**
 * Normalizes employmentType from schema.org standard values.
 */
function normalizeEmploymentType(raw?: string | string[]): EmploymentType | undefined {
  if (!raw) return undefined;
  const val = Array.isArray(raw) ? raw[0] : raw;
  const s = val.toLowerCase();
  if (s.includes('full') || s.includes('full_time')) return 'full-time';
  if (s.includes('part') || s.includes('part_time')) return 'part-time';
  if (s.includes('contract') || s.includes('freelance')) return 'contract';
  if (s.includes('intern')) return 'internship';
  if (s.includes('temp')) return 'temporary';
  return undefined;
}

/**
 * Normalizes salary from schema.org baseSalary.
 */
function normalizeSalary(rawSalary: unknown): SalaryRange | undefined {
  if (!rawSalary || typeof rawSalary !== 'object') return undefined;
  const sal = rawSalary as Record<string, unknown>;

  const currency = typeof sal.currency === 'string' ? sal.currency : 'USD';
  let min: number | undefined;
  let max: number | undefined;
  let period: 'hour' | 'month' | 'year' = 'year';

  const valObj = sal.value && typeof sal.value === 'object' ? (sal.value as Record<string, unknown>) : sal;

  if (typeof valObj.minValue === 'number') min = valObj.minValue;
  else if (typeof valObj.minValue === 'string') min = parseFloat(valObj.minValue);

  if (typeof valObj.maxValue === 'number') max = valObj.maxValue;
  else if (typeof valObj.maxValue === 'string') max = parseFloat(valObj.maxValue);

  if (typeof valObj.value === 'number') {
    if (min === undefined) min = valObj.value;
    if (max === undefined) max = valObj.value;
  }

  const unitText = typeof valObj.unitText === 'string' ? valObj.unitText.toUpperCase() : '';
  if (unitText.includes('HOUR')) period = 'hour';
  else if (unitText.includes('MONTH')) period = 'month';
  else period = 'year';

  if (min === undefined && max === undefined) return undefined;

  return {
    min: isNaN(min as number) ? undefined : min,
    max: isNaN(max as number) ? undefined : max,
    currency,
    period,
  };
}

/**
 * Extracts location string from schema.org jobLocation.
 */
function normalizeLocation(jobLocation: unknown): string | undefined {
  if (!jobLocation) return undefined;
  if (typeof jobLocation === 'string') return jobLocation.trim();

  const loc = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  if (typeof loc !== 'object' || !loc) return undefined;

  const locObj = loc as Record<string, unknown>;
  const address = locObj.address;

  if (typeof address === 'string') return address.trim();
  if (address && typeof address === 'object') {
    const addr = address as Record<string, unknown>;
    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
    if (parts.length > 0) return parts.join(', ');
  }

  if (typeof locObj.name === 'string') return locObj.name.trim();
  return undefined;
}

/**
 * Finds all objects matching @type === "JobPosting" within JSON-LD structure.
 */
function findJobPostingObjects(node: unknown): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  if (!node || typeof node !== 'object') return results;

  if (Array.isArray(node)) {
    for (const item of node) {
      results.push(...findJobPostingObjects(item));
    }
    return results;
  }

  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
    results.push(obj);
  }

  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    results.push(...findJobPostingObjects(obj['@graph']));
  }

  return results;
}

/**
 * Extracts schema.org JobPosting data from HTML.
 */
export function extractJobPostingJsonLd(html: string): ExtractedJobLd | null {
  try {
    const $ = load(html);
    const scripts = $('script[type="application/ld+json"]');

    let matchedPosting: Record<string, unknown> | null = null;

    scripts.each((_, el) => {
      if (matchedPosting) return;
      try {
        const rawContent = $(el).text().trim();
        if (!rawContent) return;
        const parsed = JSON.parse(rawContent);
        const postings = findJobPostingObjects(parsed);
        if (postings.length > 0) {
          matchedPosting = postings[0];
        }
      } catch {
        // Ignore JSON parse errors in individual tags
      }
    });

    if (!matchedPosting) return null;

    const posting = matchedPosting as Record<string, unknown>;

    // Title
    const title = typeof posting.title === 'string' ? posting.title.trim() : undefined;

    // Company
    let company: string | undefined;
    if (posting.hiringOrganization && typeof posting.hiringOrganization === 'object') {
      const org = posting.hiringOrganization as Record<string, unknown>;
      if (typeof org.name === 'string') company = org.name.trim();
    } else if (typeof posting.hiringOrganization === 'string') {
      company = posting.hiringOrganization.trim();
    }

    // Location
    const location = normalizeLocation(posting.jobLocation);

    // Remote type
    let remoteType: RemoteType = 'on-site';
    const locType = typeof posting.jobLocationType === 'string' ? posting.jobLocationType.toUpperCase() : '';
    const descText = typeof posting.description === 'string' ? posting.description.toLowerCase() : '';
    const locText = (location || '').toLowerCase();
    const titleText = (title || '').toLowerCase();

    if (
      locType.includes('TELECOMMUTE') ||
      locText.includes('remote') ||
      locText.includes('anywhere') ||
      titleText.includes('(remote)') ||
      titleText.includes('[remote]')
    ) {
      remoteType = 'remote';
    } else if (locText.includes('hybrid') || titleText.includes('hybrid') || descText.includes('hybrid work')) {
      remoteType = 'hybrid';
    }

    // Salary
    const salary = normalizeSalary(posting.baseSalary);

    // Employment type
    const employmentType = normalizeEmploymentType(posting.employmentType as string | string[] | undefined);

    // Dates
    const postedAt = typeof posting.datePosted === 'string' ? posting.datePosted : undefined;
    const expiresAt = typeof posting.validThrough === 'string' ? posting.validThrough : undefined;

    // Description markdown
    let descriptionMarkdown: string | undefined;
    if (typeof posting.description === 'string') {
      descriptionMarkdown = htmlToMarkdown(posting.description);
    }

    return {
      title,
      company,
      location,
      remoteType,
      employmentType,
      salary,
      postedAt,
      expiresAt,
      descriptionMarkdown,
      rawJsonLd: posting,
    };
  } catch {
    return null;
  }
}
