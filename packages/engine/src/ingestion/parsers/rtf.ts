import fs from 'node:fs';
import path from 'node:path';
import type { ParsedBlock, ParsedDocument, ParsedPage } from './types.js';

const WIN1256_HIGH: Record<number, string> = {
  0x81: '\u067e', // پ
  0x8d: '\u0686', // چ
  0x8e: '\u0698', // ژ
  0x90: '\u06af', // گ
  0x98: '\u06a9', // ک
  0xaa: '\u06be',
  0xc1: '\u0621',
  0xc2: '\u0622',
  0xc3: '\u0623',
  0xc4: '\u0624',
  0xc5: '\u0625',
  0xc6: '\u0626',
  0xc7: '\u0627',
  0xc8: '\u0628',
  0xc9: '\u0629',
  0xca: '\u062a',
  0xcb: '\u062b',
  0xcc: '\u062c',
  0xcd: '\u062d',
  0xce: '\u062e',
  0xcf: '\u062f',
  0xd0: '\u0630',
  0xd1: '\u0631',
  0xd2: '\u0632',
  0xd3: '\u0633',
  0xd4: '\u0634',
  0xd5: '\u0635',
  0xd6: '\u0636',
  0xd8: '\u0637',
  0xd9: '\u0638',
  0xda: '\u0639',
  0xdb: '\u063a',
  0xdd: '\u0641',
  0xde: '\u0642',
  0xdf: '\u06a9',
  0xe1: '\u0644',
  0xe3: '\u0645',
  0xe4: '\u0646',
  0xe5: '\u0647',
  0xe6: '\u0648',
  0xec: '\u0649',
  0xed: '\u06cc',
};

const SKIP_GROUPS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'header',
  'footer',
  'headerl',
  'headerr',
  'headerf',
  'footerl',
  'footerr',
  'footerf',
  'fldinst',
  'datafield',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
]);

/**
 * Extracts readable UTF-8 text (including Persian/Arabic Unicode \uN escapes and \'hh hex escapes)
 * from Rich Text Format (.rtf) documents.
 */
export function extractTextFromRtf(rtf: string): string {
  const stack: Array<{ uc: number; skip: boolean }> = [{ uc: 1, skip: false }];
  let out = '';
  let i = 0;
  let skipChars = 0;

  while (i < rtf.length) {
    const ch = rtf[i];
    const current = stack[stack.length - 1];

    if (ch === '{') {
      stack.push({ uc: current.uc, skip: current.skip });
      i++;
      continue;
    }

    if (ch === '}') {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      i++;
      continue;
    }

    if (ch === '\\') {
      i++;
      if (i >= rtf.length) break;
      const next = rtf[i];

      if (next === '\\' || next === '{' || next === '}') {
        if (!current.skip && skipChars === 0) out += next;
        if (skipChars > 0) skipChars--;
        i++;
        continue;
      }

      if (next === '*') {
        current.skip = true;
        i++;
        continue;
      }

      if (next === "'") {
        const hex = rtf.slice(i + 1, i + 3);
        const byteVal = parseInt(hex, 16);
        if (!Number.isNaN(byteVal) && !current.skip && skipChars === 0) {
          out += WIN1256_HIGH[byteVal] ?? String.fromCharCode(byteVal);
        }
        if (skipChars > 0) skipChars--;
        i += 3;
        continue;
      }

      if (next === '~') {
        if (!current.skip) out += ' ';
        i++;
        continue;
      }

      if (next === '-' || next === '_') {
        if (!current.skip) out += '-';
        i++;
        continue;
      }

      // Control word: letters followed by optional signed integer parameter
      const match = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i));
      if (match) {
        const word = match[1];
        const param = match[2] !== undefined ? parseInt(match[2], 10) : undefined;
        i += match[0].length;

        if (SKIP_GROUPS.has(word)) {
          current.skip = true;
          continue;
        }
        if (word === 'uc' && param !== undefined) {
          current.uc = param;
          continue;
        }
        if (word === 'u' && param !== undefined) {
          const codePoint = param < 0 ? param + 65536 : param;
          if (!current.skip) {
            out += String.fromCharCode(codePoint);
          }
          skipChars = current.uc;
          continue;
        }

        if (!current.skip) {
          if (word === 'par' || word === 'line' || word === 'row') out += '\n';
          else if (word === 'tab' || word === 'cell') out += '\t';
        }
        continue;
      }

      i++;
      continue;
    }

    if (skipChars > 0) {
      skipChars--;
      i++;
      continue;
    }

    if (!current.skip) {
      out += ch;
    }
    i++;
  }

  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseRtfFile(filePath: string): Promise<ParsedDocument> {
  const rawRtf = fs.readFileSync(filePath, 'utf-8');
  const rawText = extractTextFromRtf(rawRtf);
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
    mimeType: 'application/rtf',
    pageCount: 1,
    isScanned: false,
    pages,
    rawText,
  };
}
