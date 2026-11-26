import { chromium, BrowserContext, Page } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {
  AtsType,
  ApplicationRecord,
  JobPosting,
  UserProfile,
  ApplicationMode,
} from '@kaarjoo/shared';
import { AtsFiller, FormFillerContext, FillResult } from './types.js';
import { GreenhouseFiller } from './fillers/greenhouse.js';
import { LeverFiller } from './fillers/lever.js';
import { AshbyFiller } from './fillers/ashby.js';
import { WorkableFiller } from './fillers/workable.js';
import { GenericFormFiller } from './fillers/generic.js';
import { discoverSystemBrowsers } from './discovery.js';
import { seedChromiumProfile } from './utils/chromiumProfile.js';

export interface ApplicationEngineOptions {
  headless?: boolean;
  browserExecutablePath?: string;
  userDataDir?: string;
}

export class ApplicationEngine {
  private fillers: AtsFiller[];
  private applications: Map<string, ApplicationRecord> = new Map();
  private contexts: Map<string, { context: BrowserContext; page: Page; tempDir?: string }> = new Map();
  private submittingIds: Set<string> = new Set();
  private completedAttemptIds: Set<string> = new Set();
  private options: ApplicationEngineOptions;

  constructor(options: ApplicationEngineOptions = {}) {
    this.options = options;
    this.fillers = [
      new GreenhouseFiller(),
      new LeverFiller(),
      new AshbyFiller(),
      new WorkableFiller(),
      new GenericFormFiller(),
    ];
    this.cleanupStaleSessions();
  }

  private getBrowserSessionsRoot(): string {
    return path.join(process.env.KAARJOO_APP_DATA_DIR || os.tmpdir(), 'browser-sessions');
  }

