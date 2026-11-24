import { describe, it, expect } from 'vitest';
import { extractContactInfo } from '../contact.js';

describe('Deterministic Contact Extractor', () => {
  it('extracts email, phone, and links from typical resume header text', () => {
    const rawPages = [
      {
        pageNumber: 1,
        text: `
          فردوس کاظمی
          مهندس نرم‌افزار ارشد
          ایمیل: ferdouskazemi1000@gmail.com
          شماره تماس: +93 728 200 021
          پروفایل لینکدین: https://www.linkedin.com/in/ferdous-kazemi
          گیت‌هاب: https://github.com/ferdouskazemi
          کابل، افغانستان
        `,
      },
    ];

    const contact = extractContactInfo(rawPages);
    expect(contact).not.toBeNull();
    expect(contact?.fullName).toContain('فردوس کاظمی');
    expect(contact?.email).toBe('ferdouskazemi1000@gmail.com');
    expect(contact?.phone).toBe('+93 72 820 0021');
    expect(contact?.linkedinUrl).toBe('https://www.linkedin.com/in/ferdous-kazemi');
    expect(contact?.githubUrl).toBe('https://github.com/ferdouskazemi');
  });

  it('correctly parses Iranian phone numbers with Persian numerals', () => {
    const rawPages = [
      {
        pageNumber: 1,
        text: `
          علی رضایی
          ali.rezaei@test.ir
          شماره همراه: ۰۹۱۲۳۴۵۶۷۸۹
        `,
      },
    ];

    const contact = extractContactInfo(rawPages);
    expect(contact).not.toBeNull();
    expect(contact?.email).toBe('ali.rezaei@test.ir');
    expect(contact?.phone).toBe('+98 912 345 6789');
  });
});
