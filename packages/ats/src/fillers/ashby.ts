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
}
