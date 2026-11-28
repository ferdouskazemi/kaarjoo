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
  ReviewChecklistItem,
} from '@kaarjoo/shared';
import { AtsFiller, FormFillerContext, FillResult } from './types.js';
import { GreenhouseFiller } from './fillers/greenhouse.js';
import { LeverFiller } from './fillers/lever.js';
import { AshbyFiller } from './fillers/ashby.js';
import { WorkableFiller } from './fillers/workable.js';
import { GenericFormFiller } from './fillers/generic.js';
import { discoverSystemBrowsers } from './discovery.js';
import { seedChromiumProfile } from './utils/chromiumProfile.js';
import { detectCaptchaInPage, detectLoginWall } from './detector.js';
import { mapFields, type MappedFieldInfo } from './mapper.js';

export function sanitizeAutomationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown automation error');
  // Strip ANSI escape codes and Playwright verbose Call log blocks
  const cleaned = raw
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\nCall log:/i)[0]
    .trim();

  if (/ERR_NAME_NOT_RESOLVED/i.test(cleaned)) {
    return 'Could not reach the job application website (domain could not be resolved). Check your internet connection or verify the job link.';
  }
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED/i.test(cleaned)) {
    return 'Connection to the application page was refused or interrupted by the website.';
  }
  if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED/i.test(cleaned)) {
    return 'No active internet connection detected while opening the application page.';
  }
  if (/ERR_TIMED_OUT|Timeout\s+\d+ms\s+exceeded/i.test(cleaned)) {
    return 'The application page took too long to load. Please check your connection and try again.';
  }
  if (/Target page, context or browser has been closed/i.test(cleaned)) {
    return 'The browser window was closed before form filling completed.';
  }
  if (/ERR_FILE_NOT_FOUND/i.test(cleaned)) {
    return 'The application link or local file could not be found.';
  }
  return cleaned.replace(/^page\.goto:\s*/i, '').trim() || 'Form automation failed unexpectedly.';
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApplicationEngineOptions {
  headless?: boolean;
  browserExecutablePath?: string;
  userDataDir?: string;
  maxConcurrentContexts?: number;
  windowBounds?: WindowBounds;
  onFieldChanged?: (appId: string, reviewChecklist: ReviewChecklistItem[]) => void;
}

interface ActiveBrowserSession {
  context: BrowserContext;
  page: Page;
  tempDir?: string;
  userEditedSelectors: Set<string>;
  mappedValues?: Map<string, MappedFieldInfo>;
  fillContext?: FormFillerContext;
}

export class ApplicationEngine {
  private fillers: AtsFiller[];
  private applications: Map<string, ApplicationRecord> = new Map();
  private contexts: Map<string, ActiveBrowserSession> = new Map();
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

