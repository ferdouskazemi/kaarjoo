import path from 'node:path';
// @ts-ignore
import mammoth from 'mammoth';
import { ParsedDocument, ParsedPage, ParsedBlock } from './types.js';

export async function parseDocxFile(filePath: string): Promise<ParsedDocument> {
  const fileName = path.basename(filePath);
  const result = await mammoth.extractRawText({ path: filePath });
  const rawText = result.value || '';
  const lines = rawText.split(/\r?\n/).filter(Boolean);

  const blocks: ParsedBlock[] = lines.map((line: string, idx: number) => ({
    text: line,
    page: 1,
    bbox: {
      x: 0,
      y: idx * 18,
      width: line.length * 8,
      height: 18,
    },
  }));

  const pages: ParsedPage[] = [
    {
      pageNumber: 1,
      text: rawText,
      blocks,
    },
  ];

  return {
    filePath,
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pageCount: 1,
    isScanned: false,
    pages,
    rawText,
  };
}
