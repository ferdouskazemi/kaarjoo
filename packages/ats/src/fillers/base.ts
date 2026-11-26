import { Page } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import {
  AtsType,
  FormField,
  FilledFieldValue,
  ReviewChecklistItem,
} from '@kaarjoo/shared';
import { FormFillerContext, FillResult, SubmitFormResult } from '../types.js';
import { detectCaptchaInPage, detectLoginWall, detectFieldsFromPage } from '../detector.js';
import { mapFields, type MappedFieldInfo } from '../mapper.js';

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
    const { mappedValues, filledFields } = mapFields(fields, context);
    const fillErrors = new Map<string, string>();
    const failedSelectors = new Set<string>();

    // 5. Fill Interactive Elements on Page (guarding live-edit watchers)
    await page.evaluate(() => {
      (window as any).__kaarjooFilling = true;
    }).catch(() => {});

    try {
      for (const field of fields) {
        const mapping = mappedValues.get(field.selector);
        if (!mapping) continue;

        try {
          const el = await page.$(field.selector);
          if (!el) {
            throw new Error(`Element not found for selector: ${field.selector}`);
          }

          if (field.type === 'file') {
            const filePath = String(mapping.value);
            if (!filePath || !fs.existsSync(filePath)) {
              throw new Error(`Resume file not found: ${filePath}`);
            }
            await el.setInputFiles(filePath);
          } else if (field.type === 'select') {
            if (mapping.option) {
              await page.selectOption(field.selector, mapping.option.value);
            } else {
              await page.selectOption(field.selector, { label: String(mapping.value) });
            }
          } else if (field.type === 'checkbox') {
            if (Boolean(mapping.value)) {
              await el.check();
            } else {
              await el.uncheck();
            }
          } else if (field.type === 'radio') {
            await el.check();
          } else {
            await el.fill(String(mapping.value));
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          fillErrors.set(field.selector, msg);
          failedSelectors.add(field.selector);
        }
      }
    } finally {
      await page.evaluate(() => {
        (window as any).__kaarjooFilling = false;
      }).catch(() => {});
    }

    // Never report a field as filled if fill threw
    const verifiedFilledFields: FilledFieldValue[] = [];
    const selectorByFieldId = new Map(fields.map((f) => [f.id, f.selector]));
    for (const ff of filledFields) {
      const sel = selectorByFieldId.get(ff.fieldId);
      if (!sel || !failedSelectors.has(sel)) {
        verifiedFilledFields.push(ff);
      }
    }

    // 5b. Read back every detected field's actual DOM value
    const { reviewChecklist, missingRequiredFields } = await this.readBackChecklist(
      page,
      fields,
      mappedValues,
      fillErrors,
      context.userEditedSelectors
    );

    // 6. Capture High-Resolution Screenshot
    const screenshot = await this.captureScreenshot(page);

    // 7. Review Mode Decision (Default)
    const isAutoMode = context.mode === 'auto';
    const canAutoSubmit =
      isAutoMode &&
      missingRequiredFields.length === 0 &&
      fillErrors.size === 0 &&
      verifiedFilledFields.every((f) => f.confidence >= (context.autoSubmitMinConfidence ?? 0.9));

    if (!canAutoSubmit) {
      return {
        success: true,
        status: 'needs_review',
        stopReason: missingRequiredFields.length > 0 ? 'unknown_required_field' : 'none',
        stopMessage: missingRequiredFields.length > 0
          ? `Please provide answers for required fields: ${missingRequiredFields.join(', ')}`
          : undefined,
        filledFields: verifiedFilledFields,
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
      filledFields: verifiedFilledFields,
      reviewChecklist,
      screenshotBeforeSubmit: screenshot,
      screenshotConfirmation: submitResult.screenshotConfirmation,
      submissionConfirmationText: submitResult.confirmationText,
      missingRequiredFields,
    };
  }

  /**
   * Reads every detected field's actual DOM value and builds `reviewChecklist`.
   */
  async readBackChecklist(
    page: Page,
    fields: FormField[],
    mappedValues?: Map<string, MappedFieldInfo>,
    fillErrors?: Map<string, string>,
    userEditedSelectors?: Set<string>
  ): Promise<{ reviewChecklist: ReviewChecklistItem[]; missingRequiredFields: string[] }> {
    const reviewChecklist: ReviewChecklistItem[] = [];
    const missingRequiredFields: string[] = [];

    for (const field of fields) {
      const mapping = mappedValues?.get(field.selector);
      const fillErr = fillErrors?.get(field.selector);
      const isUserEdited = userEditedSelectors?.has(field.selector) ?? false;

      let actualValue = '';
      let actualSelectValue = '';
      let readErr: string | undefined;

      try {
        const el = await page.$(field.selector);
        if (el) {
          if (field.type === 'file') {
            actualValue = await el.evaluate((input: HTMLInputElement) =>
              Array.from(input.files || []).map((f) => f.name).join(', ')
            );
          } else if (field.type === 'checkbox' || field.type === 'radio') {
            const checked = await el.isChecked();
            actualValue = checked ? 'true' : 'false';
          } else if (field.type === 'select') {
            const selInfo = await el.evaluate((sel: HTMLSelectElement) => {
              const opt = sel.options[sel.selectedIndex];
              return {
                value: sel.value || '',
                label: opt ? opt.text.trim() : '',
              };
            });
            actualValue = selInfo.label || selInfo.value;
            actualSelectValue = selInfo.value;
          } else {
            actualValue = await el.inputValue();
          }
        }
      } catch (err: any) {
        readErr = err?.message || String(err);
      }

      const category = mapping?.category ?? 'custom';
      const source = isUserEdited ? 'user' : (mapping?.source ?? 'unknown');
      const intendedDisplay = mapping
        ? mapping.option
          ? mapping.option.label
          : field.type === 'file'
          ? path.basename(String(mapping.value))
          : String(mapping.value)
        : undefined;

      let status: ReviewChecklistItem['status'];
      let note: string | undefined;

      if (fillErr || readErr) {
        status = 'failed';
        note = fillErr || readErr;
        if (field.required) missingRequiredFields.push(field.label);
      } else if (isUserEdited) {
        if (field.required && actualValue.trim() === '') {
          status = 'empty_required';
          missingRequiredFields.push(field.label);
          note = 'Required by employer';
        } else {
          status = 'user_edited';
        }
      } else if (!mapping) {
        if (field.required && actualValue.trim() === '') {
          status = 'empty_required';
          missingRequiredFields.push(field.label);
          note = 'Required by employer';
        } else {
          status = 'unknown_field';
          note = 'Detected on form but not mapped';
        }
      } else if (actualValue.trim() === '' || (field.type === 'select' && actualSelectValue === '')) {
        status = field.required ? 'empty_required' : 'empty_optional';
        if (field.required) {
          missingRequiredFields.push(field.label);
          note = 'Required by employer';
        }
      } else {
        const expectedNorm = String(intendedDisplay ?? '').trim();
        const actualNorm = actualValue.trim();
        const matches =
          field.type === 'select'
            ? actualSelectValue === String(mapping.value) || actualNorm === expectedNorm
            : field.type === 'file'
            ? actualNorm.includes(expectedNorm)
            : actualNorm === expectedNorm;
        status = matches ? 'ok' : 'mismatch';
        if (status === 'mismatch') {
          note = `Expected "${expectedNorm}", DOM has "${actualNorm}"`;
        }
      }

      reviewChecklist.push({
        id: field.id,
        label: field.label,
        value: actualValue,
        status,
        category,
        selector: field.selector,
        intendedValue: intendedDisplay,
        source,
        error: fillErr || readErr,
        required: field.required,
        note,
      });
    }

    return { reviewChecklist, missingRequiredFields };
  }

  /**
   * Submits the form by clicking the confirmed submit button and verifying confirmation via DOM diff.
   */
  async submitForm(page: Page): Promise<SubmitFormResult> {
    const beforeText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    const beforeUrl = page.url();

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
      return {
        success: false,
        status: 'failed',
        submitButtonNotFound: true,
      };
    }

    // Wait for navigation / network idle (max 20s)
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(250);

    const confirmed = await this.detectConfirmation(page, beforeText, beforeUrl);
    const confirmationScreenshot = await this.captureScreenshot(page);

    return {
      success: confirmed.success,
      status: confirmed.success ? 'verified' : 'unverified',
      confirmationText: confirmed.text,
      screenshotConfirmation: confirmationScreenshot,
    };
  }

  async detectConfirmation(
    page: Page,
    beforeText = '',
    beforeUrl = ''
  ): Promise<{ success: boolean; text?: string }> {
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

    // 2. Text phrases ONLY in content that appeared AFTER the click (DOM diff)
    try {
      const afterText = await page.evaluate(() => document.body?.innerText || '');
      const beforeLines = new Set(
        beforeText
          .split(/\r?\n/)
          .map((l) => l.trim().toLowerCase())
          .filter(Boolean)
      );
      const addedText = afterText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !beforeLines.has(l.toLowerCase()))
        .join('\n');

      for (const phrase of this.confirmationTexts) {
        if (addedText.toLowerCase().includes(phrase.toLowerCase())) {
          return { success: true, text: phrase };
        }
      }
    } catch {
      // ignore
    }

    // 3. URL pattern check (only if URL changed or matches confirmation route)
    const afterUrl = page.url();
    if (afterUrl !== beforeUrl && /thank|confirm|success/i.test(afterUrl)) {
      return { success: true, text: `URL navigated to ${afterUrl}` };
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
