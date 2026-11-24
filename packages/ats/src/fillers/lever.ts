import { BaseAtsFiller } from './base.js';

export class LeverFiller extends BaseAtsFiller {
  constructor() {
    super({
      atsType: 'lever',
      name: 'Lever',
      submitButtonSelectors: [
        'button.postings-btn[type="submit"]',
        '#btn-submit',
        'button[data-qa="btn-submit"]',
        'button[type="submit"]',
      ],
      confirmationSelectors: [
        '.application-confirmation',
        '.confirmation-message',
        'div[data-qa="confirmation-page"]',
      ],
      confirmationTexts: [
        'application submitted',
        'thank you for applying',
        'application has been submitted',
        'received your application',
      ],
    });
  }

  canHandle(url: string, html?: string): boolean {
    if (url.includes('lever.co') || url.includes('jobs.lever.co')) {
      return true;
    }
    if (html && (html.includes('lever.co') || html.includes('data-qa="btn-submit"') || html.includes('urls[LinkedIn]'))) {
      return true;
    }
    return false;
  }
}
