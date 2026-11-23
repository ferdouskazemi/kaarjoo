import { hashCanonicalUrl, normalizeCanonicalUrl } from './url.js';
import { hashJobTuple, normalizeCompany, normalizeLocation, normalizeTitle } from './tuple.js';
import { SimHash } from './simhash.js';

export * from './url.js';
export * from './tuple.js';
export * from './simhash.js';

export interface DeduplicationHashes {
  canonicalUrl: string;
  urlHash: string;
  tupleHash: string;
  simHash: string;
}

/**
 * Computes all 3 deduplication hashes for a job posting.
 */
export function computeJobHashes(job: {
  url: string;
  company: string;
  title: string;
  location?: string;
  descriptionMarkdown: string;
}): DeduplicationHashes {
  const canonicalUrl = normalizeCanonicalUrl(job.url);
  const urlHash = hashCanonicalUrl(canonicalUrl);
  const tupleHash = hashJobTuple(job.company, job.title, job.location);
  const simHash = SimHash.compute(job.descriptionMarkdown);

  return {
    canonicalUrl,
    urlHash,
    tupleHash,
    simHash,
  };
}
