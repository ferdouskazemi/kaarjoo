import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { discoverSystemBrowsers } from '../discovery.js';
import { atomicWriteFile } from '../atomic.js';
import { calculateFileHash } from '../hash.js';

describe('Engine System Utilities', () => {
  it('discovers browsers without throwing on the current OS', () => {
    const browsers = discoverSystemBrowsers();
    expect(Array.isArray(browsers)).toBe(true);
    // On Windows, Edge is pre-installed
    if (os.platform() === 'win32') {
      expect(browsers.length).toBeGreaterThanOrEqual(1);
      const edgeOrChrome = browsers.find((b) => b.name === 'msedge' || b.name === 'chrome');
      expect(edgeOrChrome).toBeDefined();
    }
  });

  it('performs atomic writes correctly without leaving tmp files', async () => {
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, `kaarjoo_atomic_test_${Date.now()}.txt`);
    const content = 'Kaarjoo local-first job assistant';

    await atomicWriteFile(testFile, content);
    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.readFileSync(testFile, 'utf-8')).toBe(content);

    const hash = await calculateFileHash(testFile);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // SHA-256 hex length

    // Cleanup
    fs.unlinkSync(testFile);
  });
});
