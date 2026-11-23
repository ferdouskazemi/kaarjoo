import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { discoverSystemBrowsers } from '../utils/discovery.js';

async function runPdfSpike() {
  console.log('--- Spike 4: Testing Persian RTL PDF Generation via Playwright page.pdf() ---');

  const browsers = discoverSystemBrowsers();
  const selectedBrowser = browsers.find((b) => b.name === 'chrome') || browsers[0];
  if (!selectedBrowser) {
    throw new Error('No system browser found!');
  }

  const userDataDir = path.join(os.tmpdir(), `kaarjoo_pdf_spike_profile_${Date.now()}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: selectedBrowser.executablePath,
    headless: true,
  });

  const outputPdfPath = path.join(os.tmpdir(), `kaarjoo_test_resume_${Date.now()}.pdf`);

  try {
    const page = await context.newPage();
    const resumeHtml = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>رزومه فردوس کاظمی</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              direction: rtl;
              line-height: 1.6;
            }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
            .name { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
            .title { font-size: 14px; color: #0284c7; font-weight: 600; margin-top: 4px; }
            .section { margin-bottom: 18px; }
            .section-title { font-size: 14px; font-weight: bold; color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
            .experience-item { margin-bottom: 12px; }
            .job-title { font-weight: bold; font-size: 13px; }
            .company { color: #64748b; font-size: 12px; }
            ul { margin: 6px 0 0 0; padding-right: 18px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="name">فردوس کاظمی</h1>
            <div class="title">مهندس ارشد نرم‌افزار | Senior Software Engineer</div>
            <div style="font-size: 11px; color: #475569; margin-top: 6px;">
              ایمیل: ferdous@example.com | موقعیت: کابل / دورکاری | شماره: ۰۷۹۱۲۳۴۵۶۷
            </div>
          </div>
          <div class="section">
            <div class="section-title">سوابق شغلی</div>
            <div class="experience-item">
              <div class="job-title">توسعه‌دهنده ارشد فول‌استک</div>
              <div class="company">شرکت فناوری داده‌پرداز (۱۴۰۰ - اکنون)</div>
              <ul>
                <li>طراحی و توسعه سامانه‌های توزیع‌شده با کارایی بالا بر بستر Node.js و React</li>
                <li>پیاده‌سازی پایپ‌لاین‌های استخراج داده و اتوماسیون فرایندهای کسب‌وکار</li>
              </ul>
            </div>
          </div>
          <div class="section">
            <div class="section-title">مهارت‌های تخصصی</div>
            <p style="font-size: 12px; margin: 0;">
              TypeScript, React 19, Node.js, Rust, Tauri 2, PostgreSQL, SQLite, Tailwind CSS
            </p>
          </div>
        </body>
      </html>
    `;

    await page.setContent(resumeHtml, { waitUntil: 'load' });
    await page.pdf({
      path: outputPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    if (!fs.existsSync(outputPdfPath)) {
      throw new Error('PDF file was not created!');
    }

    const stats = fs.statSync(outputPdfPath);
    console.log(`Persian RTL PDF generated successfully! Size: ${stats.size} bytes at: ${outputPdfPath}`);

    if (stats.size < 1000) {
      throw new Error(`PDF size too small: ${stats.size}`);
    }

    console.log('Persian RTL PDF spike PASSED!');
  } finally {
    await context.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runPdfSpike().catch((err) => {
  console.error('PDF spike failed:', err);
  process.exit(1);
});
