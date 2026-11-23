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
});
