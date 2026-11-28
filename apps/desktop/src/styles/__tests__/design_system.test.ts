import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopSrc = path.resolve(__dirname, '../..');

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractThemeVars(cssBlock: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const regex = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(cssBlock)) !== null) {
    vars[m[1]] = m[2];
  }
  return vars;
}

export function findDesignTokenViolations(source: string): string[] {
  const violations: string[] = [];
  if (/#[0-9a-fA-F]{3,8}\b/.test(source)) {
    violations.push('Raw hex color literal detected');
  }
  const smallTextMatch = source.match(/text-\[(\d+)px\]/);
  if (smallTextMatch && parseInt(smallTextMatch[1], 10) < 12) {
    violations.push(`Font size < 12px detected: ${smallTextMatch[0]}`);
  }
  return violations;
}

describe('Prompt 7 Design System Tokens & Shell Guard', () => {
  it('verifies WCAG AA (>= 4.5:1) contrast for all dark and light token pairs', () => {
    const tokensCss = fs.readFileSync(path.join(desktopSrc, 'styles/tokens.css'), 'utf-8');
    const [darkBlock, lightBlock] = tokensCss.split('.light {');
    expect(darkBlock).toBeTruthy();
    expect(lightBlock).toBeTruthy();

    for (const [themeName, block] of [
      ['dark', darkBlock],
      ['light', lightBlock],
    ] as const) {
      const vars = extractThemeVars(block);
      const surfaces = ['bg', 'surface', 'surface-2'];
      const foregrounds = ['text', 'text-2', 'muted', 'accent', 'accent-text', 'success', 'warning', 'danger'];

      for (const bgKey of surfaces) {
        for (const fgKey of foregrounds) {
          const ratio = contrastRatio(vars[fgKey], vars[bgKey]);
          expect(
            ratio,
            `${themeName} contrast ${fgKey} (${vars[fgKey]}) on ${bgKey} (${vars[bgKey]}) was ${ratio.toFixed(2)}`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('catches raw hex colors and font sizes < 12px and confirms ui/ + layout/ are clean', () => {
    expect(findDesignTokenViolations('<span className="text-[10px]">hi</span>')).toEqual([
      'Font size < 12px detected: text-[10px]',
    ]);
    expect(findDesignTokenViolations('<div className="bg-[#111111]" />')).toEqual([
      'Raw hex color literal detected',
    ]);

    for (const dir of ['components/ui', 'components/layout']) {
      const fullDir = path.join(desktopSrc, dir);
      for (const file of fs.readdirSync(fullDir)) {
        if (!file.endsWith('.tsx')) continue;
        const content = fs.readFileSync(path.join(fullDir, file), 'utf-8');
        const violations = findDesignTokenViolations(content);
        expect(violations, `${dir}/${file} has token violations`).toEqual([]);
      }
    }
  });
});
