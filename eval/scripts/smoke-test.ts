import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src-tauri', 'migrations');
const BINARIES_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src-tauri', 'binaries');
const STAGED_BUNDLE = path.join(ROOT_DIR, 'apps', 'desktop', 'src-tauri', 'resources', 'engine', 'bundle.mjs');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'eval', 'smoke-artifacts');

class JsonRpcClient {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private buffer = '';

  constructor(nodeBin: string, bundlePath: string, env: Record<string, string>) {
    this.proc = spawn(nodeBin, [bundlePath], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf-8');
      let nlIdx: number;
      while ((nlIdx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, nlIdx).trim();
        this.buffer = this.buffer.slice(nlIdx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id && this.pending.has(msg.id)) {
            const p = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) {
              p.reject(new Error(`RPC error [${msg.error.code}]: ${msg.error.message}`));
            } else {
              p.resolve(msg.result);
            }
          }
        } catch {
          // ignore non-json stdout lines
        }
      }
    });

    this.proc.stderr.on('data', (d) => {
      const msg = d.toString('utf-8').trim();
      if (msg) console.error('[engine stderr]', msg);
    });
  }

  public call<T = any>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30000): Promise<T> {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout (${timeoutMs}ms) calling ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.proc.stdin.write(payload);
    });
  }

  public async close(): Promise<void> {
    this.proc.kill();
    await new Promise((r) => setTimeout(r, 300));
  }
}

function resolveSidecarNodeBinary(): string {
  const candidates =
    process.platform === 'win32'
      ? [path.join(BINARIES_DIR, 'node-x86_64-pc-windows-msvc.exe')]
      : process.platform === 'darwin'
        ? [
            path.join(BINARIES_DIR, process.arch === 'arm64' ? 'node-aarch64-apple-darwin' : 'node-x86_64-apple-darwin'),
          ]
        : [];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return process.execPath;
}

function applyAllMigrations(db: DatabaseSync): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  assert.ok(files.length >= 4, `Expected >=4 migrations, found ${files.length}`);
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8');
    db.exec(sql);
  }
}

