import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ParsedDocument, ParsedPage, ParsedBlock } from './types.js';

function resolvePdfWorkerSrc(): string | undefined {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(__dirname, 'pdf.worker.mjs'),
    process.env.KAARJOO_RESOURCES_DIR
      ? path.resolve(process.env.KAARJOO_RESOURCES_DIR, 'engine', 'pdf.worker.mjs')
      : '',
    path.resolve(__dirname, '../../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
    path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }
  return undefined;
}

export async function parsePdfFile(filePath: string): Promise<ParsedDocument> {
  const fileName = path.basename(filePath);
  const data = new Uint8Array(fs.readFileSync(filePath));

  // Dynamic import of pdfjs-dist legacy build for Node.js compatibility
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerSrc = resolvePdfWorkerSrc();
  if (workerSrc && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

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

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim().length > 0) {
        const str = item.str;
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

    // Reconstruct visual reading lines sorted top-to-bottom (grouping fragments sharing a baseline)
    const rowBuckets: Array<{ y: number; items: ParsedBlock[] }> = [];
    const ySorted = [...blocks].sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
    for (const blk of ySorted) {
      const existing = rowBuckets.find((row) => Math.abs(row.y - blk.bbox.y) <= 5);
      if (existing) {
        existing.items.push(blk);
      } else {
        rowBuckets.push({ y: blk.bbox.y, items: [blk] });
      }
    }

    const linesText = rowBuckets.map((row) => {
      const rowItems = [...row.items].sort((a, b) => a.bbox.x - b.bbox.x);
      let line = '';
      let prevEnd = -Infinity;
      for (const item of rowItems) {
        const txt = item.text.trim();
        if (!txt) continue;
        if (!line) {
          line = txt;
        } else {
          const gap = item.bbox.x - prevEnd;
          // Small kerning gaps (<= 1.8px) belong to the same word/year (e.g. "202"+"2", "My"+"SQL")
          line += gap <= 2 ? txt : ` ${txt}`;
        }
        prevEnd = item.bbox.x + item.bbox.width;
      }
      return line.trim();
    }).filter(Boolean);

    const pageText = linesText.join('\n');
    totalCharacters += pageText.length;

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      blocks,
    });
  }

  // Scanned heuristic: average characters per page < 50 implies scanned image PDF
  const isScanned = numPages > 0 && (totalCharacters / numPages) < 50;

  let finalPages = pages;
  if (isScanned) {
    try {
      const { ocrScannedPdfPages } = await import('./ocr.js');
      const ocrPages = await ocrScannedPdfPages(filePath);
      if (ocrPages.length > 0 && ocrPages.some((p) => p.text.trim().length > 10)) {
        finalPages = ocrPages;
      }
    } catch {
      // Keep native extracted pages if OCR fails
    }
  }

  const rawText = finalPages.map((p) => p.text).join('\n\n');

  return {
    filePath,
    fileName,
    mimeType: 'application/pdf',
    pageCount: numPages,
    isScanned,
    pages: finalPages,
    rawText,
  };
}
