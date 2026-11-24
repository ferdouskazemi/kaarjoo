import { Page } from 'playwright-core';
import fs from 'node:fs';
import {
  AtsType,
  FormField,
  FilledFieldValue,
  ReviewChecklistItem,
} from '@kaarjoo/shared';
import { FormFillerContext, FillResult } from '../types.js';
import { detectCaptchaInPage, detectLoginWall, detectFieldsFromPage } from '../detector.js';
import { mapFields } from '../mapper.js';

export interface BaseFillerOptions {
  atsType: AtsType;
  name: string;
  submitButtonSelectors: string[];
  confirmationSelectors: string[];
  confirmationTexts: string[];
}

export abstract class BaseAtsFiller {
  readonly atsType: AtsType;
  readonly name: string;
  readonly submitButtonSelectors: string[];
  readonly confirmationSelectors: string[];
  readonly confirmationTexts: string[];

  constructor(options: BaseFillerOptions) {
    this.atsType = options.atsType;
    this.name = options.name;
    this.submitButtonSelectors = options.submitButtonSelectors;
    this.confirmationSelectors = options.confirmationSelectors;
    this.confirmationTexts = options.confirmationTexts;
  }

  abstract canHandle(url: string, html?: string): boolean;

  async detectFields(page: Page): Promise<FormField[]> {
    return detectFieldsFromPage(page);
  }

  /**
   * Core form filling routine adhering strictly to Review Mode by default:
   * 1. Check for CAPTCHA / bot challenge -> STOP immediately if detected!
   * 2. Check for login wall -> STOP immediately if detected!
   * 3. Detect interactive form fields
   * 4. Map candidate profile and answers to fields
   * 5. Fill input fields, select dropdowns, and attach files
   * 6. Capture full-page screenshot before submit
   * 7. If mode is Review (default): Pause and return status 'needs_review'
   * 8. If mode is Auto and all required fields are satisfied: Submit form and confirm.
   */
  async fillForm(page: Page, context: FormFillerContext): Promise<FillResult> {
    // 1. CAPTCHA Check (Strict Rule: NEVER bypass captchas)
    const captcha = await detectCaptchaInPage(page);
    if (captcha.detected) {
      const screenshot = await this.captureScreenshot(page);
      return {
        success: false,
        status: 'needs_user',
        stopReason: 'captcha_detected',
        stopMessage: 'Anti-bot challenge or CAPTCHA detected. User interaction required in browser.',
        filledFields: [],
        reviewChecklist: [],
        screenshotBeforeSubmit: screenshot,
        missingRequiredFields: [],
      };
    }

    // 2. Login Wall Check
    const loginWall = await detectLoginWall(page);
    if (loginWall.detected) {
      const screenshot = await this.captureScreenshot(page);
      return {
        success: false,
        status: 'needs_user',
        stopReason: 'login_wall',
        stopMessage: `Login required: ${loginWall.reason}. Please sign in via the browser.`,
        filledFields: [],
        reviewChecklist: [],
        screenshotBeforeSubmit: screenshot,
        missingRequiredFields: [],
      };
    }

    // 3. Detect Fields
    const fields = await this.detectFields(page);
    if (fields.length === 0) {
      const screenshot = await this.captureScreenshot(page);
      return {
        success: false,
        status: 'needs_user',
        stopReason: 'unrecognized_page',
        stopMessage: 'No interactive form fields found on application page.',
        filledFields: [],
        reviewChecklist: [],
        screenshotBeforeSubmit: screenshot,
        missingRequiredFields: [],
      };
    }

    // 4. Map Candidate Profile & Answers
    const { mappedValues, filledFields, reviewChecklist, missingRequiredFields } = mapFields(fields, context);

    // 5. Fill Interactive Elements on Page
    for (const field of fields) {
      const mapping = mappedValues.get(field.selector);
      if (!mapping) continue;

      try {
        const el = await page.$(field.selector);
        if (!el) continue;

        if (field.type === 'file') {
          const filePath = String(mapping.value);
          if (filePath && fs.existsSync(filePath)) {
            await el.setInputFiles(filePath);
          }
        } else if (field.type === 'select') {
          if (mapping.option) {
            await page.selectOption(field.selector, mapping.option.value);
          } else {
            await page.selectOption(field.selector, { label: String(mapping.value) }).catch(() => {
              // fallback
            });
          }
        } else if (field.type === 'checkbox') {
          if (Boolean(mapping.value)) {
            await el.check().catch(() => {});
          }
        } else if (field.type === 'radio') {
          await el.check().catch(() => {});
        } else {
          // Standard text, textarea, email, tel, url
          await el.fill(String(mapping.value));
        }
      } catch (err) {
        console.warn(`[${this.name}] Failed to fill field ${field.selector}:`, err);
      }
    }

    // 6. Capture High-Resolution Screenshot
    const screenshot = await this.captureScreenshot(page);

    // 7. Review Mode Decision (Default)
    const isAutoMode = context.mode === 'auto';
    const canAutoSubmit =
      isAutoMode &&
      missingRequiredFields.length === 0 &&
      filledFields.every((f) => f.confidence >= (context.autoSubmitMinConfidence ?? 0.9));

    if (!canAutoSubmit) {
      // Pause at final review step
      return {
        success: true,
        status: 'needs_review',
        stopReason: missingRequiredFields.length > 0 ? 'unknown_required_field' : 'none',
        stopMessage: missingRequiredFields.length > 0
          ? `Please provide answers for required fields: ${missingRequiredFields.join(', ')}`
          : undefined,
        filledFields,
        reviewChecklist,
        screenshotBeforeSubmit: screenshot,
        missingRequiredFields,
      };
    }

    // 8. Auto-Submit Mode (Opt-in only)
    const submitResult = await this.submitForm(page);
    return {
      success: submitResult.success,
      status: submitResult.success ? 'submitted' : 'failed',
      stopReason: submitResult.success ? 'none' : 'unrecognized_page',
      stopMessage: submitResult.success ? undefined : 'Form submission button clicked but confirmation could not be verified.',
      filledFields,
      reviewChecklist,
      screenshotBeforeSubmit: screenshot,
      screenshotConfirmation: submitResult.screenshotConfirmation,
      submissionConfirmationText: submitResult.confirmationText,
      missingRequiredFields,
    };
  }

