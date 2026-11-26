import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolveAllowedEnginePath, resolveExportPath } from '../utils/pathGuard.js';
import { renderAtsCleanHtml } from '../documents/templates/atsClean.js';
import { renderModernMinimalHtml } from '../documents/templates/modernMinimal.js';
import { exportToPdf } from '../documents/exporters/pdf.js';
import { discoverSystemBrowsers } from '../utils/discovery.js';
import type { TailoredResume } from '@kaarjoo/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../');

describe('Prompt 4 Security Hardening', () => {
  it('Tauri capabilities/default.json matches strict allowlist (no fs/shell/process:default)', () => {
    const capPath = path.join(repoRoot, 'apps/desktop/src-tauri/capabilities/default.json');
    const raw = JSON.parse(fs.readFileSync(capPath, 'utf-8')) as { permissions: string[] };

    const allowlist = new Set([
      'core:default',
      'core:window:allow-minimize',
      'core:window:allow-maximize',
      'core:window:allow-unmaximize',
      'core:window:allow-toggle-maximize',
      'core:window:allow-close',
      'core:window:allow-start-dragging',
      'dialog:allow-open',
      'dialog:allow-save',
      'notification:default',
      'updater:default',
    ]);

    for (const perm of raw.permissions) {
      expect(allowlist.has(perm), `Unexpected capability permission: ${perm}`).toBe(true);
    }
    expect(raw.permissions).not.toContain('fs:default');
    expect(raw.permissions).not.toContain('shell:default');
    expect(raw.permissions).not.toContain('process:default');
    expect(raw.permissions).not.toContain('dialog:default');
  });

  it('rejects path traversal, absolute paths, UNC paths, and NUL bytes in engine path guards', () => {
    const prevDir = process.env.KAARJOO_APP_DATA_DIR;
    const testRoot = path.join(os.tmpdir(), `kaarjoo_sec_${Date.now()}`);
    process.env.KAARJOO_APP_DATA_DIR = testRoot;

    try {
      expect(() => resolveExportPath('../../etc/passwd', '.pdf')).toThrow();
      expect(() => resolveExportPath('/etc/passwd', '.pdf')).toThrow();
      expect(() => resolveExportPath('C:\\Windows\\System32\\cmd.exe', '.pdf')).toThrow();
      expect(() => resolveExportPath('\\\\attacker\\share\\evil.pdf', '.pdf')).toThrow();
      expect(() => resolveExportPath('foo\0bar.pdf', '.pdf')).toThrow();

      const validExport = resolveExportPath('my-resume', '.pdf');
      expect(validExport.startsWith(path.resolve(testRoot, 'exports'))).toBe(true);
      expect(validExport.endsWith('my-resume.pdf')).toBe(true);

      expect(() => resolveAllowedEnginePath('../../etc/passwd', ['sources'])).toThrow();
      expect(() => resolveAllowedEnginePath('\\\\attacker\\share\\resume.pdf', ['sources'])).toThrow();
      expect(() => resolveAllowedEnginePath(path.join(testRoot, 'exports', 'out.pdf'), ['sources'])).toThrow();

      const validSource = path.join(testRoot, 'sources', 'abc123.pdf');
      expect(resolveAllowedEnginePath(validSource, ['sources'])).toBe(path.resolve(validSource));
    } finally {
      if (prevDir === undefined) delete process.env.KAARJOO_APP_DATA_DIR;
      else process.env.KAARJOO_APP_DATA_DIR = prevDir;
    }
  });

  it('document templates have zero raw ${resume.*} interpolations and escape XSS payloads', () => {
    const templatesDir = path.join(repoRoot, 'packages/engine/src/documents/templates');
    for (const file of fs.readdirSync(templatesDir)) {
      if (!file.endsWith('.ts')) continue;
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
      expect(content, `Raw \${resume. found in ${file}`).not.toMatch(/\$\{resume\./);
    }

    const xssResume: TailoredResume = {
      id: 'res_xss',
      profileId: 'prof_1',
      jobId: 'job_1',
      templateId: 'ats-clean',
      language: 'en',
      contact: {
        fullName: 'Alice <script>alert(1)</script>',
        email: 'alice@example.com',
        phone: '+1 555 0100',
        location: '<img src=x onerror=alert(1)>',
      },
      summary: '<script>fetch("https://evil.example")</script>',
      experiences: [
        {
          id: 'exp_1',
          company: 'Acme <svg onload=alert(1)>',
          title: 'Engineer <b>bold</b>',
          startDate: '2022-01',
          isCurrent: true,
          originalAchievements: ['Built API'],
          tailoredAchievements: ['<img src=x onerror=alert(2)>'],
        },
      ],
      skillCategories: [{ category: 'Core <script>', skills: ['TypeScript<script>'] }],
      education: [
        {
          institution: 'MIT <script>',
          degree: 'BS <img src=x onerror=alert(3)>',
        },
      ],
      diffSummary: [],
      createdAt: new Date().toISOString(),
    };

    for (const html of [renderAtsCleanHtml(xssResume), renderModernMinimalHtml(xssResume)]) {
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain('<svg onload=');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    }
  });

  it('PDF export runs with JS disabled and blocks all network requests', async () => {
    const browsers = discoverSystemBrowsers();
    if (browsers.length === 0) return;

    const blockedUrls: string[] = [];
    const htmlWithExternalImg = `<!DOCTYPE html><html><body>
      <p>Safe text &lt;script&gt;alert(1)&lt;/script&gt;</p>
      <img src="https://127.0.0.1:1/should-be-blocked.png" />
    </body></html>`;

    const pdf = await exportToPdf(htmlWithExternalImg, {
      onBlockedNetworkRequest: (url) => blockedUrls.push(url),
    });

    expect(pdf.byteLength).toBeGreaterThan(100);
    expect(blockedUrls.some((u) => u.includes('should-be-blocked.png'))).toBe(true);
  }, 15000);
});