  setWindowBounds(bounds?: WindowBounds): void {
    this.options.windowBounds = bounds;
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

    const maxContexts = this.options.maxConcurrentContexts ?? 2;
    if (this.contexts.size >= maxContexts && !this.contexts.has(id)) {
      record.status = 'failed';
      record.stopReason = 'unrecognized_page';
      record.stopMessage = `Max concurrent browser contexts reached (limit: ${maxContexts}). Complete or cancel an open review first.`;
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

    const headless = this.options.headless ?? (record.mode === 'review' ? false : true);
    const launchArgs: string[] = [];
    if (!headless && this.options.windowBounds) {
      const b = this.options.windowBounds;
      launchArgs.push(`--window-position=${Math.round(b.x)},${Math.round(b.y)}`);
      launchArgs.push(`--window-size=${Math.round(b.width)},${Math.round(b.height)}`);
    }

    let browserContext: BrowserContext | null = null;
    try {
      browserContext = await chromium.launchPersistentContext(tempDir, {
        executablePath: browserExe,
        headless,
        args: launchArgs,
        viewport: { width: 1280, height: 900 },
      });

      const page = await browserContext.newPage();
      const userEditedSelectors = new Set<string>();
      const fillContext: FormFillerContext = {
        profile: contextParams.profile,
        tailoredResumePath: contextParams.tailoredResumePath || record.tailoredResumePath,
        coverLetterText: contextParams.coverLetterText || record.coverLetterText,
        answers: contextParams.answers,
        mode: record.mode,
        userEditedSelectors,
      };
      this.contexts.set(id, {
        context: browserContext,
        page,
        tempDir,
        userEditedSelectors,
        fillContext,
      });

      // Navigate to apply URL
      await page.goto(record.applyUrl, { waitUntil: 'load', timeout: 30000 });
      await this.attachFieldWatchers(id, page);

      // Determine ATS Filler
      const filler = this.getFiller(record.applyUrl);
      record.atsType = filler.atsType;

      const detectedFields = await filler.detectFields(page);
      const { mappedValues } = mapFields(detectedFields, fillContext);
      const sessionObj = this.contexts.get(id);
      if (sessionObj) sessionObj.mappedValues = mappedValues;

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
      } else if (result.status === 'needs_user') {
        await page.bringToFront().catch(() => {});
      } else if (result.status === 'needs_review') {
        // Keep context alive for user review or confirmation
      } else {
        await this.cleanupSession(id);
      }

      return record;
    } catch (err: any) {
      record.status = 'failed';
      record.stopReason = 'unrecognized_page';
      record.stopMessage = sanitizeAutomationError(err);
      record.updatedAt = new Date().toISOString();
      await this.cleanupSession(id);
      return record;
    }
  }

  private async attachFieldWatchers(appId: string, page: Page): Promise<void> {
    try {
      await page.exposeFunction('__kaarjooFieldChanged', async (selector: string) => {
        const session = this.contexts.get(appId);
        const record = this.applications.get(appId);
        if (!session || !record) return;
        session.userEditedSelectors.add(selector);
        const filler = this.getFiller(record.applyUrl);
        const fields = await filler.detectFields(session.page);
        const { reviewChecklist } = await filler.readBackChecklist(
          session.page,
          fields,
          session.mappedValues,
          undefined,
          session.userEditedSelectors
        );
        record.reviewChecklist = reviewChecklist;
        record.updatedAt = new Date().toISOString();
        this.options.onFieldChanged?.(appId, reviewChecklist);
      });
    } catch {
      // Already exposed on this page
    }

    await page
      .evaluate(() => {
        if ((window as any).__kaarjooWatcherAttached) return;
        (window as any).__kaarjooWatcherAttached = true;
        const computeSelector = (el: HTMLElement): string => {
          if (el.id) return `#${el.id}`;
          const name = el.getAttribute('name');
          if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
          return el.tagName.toLowerCase();
        };
        const handler = (ev: Event) => {
          if ((window as any).__kaarjooFilling) return;
          const target = ev.target as HTMLElement | null;
          if (!target) return;
          const tag = target.tagName.toLowerCase();
          if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;
          const sel = computeSelector(target);
          (window as any).__kaarjooFieldChanged?.(sel);
        };
        document.addEventListener('input', handler, true);
        document.addEventListener('change', handler, true);
      })
      .catch(() => {});
  }

