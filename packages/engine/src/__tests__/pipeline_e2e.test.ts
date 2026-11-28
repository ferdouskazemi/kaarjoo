import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { ApplicationEngine } from '@kaarjoo/ats';
import { rankJob } from '../matching/rerank.js';
import {
  tailorResume,
  generateCoverLetter,
  renderAtsCleanHtml,
  exportResumeToPdf,
} from '../documents/index.js';
import type { JobPosting, UserProfile } from '@kaarjoo/shared';

describe('Acceptance E2E: discover -> tailor/exportPdf -> fill Greenhouse form', () => {
  it('uploads the tailored PDF (not the original CV) to the Greenhouse mock form', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaarjoo-e2e-tailor-'));
    const originalCvPath = path.join(tmpRoot, 'original_cv.pdf');
    fs.writeFileSync(originalCvPath, '%PDF-1.7\n%original\n', 'utf8');

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Greenhouse Mock</title></head>
<body>
  <form id="application_form">
    <label for="first_name">First Name *</label>
    <input id="first_name" name="first_name" type="text" required />
    <label for="last_name">Last Name *</label>
    <input id="last_name" name="last_name" type="text" required />
    <label for="email">Email *</label>
    <input id="email" name="email" type="email" required />
    <label for="resume">Resume / CV *</label>
    <input id="resume" name="resume" type="file" required />
    <button id="submit_app" type="submit">Submit Application</button>
  </form>
</body>
</html>`);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address() as { port: number };
    const applyUrl = `http://127.0.0.1:${addr.port}/boards.greenhouse.io/acme/jobs/1`;

    try {
      const profile: UserProfile = {
        id: 'prof_e2e',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contact: {
          fullName: 'Sara Ahmadi',
          email: 'sara.ahmadi@example.com',
          phone: '+1 555 010 0199',
        },
        targetTitles: ['Senior Frontend Engineer'],
        skills: [
          { id: 's1', name: 'React', escoId: 'esco_react' },
          { id: 's2', name: 'TypeScript', escoId: 'esco_ts' },
        ],
        experiences: [
          {
            id: 'e1',
            title: 'Senior Frontend Engineer',
            company: 'AcmeTech',
            startDate: '2021-01-01',
            isCurrent: true,
            achievements: ['Built React + TypeScript applications'],
            skillsUsed: ['React', 'TypeScript'],
          },
        ],
        education: [],
        languages: [],
        certifications: [],
        workAuthorization: [],
      };

      // 1. Discover (mock adapter output) & score
      const discoveredJob: JobPosting = {
        id: 'job_fe_e2e',
        sourceId: 'mock_greenhouse',
        sourceName: 'Mock Greenhouse',
        canonicalUrl: applyUrl,
        applyUrl,
        title: 'Senior Frontend Engineer',
        company: 'Acme',
        remoteType: 'remote',
        employmentType: 'full-time',
        descriptionMarkdown: 'Looking for a Senior Frontend Engineer skilled in React and TypeScript.',
        requirements: ['React', 'TypeScript'],
        atsType: 'greenhouse',
        contentHash: 'hash_fe_e2e',
        scrapedAt: new Date().toISOString(),
      };

      const match = rankJob(profile, discoveredJob);
      expect(match.overallScore).toBeGreaterThanOrEqual(55);

      // 2. Prepare: tailor + exportPdf
      const tailored = tailorResume(profile, discoveredJob, {
        templateId: 'ats-clean',
        language: 'en',
      });
      const coverLetter = generateCoverLetter(profile, discoveredJob, 'en');
      const tailoredPdfPath = path.join(tmpRoot, `tailored_${discoveredJob.id}.pdf`);
      await exportResumeToPdf(tailored, { outputPath: tailoredPdfPath });
      expect(fs.existsSync(tailoredPdfPath)).toBe(true);
      expect(tailoredPdfPath).not.toBe(originalCvPath);

      // 3. Fill against mock Greenhouse form in Review Mode
      const appEngine = new ApplicationEngine({
        headless: true,
        userDataDir: path.join(tmpRoot, 'browser_sessions'),
      });
      const queued = appEngine.queueApplication({
        id: 'app_e2e_1',
        job: discoveredJob,
        profile,
        tailoredResumePath: tailoredPdfPath,
        coverLetterText: coverLetter.fullText,
        mode: 'review',
      });
      const filled = await appEngine.executeApplication(queued.id, {
        profile,
        tailoredResumePath: tailoredPdfPath,
        coverLetterText: coverLetter.fullText,
      });

      const resumeItem = filled.reviewChecklist.find(
        (c) => /resume/i.test(c.label) || c.fieldId === 'resume'
      );
      expect(resumeItem).toBeTruthy();
      expect(resumeItem?.status).toBe('ok');
      expect(resumeItem?.value).toContain(`tailored_${discoveredJob.id}.pdf`);
      expect(resumeItem?.value).not.toContain('original_cv.pdf');

      await appEngine.cancelApplication(queued.id);
    } finally {
      server.closeAllConnections?.();
      await new Promise<void>((r) => server.close(() => r()));
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }, 45000);
});
