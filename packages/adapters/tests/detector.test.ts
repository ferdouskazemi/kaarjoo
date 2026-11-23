import { describe, expect, it } from 'vitest';
import { detectAtsFromUrl, SEEDED_COMPANY_BOARDS } from '../src/companies/index.js';

describe('Company Directory & ATS Detector', () => {
  describe('Direct ATS URL Detection', () => {
    it('detects Greenhouse URLs and slugs', async () => {
      const res = await detectAtsFromUrl('https://boards.greenhouse.io/stripe/jobs/12345');
      expect(res).not.toBeNull();
      expect(res?.atsType).toBe('greenhouse');
      expect(res?.boardSlug).toBe('stripe');
      expect(res?.companyName).toBe('Stripe');
    });

    it('detects Lever URLs and slugs', async () => {
      const res = await detectAtsFromUrl('https://jobs.lever.co/figma');
      expect(res).not.toBeNull();
      expect(res?.atsType).toBe('lever');
      expect(res?.boardSlug).toBe('figma');
    });

    it('detects Ashby URLs and slugs', async () => {
      const res = await detectAtsFromUrl('https://jobs.ashbyhq.com/openai');
      expect(res).not.toBeNull();
      expect(res?.atsType).toBe('ashby');
      expect(res?.boardSlug).toBe('openai');
    });

    it('detects Workable URLs and slugs', async () => {
      const res = await detectAtsFromUrl('https://apply.workable.com/klarna');
      expect(res).not.toBeNull();
      expect(res?.atsType).toBe('workable');
      expect(res?.boardSlug).toBe('klarna');
    });
  });

  describe('Seeded Company Directory', () => {
    it('contains top US & European companies', () => {
      expect(SEEDED_COMPANY_BOARDS.length).toBeGreaterThanOrEqual(15);
      const usCompanies = SEEDED_COMPANY_BOARDS.filter(c => c.country === 'US');
      const euCompanies = SEEDED_COMPANY_BOARDS.filter(c => c.country !== 'US');

      expect(usCompanies.length).toBeGreaterThan(0);
      expect(euCompanies.length).toBeGreaterThan(0);

      // Verify specific notable companies
      expect(SEEDED_COMPANY_BOARDS.some(c => c.name === 'Stripe')).toBe(true);
      expect(SEEDED_COMPANY_BOARDS.some(c => c.name === 'Spotify')).toBe(true);
      expect(SEEDED_COMPANY_BOARDS.some(c => c.name === 'OpenAI')).toBe(true);
      expect(SEEDED_COMPANY_BOARDS.some(c => c.name === 'Figma')).toBe(true);
      expect(SEEDED_COMPANY_BOARDS.some(c => c.name === 'DeepL')).toBe(true);
    });
  });
});
