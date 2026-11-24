import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { detectFieldsFromHtml } from '../detector.js';

describe('ATS Form Field Detector', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');

  it('detects Greenhouse form fields accurately', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'greenhouse_mock.html'), 'utf-8');
    const fields = detectFieldsFromHtml(html);

    expect(fields.length).toBeGreaterThanOrEqual(8);
    const fieldMap = new Map(fields.map((f) => [f.canonicalField, f]));

    expect(fieldMap.get('first_name')).toBeDefined();
    expect(fieldMap.get('first_name')?.required).toBe(true);

    expect(fieldMap.get('last_name')).toBeDefined();
    expect(fieldMap.get('email')).toBeDefined();
    expect(fieldMap.get('phone')).toBeDefined();
    expect(fieldMap.get('resume')).toBeDefined();
    expect(fieldMap.get('cover_letter')).toBeDefined();
    expect(fieldMap.get('work_authorization')).toBeDefined();
    expect(fieldMap.get('eeo_gender')).toBeDefined();
  });

  it('detects Lever form fields accurately', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'lever_mock.html'), 'utf-8');
    const fields = detectFieldsFromHtml(html);

    expect(fields.length).toBeGreaterThanOrEqual(6);
    const fieldMap = new Map(fields.map((f) => [f.canonicalField, f]));

    expect(fieldMap.get('full_name')).toBeDefined();
    expect(fieldMap.get('email')).toBeDefined();
    expect(fieldMap.get('phone')).toBeDefined();
    expect(fieldMap.get('current_company')).toBeDefined();
    expect(fieldMap.get('resume')).toBeDefined();
    expect(fieldMap.get('linkedin')).toBeDefined();
    expect(fieldMap.get('github')).toBeDefined();
  });

  it('detects Ashby form fields accurately', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'ashby_mock.html'), 'utf-8');
    const fields = detectFieldsFromHtml(html);

    expect(fields.length).toBe(4);
    const fieldMap = new Map(fields.map((f) => [f.canonicalField, f]));

    expect(fieldMap.get('full_name')).toBeDefined();
    expect(fieldMap.get('email')).toBeDefined();
    expect(fieldMap.get('phone')).toBeDefined();
    expect(fieldMap.get('resume')).toBeDefined();
  });

  it('detects Workable form fields accurately', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'workable_mock.html'), 'utf-8');
    const fields = detectFieldsFromHtml(html);

    expect(fields.length).toBe(6);
    const fieldMap = new Map(fields.map((f) => [f.canonicalField, f]));

    expect(fieldMap.get('first_name')).toBeDefined();
    expect(fieldMap.get('last_name')).toBeDefined();
    expect(fieldMap.get('email')).toBeDefined();
    expect(fieldMap.get('phone')).toBeDefined();
    expect(fieldMap.get('resume')).toBeDefined();
  });
});
