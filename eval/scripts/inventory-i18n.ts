import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') results = results.concat(walk(full));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const desktopSrc = path.resolve('apps/desktop/src');
const files = walk(desktopSrc);
const faRegex = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ternaryRegex = /(isRtl\s*\?|language\s*===?\s*['"]fa['"])/;

interface Item {
  file: string;
  faLines: number[];
  ternaryLines: number[];
}

const inventory: Item[] = [];
for (const file of files) {
  if (file.includes('i18n') || file.includes('__tests__') || file.endsWith('.d.ts')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split(/\r?\n/);
  const faLines: number[] = [];
  const ternaryLines: number[] = [];

  lines.forEach((line, i) => {
    if (faRegex.test(line)) faLines.push(i + 1);
    if (ternaryRegex.test(line)) ternaryLines.push(i + 1);
  });

  if (faLines.length > 0 || ternaryLines.length > 0) {
    inventory.push({
      file: path.relative(desktopSrc, file),
      faLines,
      ternaryLines,
    });
  }
}

console.log('Total files needing i18n cleanup:', inventory.length);
for (const item of inventory) {
  console.log(`- ${item.file}: ${item.faLines.length} Persian lines, ${item.ternaryLines.length} ternary lines`);
}
