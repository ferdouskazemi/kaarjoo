import path from 'node:path';
import { ParsedDocument } from './types.js';
import { parsePdfFile } from './pdf.js';
import { parseDocxFile } from './docx.js';
import { parseDocFile } from './doc.js';
import { parseOdtFile } from './odt.js';
import { parseRtfFile } from './rtf.js';
import { parseImageFile } from './ocr.js';
import { parseTextFile } from './text.js';

export * from './types.js';
export * from './pdf.js';
export * from './docx.js';
export * from './doc.js';
export * from './odt.js';
export * from './rtf.js';
export * from './ocr.js';
export * from './text.js';

export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdfFile(filePath);
    case '.docx':
      return parseDocxFile(filePath);
    case '.doc':
      return parseDocFile(filePath);
    case '.odt':
      return parseOdtFile(filePath);
    case '.rtf':
      return parseRtfFile(filePath);
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.bmp':
    case '.tiff':
      return parseImageFile(filePath);
    case '.txt':
    case '.md':
    default:
      return parseTextFile(filePath);
  }
}
