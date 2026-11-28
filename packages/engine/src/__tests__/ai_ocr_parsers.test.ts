import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { describe, it, expect, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { extractTextFromRtf } from '../ingestion/parsers/rtf.js';
import { extractTextFromOdtXml, parseOdtFile } from '../ingestion/parsers/odt.js';
import { extractTextFromDocBinary } from '../ingestion/parsers/doc.js';
import { ocrImageBuffer } from '../ingestion/parsers/ocr.js';
import { SqliteEmbeddingCache } from '../matching/embeddingCache.js';
import { filterVerifiedProfileGaps, verifyEvidenceSpan } from '../ai/prompts.js';
import { MODEL_MANIFEST, detectAiHardware } from '../ai/modelManifest.js';

function createMinimalZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const cdParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const compressed = deflateRawSync(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt32LE(0, 14); // crc32 (unused by reader)
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(8, 10);
    cdHeader.writeUInt32LE(compressed.length, 20);
    cdHeader.writeUInt32LE(entry.data.length, 24);
    cdHeader.writeUInt16LE(nameBuf.length, 28);
    cdHeader.writeUInt32LE(offset, 42);

    cdParts.push(cdHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const cdBuffer = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, cdBuffer, eocd]);
}

function findLocalBrowser(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];

  return candidates.find((p) => fs.existsSync(p));
}

