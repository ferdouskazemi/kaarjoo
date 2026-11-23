import { describe, expect, it } from 'vitest';
import type { JobPosting, UserProfile } from '@kaarjoo/shared';
import { evaluateHardFilters } from '../hardFilters.js';
import { defaultSemanticEmbedder } from '../embeddings.js';
import { evaluateSkillCoverage } from '../skillCoverage.js';
import { rankJob } from '../rerank.js';

describe('Phase 3: Matching and Ranking Engine', () => {
  const sampleProfile: UserProfile = {
    id: 'test_prof_1',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contact: { fullName: 'Ali Moradi', email: 'ali@example.com' },
    targetTitles: ['Senior Frontend Engineer', 'React Developer'],
    skills: [
      { id: 's1', name: 'TypeScript', escoId: 'esco_ts' },
      { id: 's2', name: 'React', escoId: 'esco_react' },
      { id: 's3', name: 'Tailwind CSS', escoId: 'esco_tailwind' },
      { id: 's4', name: 'Docker', escoId: 'esco_docker' },
    ],
    experiences: [
      {
        id: 'e1',
        title: 'Senior Frontend Engineer',
        company: 'CloudTech',
        startDate: '2021-01-01',
        isCurrent: true,
        achievements: ['Built performant Next.js dashboard', 'Migrated 50k lines to TypeScript'],
        skillsUsed: ['React', 'TypeScript', 'Tailwind CSS'],
      },
    ],
    education: [],
    languages: [],
    certifications: [],
    workAuthorization: ['US', 'EU'],
    preferences: {
      targetTitles: ['Senior Frontend Engineer'],
      seniorityLevels: ['senior'],
      locations: [],
      remoteTypes: ['remote'],
      workAuthorizationCountries: ['US', 'EU'],
      visaSponsorshipRequired: false,
      excludedCompanies: ['BlockedCorp'],
      excludedKeywords: [],
      maxApplicationsPerDay: 10,
      autoApplyScoreThreshold: 85,
    },
  };

  const sampleJob: JobPosting = {
    id: 'job_react_lead',
    sourceId: 'greenhouse',
    sourceName: 'Greenhouse',
    canonicalUrl: 'https://boards.greenhouse.io/figma/jobs/99',
    applyUrl: 'https://boards.greenhouse.io/figma/jobs/99',
    title: 'Senior Frontend Engineer - Design Systems',
    company: 'Figma',
    location: 'San Francisco, CA (Remote)',
    remoteType: 'remote',
    salary: { min: 180000, max: 230000, currency: 'USD', period: 'year' },
    descriptionMarkdown: 'Build design systems and modern web interfaces in React and TypeScript.',
    requirements: ['React', 'TypeScript', 'Design Systems', 'Docker'],
    atsType: 'greenhouse',
    contentHash: 'hash99',
  };

  describe('Hard Filters & Gating', () => {
    it('passes eligible remote job with matching company', () => {
      const res = evaluateHardFilters(sampleProfile, sampleJob);
      expect(res.passed).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(80);
      expect(res.redFlags).toHaveLength(0);
    });

    it('immediately rejects company on user exclusion list', () => {
      const blockedJob: JobPosting = { ...sampleJob, company: 'BlockedCorp' };
      const res = evaluateHardFilters(sampleProfile, blockedJob);
      expect(res.passed).toBe(false);
      expect(res.score).toBe(0);
      expect(res.redFlags).toContain('Company "BlockedCorp" is on your exclusion list');
    });

    it('penalizes on-site jobs when user requested remote only', () => {
      const onsiteJob: JobPosting = { ...sampleJob, remoteType: 'on-site', location: 'Munich, Germany' };
      const res = evaluateHardFilters(sampleProfile, onsiteJob);
      expect(res.redFlags.some(r => r.includes('on-site'))).toBe(true);
      expect(res.score).toBeLessThanOrEqual(60);
    });
  });

  describe('Semantic Similarity', () => {
    it('produces high similarity score for aligned titles and content', () => {
      const res = defaultSemanticEmbedder.computeSemanticMatch(sampleProfile, sampleJob);
      expect(res.overallSemanticScore).toBeGreaterThanOrEqual(70);
      expect(res.titleSimilarity).toBeGreaterThanOrEqual(60);
    });

    it('produces low similarity for completely disjoint roles', () => {
      const nurseJob: JobPosting = {
        ...sampleJob,
        title: 'Registered Intensive Care Nurse',
        descriptionMarkdown: 'Provide patient vital monitoring and clinical medication in hospital ICU.',
        requirements: ['Clinical Nursing', 'Patient Care'],
      };
      const res = defaultSemanticEmbedder.computeSemanticMatch(sampleProfile, nurseJob);
      expect(res.overallSemanticScore).toBeLessThan(40);
    });
  });

  describe('ESCO Skill Coverage', () => {
    it('detects matched and missing skills correctly', () => {
      const res = evaluateSkillCoverage(sampleProfile, sampleJob);
      expect(res.matchedSkills).toContain('React');
      expect(res.matchedSkills).toContain('TypeScript');
      expect(res.matchedSkills).toContain('Docker');
      expect(res.score).toBeGreaterThanOrEqual(75);
    });

    it('detects transferable skills across same category', () => {
      // Profile has React, job requires Vue.js
      const vueJob: JobPosting = {
        ...sampleJob,
        title: 'Frontend Engineer',
        descriptionMarkdown: 'Build UI with Vue.js framework.',
        requirements: ['Vue.js'],
      };
      const res = evaluateSkillCoverage(sampleProfile, vueJob);
      expect(res.transferableSkills.some(t => t.jobSkill === 'Vue.js' && t.candidateSkill === 'React')).toBe(true);
    });
  });

  describe('Overall Re-ranking & Reason Generation', () => {
    it('generates high score with top 3 factual reasons', () => {
      const match = rankJob(sampleProfile, sampleJob);
      expect(match.overallScore).toBeGreaterThanOrEqual(80);
      expect(match.topReasons.length).toBeGreaterThanOrEqual(1);
      expect(match.topReasons.length).toBeLessThanOrEqual(3);
      expect(match.matchedSkills).toContain('TypeScript');
      expect(match.breakdown.hardFilterScore).toBeGreaterThan(0);
      expect(match.breakdown.semanticScore).toBeGreaterThan(0);
      expect(match.breakdown.skillCoverageScore).toBeGreaterThan(0);
    });
  });
});
