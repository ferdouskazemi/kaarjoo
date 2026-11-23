import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeDigits, normalizePersianLetters } from '../normalizer.js';
import { detectSectionType } from '../sections.js';

describe('Ingestion Text Normalizer', () => {
  it('converts Arabic letters (Kaf, Yeh) to Persian equivalents', () => {
    const raw = 'كتابخانه دانشگاهي';
    const normalized = normalizePersianLetters(raw);
    expect(normalized).toBe('کتابخانه دانشگاهی');
  });

  it('normalizes Persian and Arabic numerals to Latin digits', () => {
    const raw = 'سال ۱۳۷۹ تا ۱۴۰۲ و ١٢٣';
    const normalized = normalizeDigits(raw);
    expect(normalized).toBe('سال 1379 تا 1402 و 123');
  });

  it('cleans excessive spacing and unifies text', () => {
    const raw = '   مهارت‌های   برنامه‌نویسی  \n\n\n\n  جاوااسکریپت   ';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('مهارت‌های برنامه‌نویسی\n\nجاوااسکریپت');
  });
});

describe('Section Heading Detector', () => {
  it('identifies Persian section headings accurately', () => {
    expect(detectSectionType('سوابق شغلی')).toBe('experience');
    expect(detectSectionType('تجربه‌های کاری')).toBe('experience');
    expect(detectSectionType('تحصیلات و آموزش')).toBe('education');
    expect(detectSectionType('مهارت‌های فنی')).toBe('skills');
    expect(detectSectionType('اطلاعات تماس')).toBe('contact');
    expect(detectSectionType('زبان‌های خارجی')).toBe('languages');
  });

  it('identifies English section headings accurately', () => {
    expect(detectSectionType('Work Experience')).toBe('experience');
    expect(detectSectionType('Education')).toBe('education');
    expect(detectSectionType('Technical Skills')).toBe('skills');
    expect(detectSectionType('Professional Summary')).toBe('summary');
    expect(detectSectionType('Contact Information')).toBe('contact');
  });
});
