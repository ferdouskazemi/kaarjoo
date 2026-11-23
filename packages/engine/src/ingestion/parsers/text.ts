import fs from 'node:fs';
import path from 'node:path';
import { ParsedDocument, ParsedPage, ParsedBlock } from './types.js';

export async function parseTextFile(filePath: string): Promise<ParsedDocument> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const lines = content.split(/\r?\n/);

  const blocks: ParsedBlock[] = lines.map((line, idx) => ({
    text: line,
    page: 1,
    bbox: {
      x: 0,
      y: idx * 16,
      width: line.length * 8,
      height: 16,
    },
  }));

  const pages: ParsedPage[] = [
    {
      pageNumber: 1,
      text: content,
      blocks,
    },
  ];

  return {
    filePath,
    fileName,
    mimeType: 'text/plain',
    pageCount: 1,
    isScanned: false,
    pages,
    rawText: content,
  };
}
