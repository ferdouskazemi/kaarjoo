import { describe, it, expect } from 'vitest';
import { extractEducation } from '../education.js';
import { extractSkills } from '../skills.js';

describe('Education Extractor', () => {
  it('extracts Persian education items with Jalali dates', () => {
    const text = `
      کارشناسی مهندسی نرم‌افزار | دانشگاه کابل
      ۱۳۹۲ تا ۱۳۹۶
    `;

    const items = extractEducation(text);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].degree).toBe('bachelor');
    expect(items[0].institution).toContain('دانشگاه کابل');
    expect(items[0].startDate).toBe('1392');
    expect(items[0].endDate).toBe('1396');
  });

  it('extracts English education items with Gregorian dates', () => {
    const text = `
      Bachelor of Science in Computer Science - Herat University
      2015 to 2019
    `;

    const items = extractEducation(text);
    expect(items.length).toBe(1);
    expect(items[0].degree).toBe('bachelor');
    expect(items[0].institution).toContain('Herat University');
    expect(items[0].startDate).toBe('2015');
    expect(items[0].endDate).toBe('2019');
  });
});

describe('Skills Extractor with Taxonomy', () => {
  it('maps Persian and English skill aliases to canonical taxonomy', () => {
    const text = `
      مهارت‌های فنی:
      تسلط به ری‌اکت و پایتون و نودجی‌اس
      همچنین تجربه‌ی کار با Docker, PostgreSQL, و Redis
    `;

    const skills = extractSkills(text);
    const names = skills.map((s) => s.name);

    expect(names).toContain('React');
    expect(names).toContain('Python');
    expect(names).toContain('Node.js');
    expect(names).toContain('Docker');
    expect(names).toContain('PostgreSQL');
    expect(names).toContain('Redis');
  });
});
