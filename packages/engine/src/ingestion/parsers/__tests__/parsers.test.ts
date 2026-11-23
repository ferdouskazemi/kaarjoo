import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument, parseTextFile } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleResumePath = path.resolve(__dirname, '../../../../../../eval/resumes/resume_01_fa_standard.txt');

describe('Multi-Format Document Parsers', () => {
  it('parses text files and extracts structured lines and bounding boxes', async () => {
    const doc = await parseTextFile(sampleResumePath);
    expect(doc).toBeDefined();
    expect(doc.pageCount).toBe(1);
    expect(doc.isScanned).toBe(false);
    expect(doc.pages.length).toBe(1);
    expect(doc.pages[0].blocks.length).toBeGreaterThan(5);

    const firstBlock = doc.pages[0].blocks[0];
    expect(firstBlock.text).toContain('فردوس کاظمی');
    expect(firstBlock.bbox.width).toBeGreaterThan(0);
    expect(firstBlock.bbox.height).toBeGreaterThan(0);
  });

  it('routes correctly via unified parseDocument', async () => {
    const doc = await parseDocument(sampleResumePath);
    expect(doc.fileName).toBe('resume_01_fa_standard.txt');
    expect(doc.rawText).toContain('کابل');
  });
});