  /**
   * Deletes any Playwright session directory older than `maxAgeMs` (default 24 hours).
   */
  cleanupStaleSessions(maxAgeMs = 24 * 60 * 60 * 1000): number {
    const root = this.getBrowserSessionsRoot();
    if (!fs.existsSync(root)) return 0;
    const now = Date.now();
    let removed = 0;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(root, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          removed++;
        }
      } catch {
        // ignore stale cleanup error
      }
    }
    return removed;
  }

  async closeAllSessions(): Promise<number> {
    const ids = Array.from(this.contexts.keys());
    for (const id of ids) {
      await this.cleanupSession(id);
    }
    return ids.length;
  }

  getFiller(url: string, html?: string): AtsFiller {
    for (const filler of this.fillers) {
      if (filler.canHandle(url, html)) {
        return filler;
      }
    }
    return this.fillers[this.fillers.length - 1]; // Generic fallback
  }

  queueApplication(params: {
    id?: string;
    job: JobPosting;
    profile: UserProfile;
    tailoredResumePath?: string;
    coverLetterText?: string;
    mode?: ApplicationMode;
    answers?: Record<string, string>;
  }): ApplicationRecord {
    const id = params.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: ApplicationRecord = {
      id,
      jobId: params.job.id,
      jobTitle: params.job.title,
      company: params.job.company,
      applyUrl: params.job.applyUrl || params.job.canonicalUrl,
      atsType: params.job.atsType || 'generic',
      mode: params.mode || 'review',
      status: 'queued',
      profileId: params.profile.id,
      tailoredResumePath: params.tailoredResumePath,
      coverLetterText: params.coverLetterText,
      filledFields: [],
      reviewChecklist: [],
      stopReason: 'none',
      timeline: [],
      createdAt: now,
      updatedAt: now,
    };

    this.applications.set(id, record);
    return record;
  }

  getApplication(id: string): ApplicationRecord | undefined {
    return this.applications.get(id);
  }

  getAllApplications(): ApplicationRecord[] {
    return Array.from(this.applications.values());
  }

  async executeApplication(
    id: string,
    contextParams: {
      profile: UserProfile;
      tailoredResumePath?: string;
      coverLetterText?: string;
      answers?: Record<string, string>;
    }
  ): Promise<ApplicationRecord> {
    const record = this.applications.get(id);
    if (!record) {
      throw new Error(`Application with ID ${id} not found`);
    }

    record.status = 'filling';
    record.updatedAt = new Date().toISOString();

    const browserExe = this.options.browserExecutablePath || this.getBrowserPath();
    if (!browserExe) {
      record.status = 'failed';
      record.stopReason = 'unrecognized_page';
      record.stopMessage = 'No system browser (Chrome/Edge) found to execute application automation.';
      record.updatedAt = new Date().toISOString();
      return record;
    }

    const safeSessionId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const tempDir = path.join(this.getBrowserSessionsRoot(), safeSessionId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Protect Windows OS account from failed-logon lockouts (ported from flash-rive fix)
    seedChromiumProfile(tempDir);

    let browserContext: BrowserContext | null = null;
    try {
      browserContext = await chromium.launchPersistentContext(tempDir, {
        executablePath: browserExe,
        headless: this.options.headless !== false,
        viewport: { width: 1280, height: 900 },
      });

      const page = await browserContext.newPage();
      this.contexts.set(id, { context: browserContext, page, tempDir });

      // Navigate to apply URL
      await page.goto(record.applyUrl, { waitUntil: 'load', timeout: 30000 });

      // Determine ATS Filler
      const filler = this.getFiller(record.applyUrl);
      record.atsType = filler.atsType;

      const fillContext: FormFillerContext = {
        profile: contextParams.profile,
        tailoredResumePath: contextParams.tailoredResumePath || record.tailoredResumePath,
        coverLetterText: contextParams.coverLetterText || record.coverLetterText,
        answers: contextParams.answers,
        mode: record.mode,
      };

      const result: FillResult = await filler.fillForm(page, fillContext);

      record.status = result.status;
      record.stopReason = result.stopReason;
      record.stopMessage = result.stopMessage;
      record.filledFields = result.filledFields;
      record.reviewChecklist = result.reviewChecklist;
      record.screenshotBeforeSubmit = result.screenshotBeforeSubmit;
      record.screenshotConfirmation = result.screenshotConfirmation;
      record.updatedAt = new Date().toISOString();

      if (result.status === 'submitted') {
        record.submittedAt = new Date().toISOString();
        await this.cleanupSession(id);
      } else if (result.status === 'needs_user' || result.status === 'needs_review') {
        // Keep context alive for user review or confirmation
      } else {
        await this.cleanupSession(id);
      }

      return record;
    } catch (err: any) {
      record.status = 'failed';
      record.stopReason = 'unrecognized_page';
      record.stopMessage = err?.message || String(err);
      record.updatedAt = new Date().toISOString();
      await this.cleanupSession(id);
      return record;
    }
  }

  async submitReviewedApplication(
    id: string,
    rehydrate?: {
      submitAttemptId?: string;
      profile?: UserProfile;
      job?: JobPosting;
      tailoredResumePath?: string;
      coverLetterText?: string;
    }
  ): Promise<ApplicationRecord & { refilled?: boolean }> {
    const attemptId = rehydrate?.submitAttemptId;
    if (attemptId && this.completedAttemptIds.has(attemptId)) {
      throw new Error(`Submit attempt ${attemptId} already completed (idempotent guard)`);
    }
    if (this.submittingIds.has(id)) {
      throw new Error(`Application ${id} submission is already in flight`);
    }

    let record = this.applications.get(id);
    let session = this.contexts.get(id);

    // P0-5: Rehydrate must NEVER auto-submit without user reviewing the newly filled form!
    if ((!record || !session) && rehydrate?.profile && rehydrate?.job) {
      record = this.queueApplication({
        id,
        job: rehydrate.job,
        profile: rehydrate.profile,
        mode: 'review',
        tailoredResumePath: rehydrate.tailoredResumePath,
        coverLetterText: rehydrate.coverLetterText,
      });
      record = await this.executeApplication(id, {
        profile: rehydrate.profile,
        tailoredResumePath: rehydrate.tailoredResumePath,
        coverLetterText: rehydrate.coverLetterText,
      });
      return { ...record, refilled: true };
    }

    if (!record) {
      throw new Error(`Application ${id} not found`);
    }

    if (record.status !== 'needs_review') {
      throw new Error(`Application ${id} is not in 'needs_review' state (current: ${record.status})`);
    }

    record.status = 'submitting';
    record.updatedAt = new Date().toISOString();

    if (!session) {
      throw new Error(`Active browser session for application ${id} expired or closed`);
    }

    this.submittingIds.add(id);
    try {
      const filler = this.getFiller(record.applyUrl);
      const submitResult = await filler.submitForm(session.page);

      if (submitResult.success) {
        record.status = 'submitted';
        record.submittedAt = new Date().toISOString();
        record.screenshotConfirmation = submitResult.screenshotConfirmation;
        if (attemptId) this.completedAttemptIds.add(attemptId);
      } else {
        record.status = 'failed';
        record.stopMessage = 'Submit button clicked but confirmation could not be verified.';
      }
    } finally {
      this.submittingIds.delete(id);
      await this.cleanupSession(id);
    }

    record.updatedAt = new Date().toISOString();
    return record;
  }

  async cancelApplication(id: string): Promise<ApplicationRecord> {
    const record = this.applications.get(id);
    if (!record) {
      throw new Error(`Application ${id} not found`);
    }

    record.status = 'cancelled';
    record.updatedAt = new Date().toISOString();
    await this.cleanupSession(id);
    return record;
  }

  private async cleanupSession(id: string): Promise<void> {
    const session = this.contexts.get(id);
    if (session) {
      try {
        await session.context.close();
      } catch {
        // ignore
      }
      if (session.tempDir) {
        try {
          fs.rmSync(session.tempDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
      this.contexts.delete(id);
    }
  }

  private getBrowserPath(): string | undefined {
    const browsers = discoverSystemBrowsers();
    const chrome = browsers.find((b) => b.name === 'chrome');
    if (chrome) return chrome.executablePath;
    const edge = browsers.find((b) => b.name === 'msedge');
    if (edge) return edge.executablePath;
    return browsers[0]?.executablePath;
  }
}
