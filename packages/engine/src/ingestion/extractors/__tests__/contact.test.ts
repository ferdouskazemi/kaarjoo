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
          ایمیل: jane.doe@example.com
          شماره تماس: +1 415 555 0199
          پروفایل لینکدین: https://www.linkedin.com/in/ferdous-kazemi
          گیت‌هاب: https://github.com/ferdouskazemi
          کابل، افغانستان
        `,
      },
    ];

    const contact = extractContactInfo(rawPages);
    expect(contact).not.toBeNull();
    expect(contact?.fullName).toContain('فردوس کاظمی');
    expect(contact?.email).toBe('jane.doe@example.com');
    expect(contact?.phone).toBe('+1 415 555 0199');
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

  it('returns undefined for missing email and phone instead of fabricating personal defaults', () => {
    const contact = extractContactInfo([
      {
        pageNumber: 1,
        text: `
          Jane Doe
          Senior Frontend Developer
        `,
      },
    ]);
    expect(contact?.fullName).toBe('Jane Doe');
    expect(contact?.email).toBeUndefined();
    expect(contact?.phone).toBeUndefined();
  });
});
