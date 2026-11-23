import { describe, expect, it } from 'vitest';
import type { JobPosting, TailoredResume, UserProfile } from '@kaarjoo/shared';
import { TruthfulnessGuard } from '../truthfulness.js';
import { tailorResume, generateCoverLetter } from '../tailor.js';
import { defaultAnswerBank } from '../answerBank.js';
import { renderAtsCleanHtml } from '../templates/atsClean.js';
import { exportResumeToDocx } from '../exporters/docx.js';

describe('Phase 4: Tailored Documents & Truthfulness Guard', () => {
  const verifiedProfile: UserProfile = {
    id: 'prof_test_truth',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contact: {
      fullName: 'Ahmad Karimi',
      email: 'ahmad@example.com',
      phone: '+93791234567',
      location: 'Kabul, Afghanistan',
    },
    targetTitles: ['Senior Software Engineer', 'Backend Developer'],
    experiences: [
      {
        id: 'e1',
        title: 'Backend Software Engineer',
        company: 'AfghanTech Solutions',
        startDate: '2021-01-01',
        isCurrent: true,
        achievements: [
          'Engineered PostgreSQL database handling 50k transactions daily.',
          'Built microservices in Go and Docker with 99.9% uptime.',
        ],
        skillsUsed: ['Go', 'PostgreSQL', 'Docker'],
      },
    ],
    education: [
      {
        id: 'edu1',
        degree: 'Bachelor of Computer Science',
        institution: 'Kabul University',
        startDate: '2016-03-01',
        endDate: '2020-01-01',
      },
    ],
    skills: [
      { id: 's1', name: 'Go', escoId: 'esco_go' },
      { id: 's2', name: 'PostgreSQL', escoId: 'esco_pg' },
      { id: 's3', name: 'Docker', escoId: 'esco_docker' },
    ],
    languages: [],
    certifications: [],
    workAuthorization: ['Remote Worldwide'],
    preferences: {
      targetTitles: ['Backend Software Engineer'],
      seniorityLevels: ['senior'],
      locations: [],
      remoteTypes: ['remote'],
      workAuthorizationCountries: ['Remote Worldwide'],
      visaSponsorshipRequired: true,
      minSalary: 120000,
      salaryCurrency: 'USD',
      excludedCompanies: [],
      excludedKeywords: [],
      maxApplicationsPerDay: 10,
      autoApplyScoreThreshold: 85,
    },
  };

  const sampleJob: JobPosting = {
    id: 'job_stripe_1',
    sourceId: 'greenhouse',
    sourceName: 'Greenhouse',
    canonicalUrl: 'https://boards.greenhouse.io/stripe/jobs/1',
    applyUrl: 'https://boards.greenhouse.io/stripe/jobs/1',
    title: 'Senior Backend Engineer',
    company: 'Stripe',
    remoteType: 'remote',
    descriptionMarkdown: 'Looking for a Senior Backend Engineer with Go and PostgreSQL expertise.',
    requirements: ['Go', 'PostgreSQL', 'Docker'],
    atsType: 'greenhouse',
    contentHash: 'hash1',
  };

  describe('Truthfulness Guard: Verified Case', () => {
    it('approves a tailored resume that stays 100% faithful to facts', () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      const check = TruthfulnessGuard.verifyTailoredResume(verifiedProfile, tailored);

      expect(check.isTruthful).toBe(true);
      expect(check.score).toBe(100);
      expect(check.unsupportedClaims).toHaveLength(0);
      expect(check.verifiedClaims.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Adversarial Case 1: Hallucinated Employer', () => {
    it('catches and flags an unverified company introduced into history', () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      // Adversarial mutation: add fake employer
      tailored.experiences.push({
        id: 'fake_exp',
        title: 'Staff Engineer',
        company: 'Google LLC',
        startDate: '2023-01-01',
        isCurrent: false,
        originalAchievements: [],
        tailoredAchievements: ['Worked on Search index'],
        emphasizedSkills: ['Go'],
      });

      const check = TruthfulnessGuard.verifyTailoredResume(verifiedProfile, tailored);

      expect(check.isTruthful).toBe(false);
      expect(check.score).toBeLessThan(100);
      expect(check.unsupportedClaims.some((c) => c.claim === 'Google LLC')).toBe(true);
      expect(check.unsupportedClaims.some((c) => c.severity === 'high')).toBe(true);
    });
  });

  describe('Adversarial Case 2: Invented Degree & Institution', () => {
    it('flags unverified degrees not present in education facts', () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      // Adversarial mutation: fake degree from fake institution
      tailored.education.push({
        id: 'fake_edu',
        degree: 'PhD in Artificial Intelligence',
        institution: 'Stanford University',
      });

      const check = TruthfulnessGuard.verifyTailoredResume(verifiedProfile, tailored);

      expect(check.isTruthful).toBe(false);
      expect(check.unsupportedClaims.some((c) => c.claim.includes('PhD'))).toBe(true);
      expect(check.unsupportedClaims.some((c) => c.claim.includes('Stanford'))).toBe(true);
    });
  });

  describe('Adversarial Case 3: Inflated Years of Experience', () => {
    it('catches inflated experience duration in summary', () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      // Candidate has ~3.5 years, but adversarial draft claims 15+ years
      tailored.summary = 'Senior Architect with 15+ years of experience leading enterprise systems.';

      const check = TruthfulnessGuard.verifyTailoredResume(verifiedProfile, tailored);

      expect(check.isTruthful).toBe(false);
      expect(check.unsupportedClaims.some((c) => c.reason.includes('Inflated experience duration'))).toBe(true);
    });
  });

  describe('Adversarial Case 4: Exaggerated Quantitative Metrics', () => {
    it('flags unverified quantitative numbers injected into bullets', () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      tailored.experiences[0].tailoredAchievements.push(
        'Scaled system throughput to 500k requests/sec and managed a $50m cloud budget.'
      );

      const check = TruthfulnessGuard.verifyTailoredResume(verifiedProfile, tailored);

      expect(check.isTruthful).toBe(false);
      expect(check.unsupportedClaims.some((c) => c.claim.includes('500k') || c.claim.includes('50m'))).toBe(true);
    });
  });

  describe('Answer Bank & Screening Questions', () => {
    it('retrieves approved answers for notice period and salary', () => {
      const ansNotice = defaultAnswerBank.getAnswer('What is your expected notice period?', verifiedProfile);
      expect(ansNotice.category).toBe('notice_period');
      expect(ansNotice.answerText).toContain('2 weeks');

      const ansSalary = defaultAnswerBank.getAnswer('What are your salary expectations for this role?', verifiedProfile);
      expect(ansSalary.category).toBe('salary');
      expect(ansSalary.answerText).toContain('120,000');
    });

    it('calculates technology experience accurately from profile', () => {
      const ansYears = defaultAnswerBank.getAnswer('How many years of experience do you have with Go?', verifiedProfile);
      expect(ansYears.category).toBe('experience_years');
      expect(ansYears.answerText).toMatch(/\d+\+?\s*years/);
    });

    it('defaults EEO demographic questions to decline to answer', () => {
      const ansEeo = defaultAnswerBank.getAnswer('What is your gender / ethnicity identification?', verifiedProfile);
      expect(ansEeo.category).toBe('eeo_demographic');
      expect(ansEeo.answerText).toContain('decline');
    });
  });

  describe('Document Exporters', () => {
    it('renders clean HTML template with contact and sections', () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      const html = renderAtsCleanHtml(tailored);

      expect(html).toContain('Ahmad Karimi');
      expect(html).toContain('Backend Software Engineer');
      expect(html).toContain('AfghanTech Solutions');
      expect(html).toContain('PostgreSQL');
    });

    it('generates a valid binary DOCX buffer', async () => {
      const tailored = tailorResume(verifiedProfile, sampleJob);
      const buffer = await exportResumeToDocx(tailored);

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid DOCX zip signature: PK\x03\x04
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('generates a factual cover letter referencing real achievements', () => {
      const cl = generateCoverLetter(verifiedProfile, sampleJob, 'en');

      expect(cl.recipientCompany).toBe('Stripe');
      expect(cl.roleTitle).toBe('Senior Backend Engineer');
      expect(cl.referencedAchievements.length).toBeGreaterThan(0);
      expect(cl.fullText).toContain('Ahmad Karimi');
    });
  });
});
