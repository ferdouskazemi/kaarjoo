import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createWorker, type Worker } from 'tesseract.js';
import { chromium } from 'playwright-core';
import { discoverSystemBrowsers } from '../../utils/discovery.js';
import type { ParsedBlock, ParsedDocument, ParsedPage } from './types.js';

const require = createRequire(import.meta.url);

export function resolveTrainedDataDir(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(__dirname, 'traineddata'),
    process.env.KAARJOO_RESOURCES_DIR ? path.resolve(process.env.KAARJOO_RESOURCES_DIR, 'engine', 'traineddata') : '',
    process.env.KAARJOO_RESOURCES_DIR ? path.resolve(process.env.KAARJOO_RESOURCES_DIR, 'traineddata') : '',
    path.resolve(__dirname, '../../../resources/traineddata'),
    path.resolve(process.cwd(), 'packages/engine/resources/traineddata'),
    path.resolve(process.cwd(), 'apps/desktop/src-tauri/resources/engine/traineddata'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'eng.traineddata.gz'))) {
      return dir;
    }
  }
  return path.resolve(process.cwd(), 'packages/engine/resources/traineddata');
}

function resolveTesseractPaths(): { workerPath?: string; corePath?: string } {
  try {
    const tessEntry = require.resolve('tesseract.js');
    const tessRoot = path.dirname(path.dirname(tessEntry));
    const workerCandidate = path.join(tessRoot, 'src', 'worker-script', 'node', 'index.js');
    const distWorker = path.join(tessRoot, 'dist', 'worker.min.js');
    const workerPath = fs.existsSync(workerCandidate)
      ? workerCandidate
      : fs.existsSync(distWorker)
        ? distWorker
        : undefined;

    let corePath: string | undefined;
    try {
      const corePkg = require.resolve('tesseract.js-core/package.json');
      corePath = path.dirname(corePkg);
    } catch {
      corePath = undefined;
    }
    return { workerPath, corePath };
  } catch {
    return {};
  }
}

async function createOfflineOcrWorker(languages = ['eng', 'fas']): Promise<Worker> {
  const langPath = resolveTrainedDataDir();
  const { workerPath, corePath } = resolveTesseractPaths();

  const availableLangs = languages.filter((l) => fs.existsSync(path.join(langPath, `${l}.traineddata.gz`)));
  const selectedLangs = availableLangs.length > 0 ? availableLangs : ['eng'];

  return createWorker(selectedLangs, 1, {
    langPath,
    gzip: true,
    cacheMethod: 'none',
    ...(workerPath ? { workerPath } : {}),
    ...(corePath ? { corePath } : {}),
  });
}

export async function ocrImageBuffer(
  imageInput: Buffer | string,
  pageNumber = 1
): Promise<{ text: string; confidence: number; blocks: ParsedBlock[] }> {
  const worker = await createOfflineOcrWorker(['eng', 'fas']);
  try {
    const result = await worker.recognize(imageInput);
    const text = (result.data.text || '').trim();
    const confidence = result.data.confidence || 0;

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const blocks: ParsedBlock[] = lines.map((line, idx) => ({
      text: line.trim(),
      page: pageNumber,
      bbox: {
        x: 0,
        y: idx * 20,
        width: Math.max(40, line.length * 8),
        height: 18,
      },
    }));

    return { text, confidence, blocks };
  } finally {
    await worker.terminate();
  }
}

export async function parseImageFile(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
  };

  const { text, blocks } = await ocrImageBuffer(filePath, 1);

  return {
    filePath,
    fileName: path.basename(filePath),
    mimeType: mimeMap[ext] || 'image/png',
    pageCount: 1,
    isScanned: true,
    pages: [
      {
        pageNumber: 1,
        text,
        blocks,
      },
    ],
    rawText: text,
  };
}

/**
 * Renders a scanned PDF using headless Chromium PDF viewer to a screenshot buffer, then runs eng+fas OCR.
 */
export async function ocrScannedPdfPages(filePath: string, maxPages = 3): Promise<ParsedPage[]> {
  const browsers = discoverSystemBrowsers();
  const browserExe = browsers[0]?.executablePath;
  if (!browserExe) {
    return [];
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaarjoo-pdf-ocr-'));
  const context = await chromium.launchPersistentContext(tempDir, {
    executablePath: browserExe,
    headless: true,
    viewport: { width: 1240, height: 1754 },
  });

  try {
    const page = await context.newPage();
    const fileUrl = pathToFileURL(path.resolve(filePath)).href;
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(800);

    const pngBuffer = await page.screenshot({ fullPage: true, type: 'png' });
    const { text, blocks } = await ocrImageBuffer(pngBuffer, 1);

    return [
      {
        pageNumber: 1,
        text,
        blocks,
      },
    ].slice(0, maxPages);
  } catch {
    return [];
  } finally {
    await context.close().catch(() => {});
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
