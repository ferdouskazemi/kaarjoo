import fs from 'node:fs';
import path from 'node:path';
import type { ParsedBlock, ParsedDocument, ParsedPage } from './types.js';

/**
 * Extracts readable UTF-16LE (English + Persian/Arabic) and ASCII text runs from legacy binary .doc files.
 */
export function extractTextFromDocBinary(buffer: Buffer): string {
  const runs: string[] = [];

  // 1. Scan UTF-16LE character runs (Word stores non-ASCII and modern .doc text as UTF-16LE)
  let current = '';
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    const code = buffer.readUInt16LE(i);
    const isPrintable =
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0x0600 && code <= 0x06ff) || // Persian / Arabic
      code === 0x200c; // ZWNJ

    if (isPrintable) {
      current += code === 0x0d ? '\n' : String.fromCharCode(code);
    } else {
      if (current.trim().length >= 6 && /[A-Za-z\u0600-\u06FF]{3,}/.test(current)) {
        runs.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length >= 6 && /[A-Za-z\u0600-\u06FF]{3,}/.test(current)) {
    runs.push(current.trim());
  }

  // 2. Fallback ASCII runs for older 8-bit Word 97 sections if UTF-16LE runs were sparse
  if (runs.join(' ').length < 80) {
    const asciiText = buffer.toString('latin1');
    const matches = asciiText.match(/[A-Za-z0-9@.+_\-,:;()/| \r\n]{12,}/g) || [];
    for (const m of matches) {
      const cleaned = m.replace(/\r/g, '\n').trim();
      if (
        cleaned.length >= 12 &&
        !/Microsoft Word|Word\.Document|Root Entry|SummaryInformation/i.test(cleaned) &&
        /[A-Za-z]{3,}/.test(cleaned)
      ) {
        runs.push(cleaned);
      }
    }
  }

  return Array.from(new Set(runs))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseDocFile(filePath: string): Promise<ParsedDocument> {
  const buf = fs.readFileSync(filePath);
  const rawText = extractTextFromDocBinary(buf);
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const blocks: ParsedBlock[] = lines.map((line, idx) => ({
    text: line,
    page: 1,
    bbox: { x: 0, y: idx * 18, width: Math.max(40, line.length * 8), height: 18 },
  }));

  const pages: ParsedPage[] = [{ pageNumber: 1, text: rawText, blocks }];

  return {
    filePath,
    fileName: path.basename(filePath),
    mimeType: 'application/msword',
    pageCount: 1,
    isScanned: false,
    pages,
    rawText,
  };
}
