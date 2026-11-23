import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { discoverSystemBrowsers } from '../../utils/discovery.js';
import { renderResumeHtml } from '../templates/compactTechnical.js';
import type { CoverLetter, TailoredResume } from '@kaarjoo/shared';

export interface PdfExportOptions {
  outputPath?: string;
  format?: 'A4' | 'Letter';
}

/**
 * Generates a high-resolution PDF document using the host system's Chrome/Edge browser.
 */
export async function exportToPdf(
  htmlContent: string,
  options: PdfExportOptions = {}
): Promise<Buffer> {
  const browsers = discoverSystemBrowsers();
  const selectedBrowser = browsers.find((b) => b.name === 'chrome') || browsers[0];

  if (!selectedBrowser) {
    throw new Error('No system browser (Chrome/Edge/Chromium) found for PDF generation');
  }

  const userDataDir = path.join(os.tmpdir(), `kaarjoo_pdf_gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: selectedBrowser.executablePath,
    headless: true,
  });

  try {
    const page = await context.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: (options.format || 'A4') as 'A4' | 'Letter',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    if (options.outputPath) {
      await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
      await fs.writeFile(options.outputPath, pdfBuffer);
    }

    return pdfBuffer;
  } finally {
    await context.close().catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Helper to export TailoredResume to PDF.
 */
export async function exportResumeToPdf(
  resume: TailoredResume,
  options: PdfExportOptions = {}
): Promise<Buffer> {
  const html = renderResumeHtml(resume);
  return exportToPdf(html, options);
}

/**
 * Helper to export CoverLetter to PDF.
 */
export async function exportCoverLetterToPdf(
  letter: CoverLetter,
  options: PdfExportOptions = {}
): Promise<Buffer> {
  const isFa = letter.language === 'fa';
  const dir = isFa ? 'rtl' : 'ltr';
  const fontFamily = isFa ? 'Vazirmatn, Tahoma, Arial' : 'Inter, system-ui, sans-serif';

  const html = `<!DOCTYPE html>
<html lang="${letter.language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>Cover Letter - ${letter.roleTitle}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm; }
    body {
      font-family: ${fontFamily};
      line-height: 1.6;
      font-size: 11pt;
      color: #1e293b;
      direction: ${dir};
      text-align: ${isFa ? 'right' : 'left'};
      padding: 30px;
      max-width: 750px;
      margin: 0 auto;
    }
    p { margin-bottom: 14pt; }
  </style>
</head>
<body>
  ${letter.bodyParagraphs.map((p) => `<p>${p}</p>`).join('')}
  <p style="margin-top: 24pt;">${letter.closing}</p>
</body>
</html>`;

  return exportToPdf(html, options);
}
