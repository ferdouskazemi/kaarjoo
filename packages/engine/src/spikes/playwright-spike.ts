import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { discoverSystemBrowsers } from '../utils/discovery.js';

async function runPlaywrightSpike() {
  console.log('--- Spike 3: Testing Playwright with System Browser ---');

  const browsers = discoverSystemBrowsers();
  console.log('Discovered browsers:', browsers);

  const selectedBrowser = browsers.find((b) => b.name === 'chrome') || browsers.find((b) => b.name === 'msedge') || browsers[0];
  if (!selectedBrowser) {
    throw new Error('No system browser found on machine!');
  }

  console.log(`Using ${selectedBrowser.name} at: ${selectedBrowser.executablePath}`);

  const userDataDir = path.join(os.tmpdir(), `kaarjoo_playwright_profile_${Date.now()}`);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  console.log('Launching browser with isolated profile:', userDataDir);
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: selectedBrowser.executablePath,
    headless: true, // headless for CI/spike execution
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = await context.newPage();
    const testHtml = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>تست اتوماسیون کارجو</title>
          <style>
            body { font-family: sans-serif; background: #020617; color: #f8fafc; padding: 40px; }
            h1 { color: #38bdf8; }
          </style>
        </head>
        <body>
          <h1>کارجو (Kaarjoo) - آزمایش اتوماسیون مرورگر</h1>
          <p>مرورگر سیستم با موفقیت هدایت شد.</p>
        </body>
      </html>
    `;

    await page.setContent(testHtml, { waitUntil: 'load' });
    const title = await page.title();
    console.log('Page Title verified:', title);

    if (title !== 'تست اتوماسیون کارجو') {
      throw new Error(`Unexpected page title: ${title}`);
    }

    console.log('Playwright system browser spike PASSED!');
  } finally {
    await context.close();
    // Clean up temporary profile
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runPlaywrightSpike().catch((err) => {
  console.error('Playwright spike failed:', err);
  process.exit(1);
});
