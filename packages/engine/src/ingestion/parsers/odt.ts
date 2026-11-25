import fs from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import * as cheerio from 'cheerio';
import type { ParsedBlock, ParsedDocument, ParsedPage } from './types.js';

/**
 * Minimal pure-Node ZIP entry extractor to read `content.xml` from `.odt` OpenDocument archives.
 */
function readZipEntry(zipBuffer: Buffer, targetFileName: string): Buffer | null {
  // Locate End of Central Directory record (signature 0x06054b50)
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return null;

  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);

  let offset = cdOffset;
  for (let idx = 0; idx < totalEntries && offset + 46 <= zipBuffer.length; idx++) {
    if (zipBuffer.readUInt32LE(offset) !== 0x02014b50) break;

    const compressionMethod = zipBuffer.readUInt16LE(offset + 10);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const fileNameLen = zipBuffer.readUInt16LE(offset + 28);
    const extraLen = zipBuffer.readUInt16LE(offset + 30);
    const commentLen = zipBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);

    const fileName = zipBuffer.toString('utf-8', offset + 46, offset + 46 + fileNameLen);
    offset += 46 + fileNameLen + extraLen + commentLen;

    if (fileName === targetFileName) {
      if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) return null;
      const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) return Buffer.from(compressedData);
      if (compressionMethod === 8) return inflateRawSync(compressedData);
      throw new Error(`Unsupported ODT ZIP compression method ${compressionMethod}`);
    }
  }

  return null;
}

export function extractTextFromOdtXml(xml: string): string {
  const $ = cheerio.load(xml, { xmlMode: true });
  const lines: string[] = [];

  $('text\\:h, text\\:p').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  });

  if (lines.length === 0) {
    return $.root().text().replace(/\s+/g, ' ').trim();
  }

  return lines.join('\n');
}

export async function parseOdtFile(filePath: string): Promise<ParsedDocument> {
  const zipBuf = fs.readFileSync(filePath);
  const contentXmlBuf = readZipEntry(zipBuf, 'content.xml');

  if (!contentXmlBuf) {
    throw new Error(`Invalid ODT file (content.xml missing): ${filePath}`);
  }

  const rawText = extractTextFromOdtXml(contentXmlBuf.toString('utf-8'));
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const blocks: ParsedBlock[] = lines.map((line, idx) => ({
    text: line,
    page: 1,
    bbox: { x: 0, y: idx * 18, width: Math.max(40, line.length * 8), height: 18 },
  }));

  const pages: ParsedPage[] = [{ pageNumber: 1, text: rawText, blocks }];

  return {
    filePath,
    fileName: path.basename(filePath),
    mimeType: 'application/vnd.oasis.opendocument.text',
    pageCount: 1,
    isScanned: false,
    pages,
    rawText,
  };
}
