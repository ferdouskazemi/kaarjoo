import { BaseAtsFiller } from './base.js';

export class GenericFormFiller extends BaseAtsFiller {
  constructor() {
    super({
      atsType: 'generic',
      name: 'Generic Form Filler',
      submitButtonSelectors: [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
        'button:has-text("Apply Now")',
        'button:has-text("Send Application")',
        'button:has-text("ارسال")',
      ],
      confirmationSelectors: [
        '.application-success',
        '.confirmation-message',
        '#success',
        '.success',
      ],
      confirmationTexts: [
        'thank you for applying',
        'application submitted',
        'application received',
        'we have received your application',
        'application sent',
        'با تشکر، درخواست شما با موفقیت ارسال شد',
      ],
    });
  }

  canHandle(_url: string, _html?: string): boolean {
    return true; // Fallback for all URLs
  }
}