  /**
   * Submits the form by clicking the confirmed submit button and verifying confirmation.
   */
  async submitForm(page: Page): Promise<{ success: boolean; confirmationText?: string; screenshotConfirmation?: string }> {
    let submitClicked = false;

    for (const selector of this.submitButtonSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          submitClicked = true;
          break;
        }
      } catch {
        // try next selector
      }
    }

    if (!submitClicked) {
      return { success: false };
    }

    // Wait for response / navigation
    await page.waitForTimeout(1500);

    // Check for confirmation text or elements
    const confirmed = await this.detectConfirmation(page);
    const confirmationScreenshot = await this.captureScreenshot(page);

    return {
      success: confirmed.success,
      confirmationText: confirmed.text,
      screenshotConfirmation: confirmationScreenshot,
    };
  }

  async detectConfirmation(page: Page): Promise<{ success: boolean; text?: string }> {
    // 1. Selector check
    for (const sel of this.confirmationSelectors) {
      try {
        const el = await page.$(sel);
        if (el && (await el.isVisible())) {
          const text = (await el.textContent())?.trim();
          return { success: true, text };
        }
      } catch {
        // continue
      }
    }

    // 2. Text heuristics
    try {
      const pageText = await page.evaluate(() => document.body?.innerText || '');
      for (const phrase of this.confirmationTexts) {
        if (pageText.toLowerCase().includes(phrase.toLowerCase())) {
          return { success: true, text: phrase };
        }
      }
    } catch {
      // ignore
    }

    return { success: false };
  }

  async captureScreenshot(page: Page): Promise<string> {
    try {
      const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch {
      return '';
    }
  }
}
