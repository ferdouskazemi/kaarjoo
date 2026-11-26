import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FORBIDDEN_PATTERNS = [
  'ferdouskazemi1000',
  '728 200 021',
  'unspecified@example.com',
];

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'target' || entry === '.git') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx|rs|sql)$/i.test(entry)) out.push(full);
  }
  return out;
}

describe('PII & Placeholder Guard', () => {
  it('ensures no hardcoded personal PII or placeholder emails exist in source code', () => {
    const repoRoot = resolve(__dirname, '../../../..');
    const targets = [
      join(repoRoot, 'packages'),
      join(repoRoot, 'apps/desktop/src'),
      join(repoRoot, 'apps/desktop/src-tauri/src'),
    ];
    const violations: string[] = [];
    for (const root of targets) {
      for (const file of walkFiles(root)) {
        if (file.endsWith('pii_guard.test.ts')) continue;
        const content = readFileSync(file, 'utf8');
        for (const pat of FORBIDDEN_PATTERNS) {
          if (content.includes(pat)) {
            violations.push(`${file}: contains '${pat}'`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
