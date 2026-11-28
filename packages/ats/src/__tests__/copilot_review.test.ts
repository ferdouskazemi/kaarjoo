import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { ApplicationEngine } from '../engine.js';
import { mapFields } from '../mapper.js';
import type { FormField, JobPosting, ReviewChecklistItem, UserProfile } from '@kaarjoo/shared';

const testProfile: UserProfile = {
  id: 'prof_copilot',
  version: 1,
  contact: {
    fullName: 'Sara Ahmadi',
    email: 'sara.ahmadi@example.com',
    phone: '+98 912 000 1122',
    location: 'Tehran',
  },
  summary: 'Full-stack TypeScript engineer.',
  experiences: [
    {
      id: 'exp_1',
      company: 'Acme Tech',
      title: 'Senior Engineer',
      startDate: '2021-01',
      isCurrent: true,
      achievements: ['Built web apps'],
      skillsUsed: ['TypeScript'],
    },
  ],
  education: [],
  skills: [],
  languages: [
    { id: 'lang_en', language: 'English', proficiency: 'C1' },
    { id: 'lang_fa', language: 'Persian', proficiency: 'native' },
  ],
  targetTitles: ['Software Engineer'],
  certifications: [],
  workAuthorization: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('Prompt 5 Browser Co-Pilot (Playwright)', () => {
  let server: http.Server;
  let baseUrl = '';
  let submitClickCount = 0;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (req.url === '/footer-trap') {
        res.end(`<!DOCTYPE html><html><body>
          <form>
            <label for="first_name">First Name</label>
            <input id="first_name" name="first_name" type="text" required />
            <label for="last_name">Last Name</label>
            <input id="last_name" name="last_name" type="text" required />
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />
            <button type="submit" id="submit_app">Submit Application</button>
          </form>
          <footer>Thank you for applying to our company!</footer>
          <script>
            document.querySelector('form').addEventListener('submit', (e) => {
              e.preventDefault();
              window.__clicked = (window.__clicked || 0) + 1;
            });
          </script>
        </body></html>`);
        return;
      }

      if (req.url === '/missing-required') {
        res.end(`<!DOCTYPE html><html><body>
          <form>
            <label for="first_name">First Name</label>
            <input id="first_name" name="first_name" type="text" required />
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />
            <label for="work_auth">Are you authorized to work?</label>
            <input id="work_auth" name="work_auth" type="text" required />
            <button type="submit" id="submit_app">Submit Application</button>
          </form>
          <script>
            document.querySelector('form').addEventListener('submit', (e) => {
              e.preventDefault();
              const d = document.createElement('div');
              d.className = 'confirmation-message';
              d.textContent = 'Application submitted successfully!';
              document.body.appendChild(d);
            });
          </script>
        </body></html>`);
        return;
      }

      if (req.url === '/success-submit') {
        res.end(`<!DOCTYPE html><html><body>
          <form>
            <label for="first_name">First Name</label>
            <input id="first_name" name="first_name" type="text" required />
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />
            <button type="submit" id="submit_app">Submit Application</button>
          </form>
          <script>
            document.querySelector('form').addEventListener('submit', (e) => {
              e.preventDefault();
              fetch('/track-click', { method: 'POST' });
              const d = document.createElement('div');
              d.className = 'confirmation-message';
              d.textContent = 'Thank you for applying! Your application has been received.';
              document.body.appendChild(d);
            });
          </script>
        </body></html>`);
        return;
      }

      if (req.url === '/track-click' && req.method === 'POST') {
        submitClickCount++;
        res.end('ok');
        return;
      }

      if (req.url === '/fill-error') {
        res.end(`<!DOCTYPE html><html><body>
          <form>
            <label for="first_name">First Name</label>
            <input id="first_name" name="first_name" type="text" required />
            <label for="resume">Resume</label>
            <input id="resume" name="resume" type="file" />
            <button type="submit" id="submit_app">Submit</button>
          </form>
        </body></html>`);
        return;
      }

      res.statusCode = 404;
      res.end('Not found');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const makeJob = (id: string, pathname: string): JobPosting => ({
    id,
    sourceId: 'src_test',
    sourceName: 'TestBoard',
    canonicalUrl: `${baseUrl}${pathname}`,
    applyUrl: `${baseUrl}${pathname}`,
    title: 'Software Engineer',
    company: 'TestCo',
    location: 'Remote',
    remoteType: 'remote',
    employmentType: 'full-time',
    descriptionMarkdown: 'Test job',
    requirements: [],
    atsType: 'greenhouse',
    contentHash: `hash_${id}`,
  });

  it('marks fill error as failed in reviewChecklist and omits it from filledFields', async () => {
    const engine = new ApplicationEngine({ headless: true });
    const app = engine.queueApplication({
      job: makeJob('j_err', '/fill-error'),
      profile: testProfile,
      tailoredResumePath: 'C:\\nonexistent_path\\missing_resume.pdf',
    });

    const result = await engine.executeApplication(app.id, {
      profile: testProfile,
      tailoredResumePath: 'C:\\nonexistent_path\\missing_resume.pdf',
    });

    const resumeItem = result.reviewChecklist.find((i) => i.id === 'resume' || i.label.toLowerCase().includes('resume'));
    expect(resumeItem?.status).toBe('failed');
    expect(resumeItem?.error).toContain('not found');
    expect(result.filledFields.some((f) => f.fieldId === 'resume')).toBe(false);
    await engine.cancelApplication(app.id);
  }, 15000);

  it('blocks submitReviewedApplication when a required field is empty_required', async () => {
    const engine = new ApplicationEngine({ headless: true });
    const app = engine.queueApplication({
      job: makeJob('j_req', '/missing-required'),
      profile: testProfile,
    });

    const exec = await engine.executeApplication(app.id, { profile: testProfile });
    const workAuthItem = exec.reviewChecklist.find((i) => i.id === 'work_auth');
    expect(workAuthItem?.status).toBe('empty_required');

    await expect(
      engine.submitReviewedApplication(app.id, { submitAttemptId: 'attempt_req_1' })
    ).rejects.toThrow(/blocking fields/i);

    await engine.cancelApplication(app.id);
  }, 15000);

  it('records user edits in the browser as user_edited and fires onFieldChanged', async () => {
    const notifications: Array<{ appId: string; checklist: ReviewChecklistItem[] }> = [];
    const engine = new ApplicationEngine({
      headless: true,
      onFieldChanged: (appId, checklist) => notifications.push({ appId, checklist }),
    });
    const app = engine.queueApplication({
      job: makeJob('j_edit', '/success-submit'),
      profile: testProfile,
    });

    await engine.executeApplication(app.id, { profile: testProfile });
    const session = (engine as any).contexts.get(app.id);
    expect(session).toBeTruthy();

    await session.page.fill('#first_name', 'Sara Edited');
    await expect.poll(() => notifications.length, { timeout: 3000 }).toBeGreaterThan(0);
    const latest = notifications[notifications.length - 1].checklist;
    const firstName = latest.find((i) => i.id === 'first_name');
    expect(firstName?.status).toBe('user_edited');
    expect(firstName?.value).toBe('Sara Edited');

    await engine.cancelApplication(app.id);
  }, 15000);

  it('does not treat footer "Thank you for applying" present BEFORE submit as confirmation', async () => {
    const engine = new ApplicationEngine({ headless: true });
    const app = engine.queueApplication({
      job: makeJob('j_footer', '/footer-trap'),
      profile: testProfile,
    });

    await engine.executeApplication(app.id, { profile: testProfile });
    const submitted = await engine.submitReviewedApplication(app.id, {
      submitAttemptId: 'attempt_footer_1',
    });

    expect(submitted.submitStatus).toBe('unverified');
    expect(submitted.status).toBe('failed');
  }, 15000);

  it('enforces idempotency on double submitReviewedApplication with same submitAttemptId', async () => {
    submitClickCount = 0;
    const engine = new ApplicationEngine({ headless: true });
    const app = engine.queueApplication({
      job: makeJob('j_idem', '/success-submit'),
      profile: testProfile,
    });

    await engine.executeApplication(app.id, { profile: testProfile });
    const first = await engine.submitReviewedApplication(app.id, {
      submitAttemptId: 'attempt_idem_1',
    });
    expect(first.status).toBe('submitted');
    expect(first.submitStatus).toBe('verified');
    expect(submitClickCount).toBe(1);

    await expect(
      engine.submitReviewedApplication(app.id, { submitAttemptId: 'attempt_idem_1' })
    ).rejects.toThrow(/idempotent/i);
    expect(submitClickCount).toBe(1);
  }, 15000);

  it('returns needs_review (refilled: true) after engine restart without clicking submit', async () => {
    submitClickCount = 0;
    const restartedEngine = new ApplicationEngine({ headless: true });
    const job = makeJob('j_restart', '/success-submit');

    const res = await restartedEngine.submitReviewedApplication('app_restarted_1', {
      submitAttemptId: 'attempt_restart_1',
      job,
      profile: testProfile,
    });

    expect(res.refilled).toBe(true);
    expect(res.status).toBe('needs_review');
    expect(submitClickCount).toBe(0);
    await restartedEngine.cancelApplication('app_restarted_1');
  }, 15000);

  it('mapper never guesses work_authorization and only declines EEO when option exists', () => {
    const fields: FormField[] = [
      {
        id: 'work_auth',
        name: 'work_auth',
        label: 'Work Authorization',
        type: 'text',
        selector: '#work_auth',
        required: true,
        canonicalField: 'work_authorization',
      },
      {
        id: 'eeo_gender',
        name: 'eeo_gender',
        label: 'Gender',
        type: 'select',
        selector: '#eeo_gender',
        required: false,
        canonicalField: 'eeo_gender',
        options: [
          { label: 'Male', value: 'm' },
          { label: 'Female', value: 'f' },
        ],
      },
      {
        id: 'q_custom',
        name: 'q_custom',
        label: 'How many years of TypeScript experience do you have?',
        type: 'text',
        selector: '#q_custom',
        required: true,
      },
    ];

    const mapped = mapFields(fields, {
      profile: testProfile,
      answers: {
        'years of typescript experience': '6 years',
      },
    });

    expect(mapped.mappedValues.has('#work_auth')).toBe(false);
    expect(mapped.missingRequiredFields).toContain('Work Authorization');
    expect(mapped.mappedValues.has('#eeo_gender')).toBe(false);
    expect(mapped.mappedValues.get('#q_custom')?.value).toBe('6 years');
    expect(mapped.mappedValues.get('#q_custom')?.source).toBe('answer_bank');
  });
});
