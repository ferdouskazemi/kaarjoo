import { Page } from 'playwright-core';
import * as cheerio from 'cheerio';
import { FormField, FormFieldType, FormFieldOption } from '@kaarjoo/shared';
import { identifyCanonicalField } from './matcher.js';
import { CaptchaCheckResult } from './types.js';

/**
 * Checks whether the page contains an active CAPTCHA or anti-bot challenge.
 * We adhere to strict behavioral rules: NEVER bypass or solve CAPTCHAs.
 */
export async function detectCaptchaInPage(page: Page): Promise<CaptchaCheckResult> {
  const captchaSelectors = [
    { type: 'recaptcha' as const, selector: 'iframe[src*="google.com/recaptcha"], iframe[src*="recaptcha/api"], .g-recaptcha, #g-recaptcha' },
    { type: 'turnstile' as const, selector: 'iframe[src*="cloudflare.com/cdn-cgi/challenge-platform"], iframe[src*="challenges.cloudflare.com"], .cf-turnstile' },
    { type: 'hcaptcha' as const, selector: 'iframe[src*="hcaptcha.com"], .h-captcha' },
    { type: 'arkose' as const, selector: 'iframe[src*="arkoselabs"], iframe[src*="funcaptcha"]' },
  ];

  for (const item of captchaSelectors) {
    try {
      const el = await page.$(item.selector);
      if (el) {
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          return { detected: true, type: item.type, selector: item.selector };
        }
      }
    } catch {
      // Ignore evaluation errors
    }
  }

  // Text-based bot check heuristics
  try {
    const textContent = await page.evaluate(() => document.body?.innerText || '');
    if (
      /verify you are human|prove you are not a robot|security check to proceed|cloudflare ray id/i.test(
        textContent
      )
    ) {
      return { detected: true, type: 'generic' };
    }
  } catch {
    // Ignore
  }

  return { detected: false };
}

/**
 * Checks whether the page requires the user to log in or create an account.
 */
export async function detectLoginWall(page: Page): Promise<{ detected: boolean; reason?: string }> {
  try {
    const hasPassword = await page.$('input[type="password"]');
    if (hasPassword && (await hasPassword.isVisible())) {
      return { detected: true, reason: 'Password input detected' };
    }

    const textContent = await page.evaluate(() => document.body?.innerText || '');
    if (
      /sign in to apply|please log in to continue|already have an account\? log in/i.test(textContent) &&
      !/first name|resume|upload/i.test(textContent)
    ) {
      return { detected: true, reason: 'Login wall text detected' };
    }
  } catch {
    // Ignore
  }

  return { detected: false };
}

/**
 * Detects all interactive form fields on a live Playwright page.
 */
