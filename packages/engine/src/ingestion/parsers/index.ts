import path from 'node:path';
import { ParsedDocument } from './types.js';
import { parsePdfFile } from './pdf.js';
import { parseDocxFile } from './docx.js';
import { parseTextFile } from './text.js';

export * from './types.js';
export * from './pdf.js';
export * from './docx.js';
export * from './text.js';

export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdfFile(filePath);
    case '.docx':
      return parseDocxFile(filePath);
    case '.txt':
    case '.md':
    case '.rtf':
    case '.odt':
    default:
      return parseTextFile(filePath);
  }
}
