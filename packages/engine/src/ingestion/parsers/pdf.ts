import fs from 'node:fs';
import path from 'node:path';
import { ParsedDocument, ParsedPage, ParsedBlock } from './types.js';

export async function parsePdfFile(filePath: string): Promise<ParsedDocument> {
  const fileName = path.basename(filePath);
  const data = new Uint8Array(fs.readFileSync(filePath));

  // Dynamic import of pdfjs-dist legacy build for Node.js compatibility
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const pages: ParsedPage[] = [];
  let totalCharacters = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const blocks: ParsedBlock[] = [];
    const textPieces: string[] = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim().length > 0) {
        const str = item.str;
        textPieces.push(str);

        const tx = item.transform[4] || 0;
        const ty = item.transform[5] || 0;
        const width = item.width || (str.length * 7);
        const height = item.height || 12;

        // Convert PDF coordinates (bottom-left) to standard screen coordinates (top-left)
        const screenY = Math.max(0, viewport.height - ty - height);

        blocks.push({
          text: str,
          page: pageNum,
          bbox: {
            x: Math.round(tx),
            y: Math.round(screenY),
            width: Math.round(width),
            height: Math.round(height),
          },
          fontSize: Math.round(item.height || 12),
        });
      }
    }

    const pageText = textPieces.join(' ');
    totalCharacters += pageText.length;

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      blocks,
    });
  }

  // Scanned heuristic: average characters per page < 50 implies scanned image PDF
  const isScanned = numPages > 0 && (totalCharacters / numPages) < 50;

  const rawText = pages.map((p) => p.text).join('\n\n');

  return {
    filePath,
    fileName,
    mimeType: 'application/pdf',
    pageCount: numPages,
    isScanned,
    pages,
    rawText,
  };
}