export async function detectFieldsFromPage(page: Page): Promise<FormField[]> {
  const fields = await page.evaluate(() => {
    const results: Array<{
      id: string;
      name: string;
      label: string;
      type: string;
      selector: string;
      required: boolean;
      placeholder?: string;
      options?: Array<{ label: string; value: string }>;
    }> = [];

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select'
      )
    );

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const tagName = el.tagName.toLowerCase();
      let inputType = 'text';

      if (tagName === 'textarea') {
        inputType = 'textarea';
      } else if (tagName === 'select') {
        inputType = 'select';
      } else {
        inputType = (el.getAttribute('type') || 'text').toLowerCase();
      }

      const id = el.getAttribute('id') || `field_${i}`;
      const name = el.getAttribute('name') || id;
      const placeholder = el.getAttribute('placeholder') || '';
      const required =
        el.hasAttribute('required') ||
        el.getAttribute('aria-required') === 'true' ||
        (el.parentElement?.textContent || '').includes('*');

      // Find label
      let label = '';
      if (el.getAttribute('id')) {
        const labelEl = document.querySelector(`label[for="${el.getAttribute('id')}"]`);
        if (labelEl) label = labelEl.textContent || '';
      }
      if (!label && el.closest('label')) {
        label = el.closest('label')?.textContent || '';
      }
      if (!label && el.getAttribute('aria-label')) {
        label = el.getAttribute('aria-label') || '';
      }
      if (!label && el.getAttribute('aria-labelledby')) {
        const labelledBy = document.getElementById(el.getAttribute('aria-labelledby') || '');
        if (labelledBy) label = labelledBy.textContent || '';
      }
      if (!label) {
        // Look at previous sibling or parent element heading
        const prev = el.previousElementSibling;
        if (prev && (prev.tagName.toLowerCase() === 'label' || prev.tagName.toLowerCase() === 'span')) {
          label = prev.textContent || '';
        }
      }

      label = label.replace(/\s+/g, ' ').replace(/\*/g, '').trim();

      // Collect options if select element
      let options: Array<{ label: string; value: string }> | undefined;
      if (tagName === 'select') {
        const selectEl = el as HTMLSelectElement;
        options = Array.from(selectEl.options).map((opt) => ({
          label: (opt.textContent || opt.value).trim(),
          value: opt.value,
        }));
      }

      let selector = '';
      if (el.getAttribute('id')) {
        selector = `#${el.getAttribute('id')}`;
      } else if (el.getAttribute('name')) {
        selector = `${tagName}[name="${el.getAttribute('name')}"]`;
      } else {
        selector = `${tagName}:nth-of-type(${i + 1})`;
      }

      results.push({
        id,
        name,
        label: label || placeholder || name,
        type: inputType,
        selector,
        required,
        placeholder,
        options,
      });
    }

    return results;
  });

  return fields.map((f) => {
    let type: FormFieldType = 'text';
    if (['textarea', 'select', 'radio', 'checkbox', 'file', 'email', 'tel', 'url', 'date', 'number'].includes(f.type)) {
      type = f.type as FormFieldType;
    }

    const field: FormField = {
      id: f.id,
      name: f.name,
      label: f.label,
      type,
      selector: f.selector,
      required: f.required,
      placeholder: f.placeholder,
      options: f.options,
    };
    field.canonicalField = identifyCanonicalField(field);
    return field;
  });
}

/**
 * Detects form fields from raw HTML (used in unit testing and headless HTML parsing).
 */
export function detectFieldsFromHtml(html: string): FormField[] {
  const $ = cheerio.load(html);
  const fields: FormField[] = [];

  $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select').each(
    (i, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();
      let inputType = 'text';

      if (tagName === 'textarea') {
        inputType = 'textarea';
      } else if (tagName === 'select') {
        inputType = 'select';
      } else {
        inputType = ($el.attr('type') || 'text').toLowerCase();
      }

      let type: FormFieldType = 'text';
      if (['textarea', 'select', 'radio', 'checkbox', 'file', 'email', 'tel', 'url', 'date', 'number'].includes(inputType)) {
        type = inputType as FormFieldType;
      }

      const id = $el.attr('id') || `field_${i}`;
      const name = $el.attr('name') || id;
      const placeholder = $el.attr('placeholder') || '';
      const required =
        $el.attr('required') !== undefined ||
        $el.attr('aria-required') === 'true' ||
        $el.parent().text().includes('*');

      let label = '';
      if ($el.attr('id')) {
        label = $(`label[for="${$el.attr('id')}"]`).text() || '';
      }
      if (!label && $el.closest('label').length > 0) {
        label = $el.closest('label').text() || '';
      }
      if (!label && $el.attr('aria-label')) {
        label = $el.attr('aria-label') || '';
      }
      if (!label) {
        const prev = $el.prev();
        if (prev.length > 0 && ['label', 'span', 'p'].includes(prev.prop('tagName')?.toLowerCase() || '')) {
          label = prev.text() || '';
        }
      }

      label = label.replace(/\s+/g, ' ').replace(/\*/g, '').trim();

      let options: FormFieldOption[] | undefined;
      if (tagName === 'select') {
        options = [];
        $el.find('option').each((_, opt) => {
          options!.push({
            label: ($(opt).text() || $(opt).attr('value') || '').trim(),
            value: $(opt).attr('value') || '',
          });
        });
      }

      let selector = '';
      if ($el.attr('id')) {
        selector = `#${$el.attr('id')}`;
      } else if ($el.attr('name')) {
        selector = `${tagName}[name="${$el.attr('name')}"]`;
      } else {
        selector = `${tagName}:nth-of-type(${i + 1})`;
      }

      const field: FormField = {
        id,
        name,
        label: label || placeholder || name,
        type,
        selector,
        required,
        placeholder,
        options,
      };
      field.canonicalField = identifyCanonicalField(field);
      fields.push(field);
    }
  );

  return fields;
}