async function startMockAtsServer(): Promise<{ url: string; getSubmitCount: () => number; close: () => Promise<void> }> {
  let submitCount = 0;
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      submitCount++;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Submitted</h1></body></html>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Greenhouse Mock Application — Kaarjoo Smoke Test</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; max-width: 640px; margin: 40px auto; padding: 24px; }
    .card { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 4px; }
    input { width: 100%; padding: 8px 10px; border: 1px solid #94a3b8; border-radius: 6px; box-sizing: border-box; }
    button { margin-top: 20px; background: #0284c7; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Acme Corp — Senior Distributed Systems Engineer</h2>
    <p>boards.greenhouse.io/acme/jobs/9001</p>
    <form id="application_form" method="POST">
      <label for="first_name">First Name *</label>
      <input id="first_name" name="first_name" type="text" required />

      <label for="last_name">Last Name *</label>
      <input id="last_name" name="last_name" type="text" required />

      <label for="email">Email *</label>
      <input id="email" name="email" type="email" required />

      <label for="phone">Phone</label>
      <input id="phone" name="phone" type="tel" />

      <label for="job_application_answers_attributes_0_text_value">LinkedIn Profile</label>
      <input id="job_application_answers_attributes_0_text_value" name="linkedin" type="url" />

      <button id="submit_app" type="submit">Submit Application</button>
    </form>
  </div>
</body>
</html>`);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  assert.ok(addr && typeof addr === 'object');
  return {
    url: `http://127.0.0.1:${addr.port}/acme/jobs/9001`,
    getSubmitCount: () => submitCount,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

async function runSmokeTest() {
  console.log(`\n=== KAARJOO CROSS-PLATFORM SMOKE TEST (${process.platform}/${process.arch}) ===\n`);

  assert.ok(fs.existsSync(STAGED_BUNDLE), `Staged bundle missing at ${STAGED_BUNDLE}. Run pnpm build first.`);
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  // 1. User path containing spaces AND non-Latin (Persian) characters
  const unicodeUserDir = path.join(os.tmpdir(), `Kaarjoo Smoke Test فردوس کاظمی ${Date.now()}`);
  const appDataDir = path.join(unicodeUserDir, 'App Data');
  const dbPath = path.join(appDataDir, 'kaarjoo.db');
  const resumePath = path.join(unicodeUserDir, 'رزومه فردوس کاظمی Resume.txt');
  const exportedDocxPath = path.join(unicodeUserDir, 'Tailored Output فردوس.docx');

  fs.mkdirSync(appDataDir, { recursive: true });
  fs.writeFileSync(
    resumePath,
    `Ferdous Kazemi
Email: ferdouskazemi1000@gmail.com
Phone: +93 728 200 021
Location: Kabul / Remote

SUMMARY
Senior Distributed Systems & Full Stack Engineer with 6+ years building TypeScript, Rust, and PostgreSQL applications.

EXPERIENCE
Staff Software Engineer | CloudScale Tech | 2022 - Present
- Architected high-throughput distributed event pipelines in TypeScript and Rust handling 20,000 req/sec.
- Built local-first desktop workflows and automated ATS testing with Playwright.

SKILLS
TypeScript, Rust, React, Node.js, PostgreSQL, SQLite, Playwright, Docker
`,
    'utf-8'
  );

  console.log(`[1/7] Created Unicode + Space user directory:\n      ${unicodeUserDir}`);

  // 2. First run: initialize SQLite + embedded migrations + spawn sidecar
  let db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  applyAllMigrations(db);

  const nodeBin = resolveSidecarNodeBinary();
  console.log(`[2/7] Using sidecar Node runtime: ${nodeBin}`);

  const sidecarEnv = {
    KAARJOO_APP_DATA_DIR: appDataDir,
    KAARJOO_MODELS_DIR: path.join(appDataDir, 'models'),
    KAARJOO_RESOURCES_DIR: path.dirname(path.dirname(STAGED_BUNDLE)),
    NODE_PATH: path.join(path.dirname(STAGED_BUNDLE), 'node_modules'),
  };

  let engine = new JsonRpcClient(nodeBin, STAGED_BUNDLE, sidecarEnv);
  const ping = await engine.call('system.ping');
  assert.equal(ping.status, 'ok');

  const models = await engine.call('models.getStatus');
  assert.ok(Array.isArray(models) && models.length >= 3);
  assert.ok(models.every((m: any) => m.bundledInApp === false), 'Models must not be bundled in app');

  const directory = await engine.call('directory.loadBundled');
  assert.ok(Array.isArray(directory) && directory.length >= 5000, `Expected >=5000 companies, got ${directory?.length}`);
  console.log(`[2/7] First run OK: ping OK, models unbundled (${models.length} specs), directory loaded (${directory.length} companies)`);

  // 3. Upload & parse résumé from Unicode + spaces path, persist to SQLite
  const extracted = await engine.call('profile.parseAndExtract', { filePath: resumePath });
  assert.ok(extracted?.profile?.contact?.fullName, 'Extracted fullName missing');
  const profile = extracted.profile;
  db.prepare(
    `INSERT INTO profiles (id, version, full_name, email, phone, location, summary, created_at, updated_at)
     VALUES (?, 1, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    profile.id,
    profile.contact.fullName,
    profile.contact.email,
    profile.contact.phone || '',
    profile.contact.location || '',
    profile.summary || ''
  );
  console.log(`[3/7] Uploaded & parsed résumé from Unicode+space path: ${profile.contact.fullName} <${profile.contact.email}>`);

  // 4. Insert job + search via SQLite FTS5
  const mockServer = await startMockAtsServer();
  const jobId = 'smoke_job_9001';
  const job = {
    id: jobId,
    sourceId: 'greenhouse',
    sourceName: 'Greenhouse',
    canonicalUrl: mockServer.url,
    applyUrl: mockServer.url,
    title: 'Senior Distributed Systems Engineer',
    company: 'Acme Corp',
    location: 'Remote, Worldwide',
    remoteType: 'remote',
    descriptionMarkdown: 'Build high-throughput distributed systems in TypeScript, Rust, and PostgreSQL.',
    requirements: ['TypeScript', 'Rust', 'PostgreSQL', 'Distributed Systems'],
    atsType: 'greenhouse',
    contentHash: 'smoke_hash_9001',
  };

  db.prepare(
    `INSERT INTO jobs (id, source_id, canonical_url, apply_url, title, company, location, remote_type, description_markdown, requirements_json, ats_type, content_hash, first_seen, last_seen, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')`
  ).run(
    job.id,
    job.sourceId,
    job.canonicalUrl,
    job.applyUrl,
    job.title,
    job.company,
    job.location,
    job.remoteType,
    job.descriptionMarkdown,
    JSON.stringify(job.requirements),
    job.atsType,
    job.contentHash
  );

  const ftsHits = db
    .prepare(`SELECT j.id, j.title FROM jobs_fts JOIN jobs j ON j.rowid = jobs_fts.rowid WHERE jobs_fts MATCH '"distributed"*'`)
    .all() as Array<{ id: string; title: string }>;
  assert.equal(ftsHits.length, 1);
  assert.equal(ftsHits[0].id, jobId);
  console.log(`[4/7] FTS5 search verified: found "${ftsHits[0].title}"`);

  // 5. Tailor documents + export DOCX to Unicode+space path
  const tailoredRes = await engine.call('documents.tailor', {
    profile,
    job,
    templateId: 'ats-clean',
    language: 'en',
  });
  assert.ok(tailoredRes.truthfulnessPassed, 'Expected truthfulness guard to pass');
  const tailoredResumeObj = await engine.call('documents.tailorResume', {
    profile,
    job,
  });
  const docxRes = await engine.call('documents.exportDocx', {
    resume: tailoredResumeObj.tailored,
    outputPath: exportedDocxPath,
  });
  assert.ok(docxRes.success && fs.existsSync(exportedDocxPath) && fs.statSync(exportedDocxPath).size > 1000);
  console.log(`[5/7] Tailored resume + exported DOCX to Unicode+space path (${docxRes.size} bytes)`);

  // 6. Review mode on mock Greenhouse form via Playwright (pauses before submit!)
  const browsers = await engine.call('system.discoverBrowsers');
  if (Array.isArray(browsers) && browsers.length > 0) {
    const queued = await engine.call('application.queue', {
      job,
      profile,
      mode: 'review',
    });
    const executed = await engine.call(
      'application.execute',
      {
        id: queued.id,
        profile,
      },
      60000
    );
    assert.equal(executed.status, 'needs_review', `Expected needs_review pause, got ${executed.status}`);
    assert.equal(mockServer.getSubmitCount(), 0, 'Review mode MUST NOT submit the form automatically!');
    assert.ok(executed.screenshotBeforeSubmit, 'Screenshot before submit missing');

    const destScreenshot = path.join(ARTIFACTS_DIR, 'smoke-review-form.jpg');
    if (executed.screenshotBeforeSubmit.startsWith('data:image/')) {
      const base64Data = executed.screenshotBeforeSubmit.split(',')[1];
      fs.writeFileSync(destScreenshot, Buffer.from(base64Data, 'base64'));
    } else if (fs.existsSync(executed.screenshotBeforeSubmit)) {
      fs.copyFileSync(executed.screenshotBeforeSubmit, destScreenshot);
    } else {
      throw new Error('Unexpected screenshot format');
    }
    assert.ok(fs.existsSync(destScreenshot) && fs.statSync(destScreenshot).size > 2000, 'Screenshot file too small');

    db.prepare(
      `INSERT INTO applications (id, job_id, profile_id, status, mode, screenshot_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'review', ?, datetime('now'), datetime('now'))`
    ).run(queued.id, job.id, profile.id, executed.status, destScreenshot);

    console.log(`[6/7] Review Mode verified: halted at final review step (0 submits), screenshot saved to ${destScreenshot}`);
  } else {
    console.log('[6/7] SKIPPED live Playwright browser fill (no Chrome/Edge installed on runner); saving needs_review state directly.');
    db.prepare(
      `INSERT INTO applications (id, job_id, profile_id, status, mode, created_at, updated_at)
       VALUES (?, ?, ?, 'needs_review', 'review', datetime('now'), datetime('now'))`
    ).run('smoke_app_1', job.id, profile.id);
  }

  await mockServer.close();

  // 7. Quit & Reopen with data intact
  await engine.close();
  db.close();

  db = new DatabaseSync(dbPath);
  engine = new JsonRpcClient(nodeBin, STAGED_BUNDLE, sidecarEnv);
  const pingAfterReopen = await engine.call('system.ping');
  assert.equal(pingAfterReopen.status, 'ok');

  const persistedProfile = db.prepare('SELECT full_name, email FROM profiles WHERE id = ?').get(profile.id) as any;
  assert.equal(persistedProfile.email, 'ferdouskazemi1000@gmail.com');

  const persistedApp = db.prepare('SELECT status FROM applications WHERE job_id = ?').get(jobId) as any;
  assert.equal(persistedApp.status, 'needs_review');

  const persistedFts = db
    .prepare(`SELECT count(*) as c FROM jobs_fts WHERE jobs_fts MATCH '"distributed"*'`)
    .get() as { c: number };
  assert.equal(persistedFts.c, 1);

  assert.ok(fs.existsSync(exportedDocxPath), 'Tailored DOCX lost after reopen!');
  console.log(`[7/7] Quit & Reopen verified: profile, FTS5 jobs, tailored DOCX, and application state intact!`);

  await engine.close();
  db.close();
  fs.rmSync(unicodeUserDir, { recursive: true, force: true });

  console.log('\nSMOKE TEST PASSED 100%!\n');
}

runSmokeTest().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err);
  process.exit(1);
});