  async resumeApplication(
    id: string,
    contextParams?: {
      profile?: UserProfile;
      tailoredResumePath?: string;
      coverLetterText?: string;
      answers?: Record<string, string>;
    }
  ): Promise<ApplicationRecord> {
    const record = this.applications.get(id);
    const session = this.contexts.get(id);
    if (!record || !session) {
      throw new Error(`No active browser session to resume for application ${id}`);
    }

    const captcha = await detectCaptchaInPage(session.page);
    if (captcha.detected) {
      await session.page.bringToFront().catch(() => {});
      record.status = 'needs_user';
      record.stopReason = 'captcha_detected';
      record.stopMessage = 'CAPTCHA is still present. Please complete it in the browser window.';
      record.updatedAt = new Date().toISOString();
      return record;
    }

    const loginWall = await detectLoginWall(session.page);
    if (loginWall.detected) {
      await session.page.bringToFront().catch(() => {});
      record.status = 'needs_user';
      record.stopReason = 'login_wall';
      record.stopMessage = `Login wall still present: ${loginWall.reason}`;
      record.updatedAt = new Date().toISOString();
      return record;
    }

    const filler = this.getFiller(record.applyUrl);
    const fillContext: FormFillerContext = {
      profile: contextParams?.profile ?? session.fillContext!.profile,
      tailoredResumePath:
        contextParams?.tailoredResumePath ?? session.fillContext?.tailoredResumePath ?? record.tailoredResumePath,
      coverLetterText:
        contextParams?.coverLetterText ?? session.fillContext?.coverLetterText ?? record.coverLetterText,
      answers: contextParams?.answers ?? session.fillContext?.answers,
      mode: record.mode,
      userEditedSelectors: session.userEditedSelectors,
    };
    session.fillContext = fillContext;
    await this.attachFieldWatchers(id, session.page);

    const detectedFields = await filler.detectFields(session.page);
    const { mappedValues } = mapFields(detectedFields, fillContext);
    session.mappedValues = mappedValues;

    const result = await filler.fillForm(session.page, fillContext);
    record.status = result.status;
    record.stopReason = result.stopReason;
    record.stopMessage = result.stopMessage;
    record.filledFields = result.filledFields;
    record.reviewChecklist = result.reviewChecklist;
    record.screenshotBeforeSubmit = result.screenshotBeforeSubmit;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  async submitReviewedApplication(
    id: string,
    rehydrate?: {
      submitAttemptId?: string;
      profile?: UserProfile;
      job?: JobPosting;
      tailoredResumePath?: string;
      coverLetterText?: string;
      acceptedMismatchIds?: string[];
    }
  ): Promise<ApplicationRecord & { refilled?: boolean; submitStatus?: 'verified' | 'unverified' | 'failed' }> {
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

    if (!session) {
      throw new Error(`Active browser session for application ${id} expired or closed`);
    }

    const filler = this.getFiller(record.applyUrl);

    // Re-read all fields from live DOM before submitting
    const fields = await filler.detectFields(session.page);
    const { reviewChecklist, missingRequiredFields } = await filler.readBackChecklist(
      session.page,
      fields,
      session.mappedValues,
      undefined,
      session.userEditedSelectors
    );
    record.reviewChecklist = reviewChecklist;

    const acceptedSet = new Set(rehydrate?.acceptedMismatchIds ?? []);
    const blockingItems = reviewChecklist.filter(
      (item) =>
        item.status === 'empty_required' ||
        item.status === 'failed' ||
        (item.status === 'mismatch' && !item.acceptedMismatch && !acceptedSet.has(item.id))
    );

    if (blockingItems.length > 0 || missingRequiredFields.length > 0) {
      const labels = blockingItems.map((b) => b.label).join(', ') || missingRequiredFields.join(', ');
      throw new Error(`Cannot submit: blocking fields require review (${labels})`);
    }

    record.status = 'submitting';
    record.updatedAt = new Date().toISOString();

    this.submittingIds.add(id);
    let keepSessionOpen = false;
    let submitStatus: 'verified' | 'unverified' | 'failed' = 'failed';
    try {
      const submitResult = await filler.submitForm(session.page);
      submitStatus = submitResult.status;

      if (submitResult.submitButtonNotFound) {
        keepSessionOpen = true;
        await session.page.bringToFront().catch(() => {});
        record.status = 'needs_user';
        record.stopReason = 'unrecognized_page';
        record.stopMessage =
          'Submit button not found automatically. Please click Submit in the open Chrome window.';
      } else if (submitResult.success) {
        record.status = 'submitted';
        record.submittedAt = new Date().toISOString();
        record.screenshotConfirmation = submitResult.screenshotConfirmation;
        if (attemptId) this.completedAttemptIds.add(attemptId);
      } else {
        record.status = 'failed';
        record.screenshotConfirmation = submitResult.screenshotConfirmation;
        record.stopMessage = 'Submit button clicked but confirmation could not be verified.';
      }
    } finally {
      this.submittingIds.delete(id);
      if (!keepSessionOpen) {
        await this.cleanupSession(id);
      }
    }

    record.updatedAt = new Date().toISOString();
    return { ...record, submitStatus };
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
