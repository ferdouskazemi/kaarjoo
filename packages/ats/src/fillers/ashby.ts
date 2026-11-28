import type { Page } from 'playwright-core';
import type { FormField } from '@kaarjoo/shared';
import { BaseAtsFiller } from './base.js';

export class AshbyFiller extends BaseAtsFiller {
  constructor() {
    super({
      atsType: 'ashby',
      name: 'Ashby',
      submitButtonSelectors: [
        'button[type="submit"]',
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Apply")',
      ],
      confirmationSelectors: [
        '[data-testid="application-success"]',
        '.application-success',
        '.ashby-application-success',
      ],
      confirmationTexts: [
        'application submitted',
        'thanks for applying',
        'we have received your application',
        'thank you for applying',
      ],
    });
  }

  canHandle(url: string, html?: string): boolean {
    if (url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com')) {
      return true;
    }
    if (html && (html.includes('ashby') || html.includes('__NEXT_DATA__') && html.includes('ashbyhq'))) {
      return true;
    }
    return false;
  }

  override async detectFields(page: Page): Promise<FormField[]> {
    let fields = await super.detectFields(page);
    if (fields.length > 0) return fields;

    // Ashby job pages often open on the Overview tab and require clicking "Apply for this job"
    const applyTriggers = [
      'a:has-text("Apply for this job")',
      'button:has-text("Apply for this job")',
      '[role="tab"]:has-text("Apply")',
      'a[href*="#application"]',
      'button:has-text("Apply")',
    ];
    for (const sel of applyTriggers) {
      const btn = await page.$(sel).catch(() => null);
      if (btn) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(900);
        fields = await super.detectFields(page);
        if (fields.length > 0) break;
      }
    }
    return fields;
  }
}
