import { describe, it, expect } from 'vitest';
import { extractProfileFromParsedDocument } from '../pipeline.js';
import type { ParsedDocument } from '../parsers/index.js';

describe('Prompt 6 Provenance & Profile Issues', () => {
  it('attaches structured provenance with charStart/charEnd/page and streams profile.progress stages', async () => {
    const rawText = [
      'Ferdous Kazemi',
      'Email: ferdous.k@example.com',
      'Phone: +1 555 010 0199',
      'Summary',
      'Experienced TypeScript and Rust developer.',
      'Experience',
      'Acme Corp - Senior Engineer',
      '2021 to Present',
      '• Built scalable APIs',
      'Skills',
      'TypeScript, Rust, React, Node.js, SQLite',
    ].join('\n');

    const doc: ParsedDocument = {
      filePath: 'resume.txt',
      fileName: 'resume.txt',
      mimeType: 'text/plain',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: rawText, blocks: [] }],
      rawText,
      isScanned: false,
    };

    const stages: string[] = [];
    const res = await extractProfileFromParsedDocument(doc, {
      useLlm: false,
      sourceFileId: 'src_test_1',
      onProgress: (ev) => stages.push(ev.stage),
    });

    expect(stages).toEqual(['sections', 'facts']);
    const emailProv = res.profile.fieldProvenance?.['contact.email'];
    expect(emailProv).toBeDefined();
    expect(emailProv?.value).toBe('ferdous.k@example.com');
    expect(emailProv?.method).toBe('rule');
    expect(emailProv?.evidence?.sourceFileId).toBe('src_test_1');
    expect(emailProv?.evidence?.page).toBe(1);
    expect(emailProv?.evidence?.charStart).toBeGreaterThanOrEqual(0);
    expect(emailProv?.evidence?.text).toBe('ferdous.k@example.com');
  });

  it('produces blocker and warning issues[] for missing contact, low skills, empty summary, and low OCR confidence', async () => {
    const rawText = ['Unknown Candidate', 'Skills', 'TypeScript'].join('\n');
    const doc: ParsedDocument = {
      filePath: 'scan.png',
      fileName: 'scan.png',
      mimeType: 'image/png',
      pageCount: 1,
      pages: [{ pageNumber: 1, text: rawText, blocks: [] }],
      rawText,
      isScanned: true,
      ocrConfidence: 0.45,
    };

    const res = await extractProfileFromParsedDocument(doc, {
      useLlm: false,
      sourceFileId: 'src_scan_1',
    });

    const keys = res.issues.map((i) => i.messageKey);
    expect(keys).toContain('profile.issue.missingEmail');
    expect(keys).toContain('profile.issue.missingPhone');
    expect(keys).toContain('profile.issue.noExperienceOrEducation');
    expect(keys).toContain('profile.issue.emptySummary');
    expect(keys).toContain('profile.issue.fewSkills');
    expect(keys).toContain('profile.issue.lowOcrConfidence');
  });
});
