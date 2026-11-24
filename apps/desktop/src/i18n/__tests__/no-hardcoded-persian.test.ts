import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Persian & Arabic Unicode ranges: U+0600–U+06FF, U+FB50–U+FDFF, U+FE70–U+FEFF
const PERSIAN_ARABIC_REGEX = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Exclude i18n dictionaries and tests
      if (entry.name === 'i18n' || entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }
      getAllSourceFiles(fullPath, fileList);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

describe('Localization Character Guard', () => {
  const srcDir = path.resolve(__dirname, '../../');
  const sourceFiles = getAllSourceFiles(srcDir);

  it('verifies that source files are discovered', () => {
    expect(sourceFiles.length).toBeGreaterThan(15);
  });

  it('ensures zero Persian/Arabic characters appear in apps/desktop/src outside src/i18n', () => {
    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip pure comments if any
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          return;
        }

        if (PERSIAN_ARABIC_REGEX.test(line)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: index + 1,
            text: trimmed,
          });
        }
      });
    }

    if (violations.length > 0) {
      console.error('Found hardcoded Persian/Arabic characters in production UI files:');
      violations.forEach((v) => console.error(`  at ${v.file}:${v.line} -> ${v.text}`));
    }

    expect(violations).toEqual([]);
  });
});
