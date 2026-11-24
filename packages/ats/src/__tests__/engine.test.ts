import { describe, it, expect, afterAll } from 'vitest';
import path from 'node:path';
import { ApplicationEngine } from '../engine.js';
import { JobPosting, UserProfile } from '@kaarjoo/shared';

describe('ApplicationEngine Core', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');
  const engine = new ApplicationEngine({ headless: true });

  const mockProfile: UserProfile = {
    id: 'usr_engine_test',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contact: {
      fullName: 'Nader Moradi',
      email: 'nader.moradi@example.com',
      phone: '+1 555-0188',
      location: 'Berlin, Germany',
      linkedinUrl: 'https://linkedin.com/in/nadermoradi',
      githubUrl: 'https://github.com/nadermoradi',
    },
    experiences: [
      {
        id: 'exp_1',
        title: 'Senior Backend Engineer',
        company: 'Klarna',
        startDate: '2020-05',
        isCurrent: true,
        achievements: [],
        skillsUsed: ['Go', 'Kubernetes'],
      },
    ],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    targetTitles: ['Senior Backend Engineer'],
    workAuthorization: ['EU'],
  };

  const ghUrl = `file://${path.join(fixturesDir, 'greenhouse_mock.html').replace(/\\/g, '/')}`;

  const mockJob: JobPosting = {
    id: 'job_test_gh_1',
    sourceId: 'src_gh',
    sourceName: 'Greenhouse',
    canonicalUrl: ghUrl,
    applyUrl: ghUrl,
    title: 'Senior Software Engineer',
    company: 'Stripe',
    location: 'Remote, US',
    remoteType: 'remote',
    descriptionMarkdown: 'Job description for senior engineer...',
    requirements: ['Go', 'Kubernetes'],
    atsType: 'greenhouse',
    contentHash: 'hash_123',
  };

  it('queues an application in review mode', () => {
    const record = engine.queueApplication({
      job: mockJob,
      profile: mockProfile,
      tailoredResumePath: path.join(fixturesDir, 'test_resume.pdf'),
      coverLetterText: 'Please accept my application.',
      mode: 'review',
    });

    expect(record.id).toBeDefined();
    expect(record.status).toBe('queued');
    expect(record.atsType).toBe('greenhouse');
    expect(engine.getApplication(record.id)).toBeDefined();
  });

  it('executes queued application in Review Mode and halts on final step with screenshot and checklist', async () => {
    const record = engine.queueApplication({
      job: mockJob,
      profile: mockProfile,
      tailoredResumePath: path.join(fixturesDir, 'test_resume.pdf'),
      coverLetterText: 'Please accept my application.',
      mode: 'review',
      answers: {
        work_auth: 'Yes',
      },
    });

    const executed = await engine.executeApplication(record.id, {
      profile: mockProfile,
      tailoredResumePath: path.join(fixturesDir, 'test_resume.pdf'),
      coverLetterText: 'Please accept my application.',
      answers: {
        work_auth: 'Yes',
      },
    });

    expect(executed.status).toBe('needs_review');
    expect(executed.screenshotBeforeSubmit).toBeDefined();
    expect(executed.reviewChecklist.length).toBeGreaterThanOrEqual(8);
    expect(executed.filledFields.length).toBeGreaterThanOrEqual(8);

    // User approves in UI -> triggers final submit
    const submitted = await engine.submitReviewedApplication(record.id);
    expect(submitted.status).toBe('submitted');
    expect(submitted.submittedAt).toBeDefined();
  }, 20000);

  it('allows cancelling an application', async () => {
    const record = engine.queueApplication({
      job: mockJob,
      profile: mockProfile,
    });

    const cancelled = await engine.cancelApplication(record.id);
    expect(cancelled.status).toBe('cancelled');
  });
});
