import { describe, it, expect } from 'vitest';
import { extractExperiences } from '../experience.js';

describe('Deterministic Experience Extractor', () => {
  it('extracts Persian Jalali experience items and achievements', () => {
    const sectionText = `
      توسعه‌دهنده ارشد نرم‌افزار | شرکت داده‌پردازی نوین
      ۱۳۹۹ تا اکنون
      • رهبری تیم فرانت‌اند ۵ نفره در پیاده‌سازی پلتفرم پرداخت
      • بهبود سرعت بارگذاری وبسایت تا ۴۵٪ با استراتژی‌های کشینگ
      
      برنامه‌نویس ری‌اکت | استارتاپ هوشمند
      ۱۳۹۷ تا ۱۳۹۹
      - توسعه بیش از ۲۰ ماژول اختصاصی با TypeScript
    `;

    const items = extractExperiences(sectionText);
    expect(items.length).toBeGreaterThanOrEqual(1);

    const first = items[0];
    expect(first.startDate).toBe('1399');
    expect(first.isCurrent).toBe(true);
    expect(first.achievements.length).toBe(2);
    expect(first.achievements[0]).toContain('رهبری تیم');
  });

  it('extracts English Gregorian experience items', () => {
    const sectionText = `
      Senior Backend Engineer - Tech Corp
      2021 to 2023
      * Designed scalable microservices using Node.js and PostgreSQL
      * Reduced database query latencies by 30%
    `;

    const items = extractExperiences(sectionText);
    expect(items.length).toBe(1);
    expect(items[0].startDate).toBe('2021');
    expect(items[0].endDate).toBe('2023');
    expect(items[0].achievements.length).toBe(2);
  });

  it('extracts two-line company-first header without fabricating placeholder Company or Software Engineer', () => {
    const sectionText = `
      INOLITIX, CA, United States — 2022 – Present
      Part-time Front-End Developer • UI & UX WordPress Designer (Aug 2022 – Current)
      • Built responsive marketing and web applications
    `;

    const items = extractExperiences(sectionText);
    expect(items.length).toBe(1);
    expect(items[0].company).toBe('INOLITIX');
    expect(items[0].location).toBe('CA, United States');
    expect(items[0].title).toContain('Front-End Developer');
    expect(items[0].company).not.toBe('Company');
    expect(items[0].title).not.toBe('Software Engineer');
    expect(items[0].isCurrent).toBe(true);
  });
});
