import { BaseAtsFiller } from './base.js';

export class WorkableFiller extends BaseAtsFiller {
  constructor() {
    super({
      atsType: 'workable',
      name: 'Workable',
      submitButtonSelectors: [
        'button[data-ui="submit-application"]',
        'button[data-ui="overview-submit-application"]',
        'button[type="submit"]',
        'button:has-text("Submit application")',
      ],
      confirmationSelectors: [
        '[data-ui="application-success"]',
        '.application-success',
        '.success-screen',
      ],
      confirmationTexts: [
        'application sent',
        'thank you for applying',
        'your application was sent successfully',
        'received your application',
      ],
    });
  }

  canHandle(url: string, html?: string): boolean {
    if (url.includes('workable.com') || url.includes('apply.workable.com')) {
      return true;
    }
    if (html && (html.includes('workable.com') || html.includes('data-ui="submit-application"'))) {
      return true;
    }
    return false;
  }
}