describe('Local AI, OCR, Format Parsers & Embedding Cache', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaarjoo-ai-test-'));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses English & Persian Unicode escapes from RTF', () => {
    // فردوس in RTF Unicode decimal escapes: 1601 1585 1583 1608 1587
    const rtf = String.raw`{\rtf1\ansi{\fonttbl{\f0 Arial;}}\pard\fs24 \u1601?\u1585?\u1583?\u1608?\u1587? Kazemi\par Senior Backend Engineer at Tehran Tech\par Email: ferdous@example.com\par}`;
    const text = extractTextFromRtf(rtf);
    expect(text).toContain('فردوس Kazemi');
    expect(text).toContain('Senior Backend Engineer at Tehran Tech');
    expect(text).toContain('ferdous@example.com');
  });

  it('parses compressed ODT archive content.xml', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
        <office:body><office:text>
          <text:h>Sara Ahmadi</text:h>
          <text:p>Experience: Staff TypeScript Developer</text:p>
          <text:p>Skills: PostgreSQL, Docker, Kubernetes</text:p>
        </office:text></office:body>
      </office:document-content>`;
    expect(extractTextFromOdtXml(xml)).toContain('Staff TypeScript Developer');

    const odtPath = path.join(tmpDir, 'sample.odt');
    fs.writeFileSync(odtPath, createMinimalZip([{ name: 'content.xml', data: Buffer.from(xml, 'utf-8') }]));

    const parsed = await parseOdtFile(odtPath);
    expect(parsed.mimeType).toBe('application/vnd.oasis.opendocument.text');
    expect(parsed.rawText).toContain('Sara Ahmadi');
    expect(parsed.rawText).toContain('PostgreSQL, Docker, Kubernetes');
  });

  it('extracts UTF-16LE English & Persian runs from binary .doc buffer', () => {
    const header = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x00, 0x00, 0x00]);
    const body = Buffer.from('Senior Rust Engineer - مهندس نرم‌افزار ارشد\nEmail: rust@kaarjoo.dev', 'utf16le');
    const text = extractTextFromDocBinary(Buffer.concat([header, body]));
    expect(text).toContain('Senior Rust Engineer');
    expect(text).toContain('مهندس نرم‌افزار ارشد');
    expect(text).toContain('rust@kaarjoo.dev');
  });

  it('runs real offline tesseract.js OCR (eng+fas) on a rendered résumé PNG', async () => {
    const browserExe = findLocalBrowser();
    if (!browserExe) {
      // CI macOS/Linux without Chrome pre-installed falls back cleanly if unavailable
      return;
    }

    const browser = await chromium.launch({ executablePath: browserExe, headless: true });
    let pngBuffer: Buffer;
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 420 } });
      await page.setContent(`
        <html><body style="background:#ffffff;color:#111111;font-family:Arial,sans-serif;padding:36px;font-size:24px;line-height:1.6;">
          <h1 style="margin:0 0 12px 0;">DARA MORADI</h1>
          <div>Senior Fullstack Engineer</div>
          <div>Skills: TypeScript, React, PostgreSQL, Docker</div>
        </body></html>
      `);
      pngBuffer = await page.screenshot({ type: 'png' });
    } finally {
      await browser.close();
    }

    const ocrResult = await ocrImageBuffer(pngBuffer, 1);
    expect(ocrResult.confidence).toBeGreaterThan(50);
    expect(ocrResult.text).toMatch(/DARA MORADI/i);
    expect(ocrResult.text).toMatch(/TypeScript/i);
    expect(ocrResult.text).toMatch(/PostgreSQL/i);
  }, 45000);

  it('roundtrips Float32Array neural embeddings in SQLite embedding cache', () => {
    const dbPath = path.join(tmpDir, 'embed-cache.db');
    const cache = new SqliteEmbeddingCache(dbPath);
    const vec = new Float32Array([0.125, -0.5, 0.875, 0.25]);
    cache.set('bge-m3-q8', 'Senior Backend Engineer TypeScript', vec);

    const loaded = cache.get('bge-m3-q8', '  Senior Backend Engineer TypeScript  ');
    expect(loaded).not.toBeNull();
    expect(loaded!.length).toBe(4);
    expect(loaded![0]).toBeCloseTo(0.125, 5);
    expect(loaded![1]).toBeCloseTo(-0.5, 5);
    expect(cache.count('bge-m3-q8')).toBe(1);
    cache.close();
  });

  it('strictly drops fabricated LLM claims without verbatim source evidence spans', () => {
    const rawResume = 'سارا کاظمی\nمهندس نرم‌افزار در شرکت اسنپ (۱۳۹۹ تا ۱۴۰۳)\nمهارت‌ها: Rust, Tauri, SQLite';
    expect(verifyEvidenceSpan(rawResume, 'شرکت اسنپ (1399 تا 1403)')).toBe(true);
    expect(verifyEvidenceSpan(rawResume, 'Principal Architect at OpenAI')).toBe(false);

    const { verified, droppedCount } = filterVerifiedProfileGaps(rawResume, {
      fullName: { value: 'سارا کاظمی', evidenceSpan: 'سارا کاظمی' },
      email: { value: 'hallucinated@openai.com', evidenceSpan: 'hallucinated@openai.com' },
      skills: [
        { name: 'Rust', evidenceSpan: 'مهارت‌ها: Rust' },
        { name: 'Quantum Computing', evidenceSpan: 'Quantum Computing at CERN' },
      ],
      experiences: [
        { title: 'مهندس نرم‌افزار', company: 'اسنپ', startDate: '1399', endDate: '1403', evidenceSpan: 'مهندس نرم‌افزار در شرکت اسنپ' },
        { title: 'CTO', company: 'FakeCorp', startDate: '2020', evidenceSpan: 'CTO at FakeCorp' },
      ],
    });

    expect(verified.fullName?.value).toBe('سارا کاظمی');
    expect(verified.email).toBeUndefined();
    expect(verified.skills?.map((s) => s.name)).toEqual(['Rust']);
    expect(verified.experiences?.map((e) => e.company)).toEqual(['اسنپ']);
    expect(droppedCount).toBe(3);
  });

  it('validates model manifest open licenses, SHA-256 checksums, and hardware detection', async () => {
    expect(MODEL_MANIFEST.length).toBeGreaterThanOrEqual(4);
    for (const m of MODEL_MANIFEST) {
      expect(['Apache-2.0', 'MIT']).toContain(m.license);
      expect(m.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(m.downloadUrl.startsWith('https://huggingface.co/')).toBe(true);
    }

    const hw = await detectAiHardware();
    expect(['lite', 'standard', 'pro']).toContain(hw.recommendedTier);
    expect(['metal', 'cuda', 'vulkan', 'cpu']).toContain(hw.gpuBackend);
    expect(hw.totalRamGb).toBeGreaterThan(0);
  }, 15000);
});
