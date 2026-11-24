import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parsePdfBuffer } from '../documentParser.js';

describe('Document Parser Engine', () => {
  it('parses real PDF file into clean text without raw PDF stream bytecode', async () => {
    const resumePath = 'C:/Users/Ferdous Kazemi/Downloads/Telegram Desktop/Ferdous Kazemi Resume (april 2025).pdf';
    if (!fs.existsSync(resumePath)) {
      console.log('Skipping real file test: file not at specified path');
      return;
    }

    const buffer = fs.readFileSync(resumePath).buffer;
    const result = await parsePdfBuffer(buffer);

    expect(result.fileType).toBe('pdf');
    expect(result.pageCount).toBe(2);
    expect(result.text.length).toBeGreaterThan(500);

    // Verify it contains real human words from the user's resume
    expect(result.text).toContain('FERDOUS KAZEMI');
    expect(result.text).toContain('ferdouskazemi1000@gmail.com');
    expect(result.text).toContain('Mid-Level Front-End Developer');
    expect(result.text).toContain('INOLITIX');

    // Ensure raw PDF bytecode artifacts are NOT present
    expect(result.text).not.toContain('%PDF-');
    expect(result.text).not.toContain('FlateDecode');
    expect(result.text).not.toContain('Type/Catalog');
    expect(result.text).not.toContain('endobj');
  });
});
