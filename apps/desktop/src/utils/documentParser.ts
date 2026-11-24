import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

// Configure worker for PDF.js - in Vite browser environments, configure worker safely
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    // @ts-ignore
    import('pdfjs-dist/build/pdf.worker.mjs?url')
      .then((workerModule) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default || workerModule;
      })
      .catch(() => {
        // Fallback or legacy worker mode
      });
  } catch {
    // Ignore in Node/SSR
  }
}

export interface ParseResult {
  text: string;
  pageCount: number;
  fileType: 'pdf' | 'docx' | 'text';
}

/**
 * Normalizes text extracted from PDF, fixing spaced-out characters and broken hyphens.
 */
function cleanExtractedText(raw: string): string {
  return raw
    // Fix spaced out numbers like "202 2" -> "2022" or "2 022" -> "2022" or "20 23" -> "2023"
    .replace(/\b(19|20)(\d)\s+(\d)\b/g, '$1$2$3')
    .replace(/\b(19|20)\s+(\d{2})\b/g, '$1$2')
    .replace(/\b([12])\s+(0\d{2})\b/g, '$1$2')
    // Fix broken hyphens in words like "Front - End", "Mid -Level", "Front -End" -> "Front-End"
    .replace(/([A-Za-z]+)\s*-\s*([A-Za-z]+)/g, '$1-$2')
    // Fix broken URLs with spaces around hyphens e.g. "ferdous - kazemi"
    .replace(/(https?:\/\/[^\s]+)\s*-\s*([^\s]+)/g, '$1-$2')
    // Standardize bullet points with spaces
    .replace(/\s*•\s*/g, ' • ')
    // Clean excessive spaces inside lines
    .replace(/[ \t]{2,}/g, ' ')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Remove more than 2 consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses PDF ArrayBuffer into clean, structured human-readable text.
 * Reconstructs lines based on coordinates and removes binary artifacts.
 */
export async function parsePdfBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();

    let lastY: number | null = null;
    const pageLines: string[] = [];
    let currentLine = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const str = item.str;
      if (!str || str.trim().length === 0) continue;

      const y = item.transform[5];

      // If vertical displacement > 4px, it's a new line
      if (lastY !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = '';
      }

      const needsSpace =
        currentLine.length > 0 &&
        !currentLine.endsWith(' ') &&
        !currentLine.endsWith('-') &&
        !str.startsWith(' ') &&
        !str.startsWith(',') &&
        !str.startsWith('.') &&
        !str.startsWith('•');

      currentLine += (needsSpace ? ' ' : '') + str;
      lastY = y;
    }

    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    if (pageLines.length > 0) {
      pageTexts.push(pageLines.join('\n'));
    }
  }

  const rawText = pageTexts.join('\n\n');
  const cleanedText = cleanExtractedText(rawText);

  return {
    text: cleanedText,
    pageCount: numPages,
    fileType: 'pdf',
  };
}

/**
 * Parses Word (.docx) ArrayBuffer into clean text using mammoth.
 */
export async function parseDocxBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const cleaned = cleanExtractedText(result.value);
  return {
    text: cleaned,
    pageCount: 1,
    fileType: 'docx',
  };
}

/**
 * Main entry point: Parses any uploaded File (PDF, DOCX, TXT, MD)
 * and returns clean, human-readable text ready for display and extraction.
 */
export async function parseDocumentFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    return await parsePdfBuffer(buffer);
  }

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const buffer = await file.arrayBuffer();
    return await parseDocxBuffer(buffer);
  }

  // Plain text / Markdown
  const text = await file.text();
  return {
    text: cleanExtractedText(text),
    pageCount: 1,
    fileType: 'text',
  };
}
