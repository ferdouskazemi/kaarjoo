import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'eval', 'smoke-artifacts');

function findBrowserExecutable(): string {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/chromium'];

  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No system Chrome/Edge found for UI audit screenshots');
  return found;
}

async function waitForPort(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const port = 4173;
  const previewUrl = `http://127.0.0.1:${port}/`;

  const viteProc = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['--filter', 'desktop', 'preview', '--port', String(port), '--host', '127.0.0.1'],
    { cwd: ROOT_DIR, stdio: 'pipe', shell: process.platform === 'win32' }
  );

  try {
    await waitForPort(previewUrl);
    const exe = findBrowserExecutable();
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });

    const pageErrors: string[] = [];
    page.on('pageerror', (err: Error) => pageErrors.push(err.message));

    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // 1. English Dark (default) - Home
    assert.equal(await page.getAttribute('html', 'dir'), 'ltr');
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-en-dark-home.png') });

    // Check accessibility: nav landmark, button accessible names
    const a11yReport = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label]');
      const buttons = Array.from(document.querySelectorAll('button'));
      const unlabeledIconButtons = buttons
        .filter((b) => !b.textContent?.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
        .map((b) => b.outerHTML.slice(0, 80));
      return { hasNavLabel: Boolean(nav), buttonCount: buttons.length, unlabeledIconButtons };
    });
    assert.ok(a11yReport.hasNavLabel, 'Missing nav[aria-label]');
    assert.equal(
      a11yReport.unlabeledIconButtons.length,
      0,
      `Unlabeled icon buttons: ${JSON.stringify(a11yReport.unlabeledIconButtons)}`
    );

    // 2. Navigate to Settings (English Dark)
    await page.locator('nav button').nth(5).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-en-dark-settings.png') });

    // 3. Switch to Light theme (English Light)
    const themeToggleBtn = page.locator('aside button[aria-label]').last();
    await themeToggleBtn.click();
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('light')), 'Expected .light class');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-en-light-settings.png') });

    // Go back to Home in English Light
    await page.locator('nav button').nth(0).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-en-light-home.png') });

    // 4. Switch to Persian (fa, RTL) in Light theme
    await page.locator('aside button').filter({ hasText: 'فارسی' }).click();
    await page.waitForTimeout(350);
    assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
    assert.equal(await page.getAttribute('html', 'lang'), 'fa');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-fa-light-home.png') });

    // Navigate to Settings in Persian Light first, then Persian Dark
    await page.locator('nav button').nth(5).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-fa-light-settings.png') });

    // 5. Switch back to Dark theme in Persian (fa, RTL Dark)
    await themeToggleBtn.click();
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'Expected .dark class');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-fa-dark-settings.png') });

    await page.locator('nav button').nth(0).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui-fa-dark-home.png') });

    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join('; ')}`);

    await browser.close();
    console.log('UI & Accessibility Audit Screenshots captured successfully (en/fa x light/dark, 0 errors).');
  } finally {
    if (process.platform === 'win32' && viteProc.pid) {
      try {
        execFileSync('taskkill', ['/pid', String(viteProc.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {
        // ignore if already exited
      }
    } else {
      viteProc.kill('SIGKILL');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('UI Audit failed:', err);
    process.exit(1);
  });
