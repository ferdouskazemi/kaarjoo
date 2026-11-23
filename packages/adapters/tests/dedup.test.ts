import { describe, expect, it } from 'vitest';
import {
  computeJobHashes,
  hashCanonicalUrl,
  hashJobTuple,
  normalizeCanonicalUrl,
  normalizeCompany,
  normalizeLocation,
  normalizeTitle,
  SimHash,
} from '../src/dedup/index.js';

describe('Deduplication Engine', () => {
  describe('Canonical URL Normalization', () => {
    it('strips tracking query parameters and fragments', () => {
      const dirtyUrl = 'https://boards.greenhouse.io/stripe/jobs/12345?utm_source=linkedin&utm_medium=jobboard&gh_src=abc123#overview';
      const cleanUrl = normalizeCanonicalUrl(dirtyUrl);
      expect(cleanUrl).toBe('https://boards.greenhouse.io/stripe/jobs/12345');
    });

    it('produces identical SHA-256 hashes for different tracking params', () => {
      const url1 = 'https://jobs.lever.co/figma/001?utm_campaign=feed&source=indeed';
      const url2 = 'https://jobs.lever.co/figma/001?ref=twitter&utm_source=email';
      expect(hashCanonicalUrl(url1)).toBe(hashCanonicalUrl(url2));
    });
  });

  describe('Tuple Normalization', () => {
    it('normalizes company names and legal suffixes', () => {
      expect(normalizeCompany('Stripe, Inc.')).toBe('stripe');
      expect(normalizeCompany('Figma LLC')).toBe('figma');
      expect(normalizeCompany('Klarna Bank AB (publ)')).toBe('klarna bank ab publ');
    });

    it('generates identical tuple hash for matching normalized titles & companies', () => {
      const hashA = hashJobTuple('Datadog Inc', 'Senior Backend Engineer', 'San Francisco, CA');
      const hashB = hashJobTuple('Datadog LLC', 'Senior Backend Engineer', 'San Francisco, CA');
      expect(hashA).toBe(hashB);
    });

    it('normalizes various remote designations', () => {
      expect(normalizeLocation('Anywhere in the World (Remote)')).toBe('remote');
      expect(normalizeLocation('دورکاری سراسری')).toBe('remote');
    });
  });

  describe('SimHash Locality-Sensitive Hashing', () => {
    it('produces exact 0 hamming distance for identical texts', () => {
      const text = 'Stripe is hiring a Staff Software Engineer to build distributed payment infrastructure across Kubernetes clusters.';
      const hash1 = SimHash.compute(text);
      const hash2 = SimHash.compute(text);
      expect(hash1).toBe(hash2);
      expect(SimHash.hammingDistance(hash1, hash2)).toBe(0);
    });

    it('detects near-duplicates with minor modifications (distance <= 3)', () => {
      const textA = 'Stripe is an Irish-American financial services and software company dual-headquartered in South San Francisco, California and Dublin, Ireland. The company primarily offers payment processing software and application programming interfaces for e-commerce websites and mobile applications. As a Senior Engineer, you will design distributed database systems, maintain 99.999% availability, and scale throughput beyond 100,000 requests per second. Qualifications include 7+ years of backend engineering in Go, Java, or Rust.';
      const textB = 'Stripe is an American-Irish financial services and software company dual-headquartered in South San Francisco, California and Dublin, Ireland. The company primarily offers payment processing software and application programming interfaces for e-commerce websites and mobile applications. As a Senior Engineer, you will design distributed database systems, maintain 99.999% availability, and scale throughput beyond 100,000 requests per second. Qualifications include 7+ years of backend engineering in Go, Java, or Rust.';

      const hashA = SimHash.compute(textA);
      const hashB = SimHash.compute(textB);

      const distance = SimHash.hammingDistance(hashA, hashB);
      expect(distance).toBeLessThanOrEqual(3);
      expect(SimHash.isNearDuplicate(hashA, hashB, 3)).toBe(true);
    });

    it('distinguishes completely different job postings (distance >> 3)', () => {
      const textA = 'Full Stack Ruby on Rails developer needed for healthcare patient portal with HIPAA compliance.';
      const textB = 'Embedded firmware engineer specializing in ARM Cortex-M microcontrollers, RTOS, and CAN bus telemetry.';

      const hashA = SimHash.compute(textA);
      const hashB = SimHash.compute(textB);

      const distance = SimHash.hammingDistance(hashA, hashB);
      expect(distance).toBeGreaterThan(15);
      expect(SimHash.isNearDuplicate(hashA, hashB, 3)).toBe(false);
    });
  });

  describe('Combined Hash Pipeline', () => {
    it('computes all hashes in one pass', () => {
      const hashes = computeJobHashes({
        url: 'https://jobs.ashbyhq.com/openai/1234?utm_source=google',
        company: 'OpenAI Inc.',
        title: 'Research Scientist',
        location: 'San Francisco, CA (Remote)',
        descriptionMarkdown: '# Research Scientist\nJoin our frontier team.',
      });

      expect(hashes.canonicalUrl).toBe('https://jobs.ashbyhq.com/openai/1234');
      expect(hashes.urlHash).toHaveLength(64);
      expect(hashes.tupleHash).toHaveLength(64);
      expect(hashes.simHash).toHaveLength(16);
    });
  });
});
