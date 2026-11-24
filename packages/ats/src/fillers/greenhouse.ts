import { BaseAtsFiller } from './base.js';

export class GreenhouseFiller extends BaseAtsFiller {
  constructor() {
    super({
      atsType: 'greenhouse',
      name: 'Greenhouse',
      submitButtonSelectors: [
        '#submit_app',
        'button[data-qa="submit-button"]',
        'input[type="submit"][value*="Submit"]',
        'button[type="submit"]',
      ],
      confirmationSelectors: [
        '#application_confirmation',
        '.application-confirmation',
        'div[data-qa="confirmation"]',
      ],
      confirmationTexts: [
        'thank you for applying',
        'application submitted',
        'we have received your application',
        'your application has been submitted',
      ],
    });
  }

  canHandle(url: string, html?: string): boolean {
    if (url.includes('greenhouse.io') || url.includes('gh_src') || url.includes('grnh.se')) {
      return true;
    }
    if (html && (html.includes('greenhouse') || html.includes('job_application[first_name]') || html.includes('id="submit_app"'))) {
      return true;
    }
    return false;
  }
}
