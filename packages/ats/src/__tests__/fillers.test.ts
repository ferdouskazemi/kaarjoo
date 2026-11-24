import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { chromium, BrowserContext, Page } from 'playwright-core';
import { discoverSystemBrowsers } from '../discovery.js';
import { GreenhouseFiller } from '../fillers/greenhouse.js';
import { LeverFiller } from '../fillers/lever.js';
import { detectCaptchaInPage, detectLoginWall } from '../detector.js';
import { UserProfile } from '@kaarjoo/shared';

describe('ATS Form Fillers Playwright Automation', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');
  let context: BrowserContext;
  let page: Page;
  let tempDir: string;

  const mockProfile: UserProfile = {
    id: 'usr_playwright_test',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contact: {
      fullName: 'Sara Tehrani',
      email: 'sara.tehrani@example.com',
      phone: '+1 555-0144',
      location: 'New York, NY',
      linkedinUrl: 'https://linkedin.com/in/saratehrani',
      githubUrl: 'https://github.com/saratehrani',
    },
    experiences: [
      {
        id: 'exp_1',
        title: 'Lead Architect',
        company: 'Vercel',
        startDate: '2021-03',
        isCurrent: true,
        achievements: [],
        skillsUsed: ['TypeScript', 'Next.js'],
      },
    ],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    targetTitles: ['Lead Architect'],
    workAuthorization: ['US'],
  };

  beforeAll(async () => {
    const browsers = discoverSystemBrowsers();
    const browser = browsers.find((b) => b.name === 'chrome') || browsers.find((b) => b.name === 'msedge') || browsers[0];
    if (!browser) {
      throw new Error('No system browser found for Playwright testing');
    }

    tempDir = path.join(os.tmpdir(), `kaarjoo_test_profile_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    context = await chromium.launchPersistentContext(tempDir, {
      executablePath: browser.executablePath,
      headless: true,
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
  });

  afterAll(async () => {
    if (context) {
      await context.close();
    }
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('detects CAPTCHA challenge and triggers Stop-and-Ask with zero bypass', async () => {
    const captchaUrl = `file://${path.join(fixturesDir, 'captcha_mock.html').replace(/\\/g, '/')}`;
    await page.goto(captchaUrl);

    const captcha = await detectCaptchaInPage(page);
    expect(captcha.detected).toBe(true);
    expect(captcha.type).toBe('recaptcha');
  });

  it('detects Login Wall and triggers Stop-and-Ask', async () => {
    const loginUrl = `file://${path.join(fixturesDir, 'login_mock.html').replace(/\\/g, '/')}`;
    await page.goto(loginUrl);

    const loginWall = await detectLoginWall(page);
    expect(loginWall.detected).toBe(true);
  });

  it('fills Greenhouse form in Review Mode and pauses at review step', async () => {
    const ghUrl = `file://${path.join(fixturesDir, 'greenhouse_mock.html').replace(/\\/g, '/')}`;
    await page.goto(ghUrl);

    const filler = new GreenhouseFiller();
    expect(filler.canHandle('https://boards.greenhouse.io/stripe/jobs/123')).toBe(true);

    const result = await filler.fillForm(page, {
      profile: mockProfile,
      tailoredResumePath: path.join(fixturesDir, 'test_resume.pdf'),
      coverLetterText: 'Dear Hiring Manager,\nI am writing to express my strong interest...',
      answers: {
        work_auth: 'Yes',
      },
      mode: 'review', // Default Review Mode
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('needs_review');
    expect(result.stopReason).toBe('none');
    expect(result.screenshotBeforeSubmit).toContain('data:image/jpeg;base64,');

    // Verify inputs on page actually received values
    const firstNameVal = await page.$eval('#first_name', (el) => (el as HTMLInputElement).value);
    expect(firstNameVal).toBe('Sara');

    const lastNameVal = await page.$eval('#last_name', (el) => (el as HTMLInputElement).value);
    expect(lastNameVal).toBe('Tehrani');

    const emailVal = await page.$eval('#email', (el) => (el as HTMLInputElement).value);
    expect(emailVal).toBe('sara.tehrani@example.com');

    // Confirm that the form was NOT yet submitted in Review Mode
    const isSubmitted = await page.$eval('#application_confirmation', (el) => (el as HTMLElement).style.display !== 'none');
    expect(isSubmitted).toBe(false);

    // Now execute submission (as if user clicked "Approve and Submit" in app)
    const submitResult = await filler.submitForm(page);
    expect(submitResult.success).toBe(true);
    expect(submitResult.confirmationText?.toLowerCase()).toContain('thank you for applying');
  });

  it('fills Lever form in Review Mode and verifies values', async () => {
    const leverUrl = `file://${path.join(fixturesDir, 'lever_mock.html').replace(/\\/g, '/')}`;
    await page.goto(leverUrl);

    const filler = new LeverFiller();
    expect(filler.canHandle('https://jobs.lever.co/figma/abc-123')).toBe(true);

    const result = await filler.fillForm(page, {
      profile: mockProfile,
      tailoredResumePath: path.join(fixturesDir, 'test_resume.pdf'),
      coverLetterText: 'Hi team, please find my application attached.',
      mode: 'review',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('needs_review');

    const nameVal = await page.$eval('input[name="name"]', (el) => (el as HTMLInputElement).value);
    expect(nameVal).toBe('Sara Tehrani');

    const orgVal = await page.$eval('input[name="org"]', (el) => (el as HTMLInputElement).value);
    expect(orgVal).toBe('Vercel');

    // Submit form and verify confirmation
    const submitResult = await filler.submitForm(page);
    expect(submitResult.success).toBe(true);
    expect(submitResult.confirmationText?.toLowerCase()).toContain('application submitted');
  });
});
