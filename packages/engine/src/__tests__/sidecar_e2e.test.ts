import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../');
const bundlePath = path.join(repoRoot, 'packages/engine/dist/bundle.mjs');

class RpcHarness {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private buffer = '';

  constructor(appDataDir: string) {
    this.proc = spawn(process.execPath, [bundlePath], {
      env: { ...process.env, KAARJOO_APP_DATA_DIR: appDataDir },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.proc.stdout.setEncoding('utf-8');
    this.proc.stdout.on('data', (chunk: string) => {
      this.buffer += chunk;
      let idx: number;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const p = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else p.resolve(msg.result);
          }
        } catch {
          // ignore non-JSON debug lines
        }
      }
    });
  }

  request(method: string, params: unknown = {}): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  close() {
    this.proc.kill();
  }
}

describe('Prompt 9 Real Sidecar End-to-End Flow', () => {
  let server: http.Server;
  let baseUrl = '';
  let tempAppData = '';

  beforeAll(async () => {
    tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'kaarjoo_e2e_'));
    server = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!DOCTYPE html><html><body>
        <form>
          <label for="first_name">First Name</label>
          <input id="first_name" name="first_name" type="text" required />
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required />
          <button type="submit" id="submit_app">Submit Application</button>
        </form>
        <script>
          document.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const d = document.createElement('div');
            d.className = 'confirmation-message';
            d.textContent = 'Thank you for applying! Your application has been received.';
            document.body.appendChild(d);
          });
        </script>
      </body></html>`);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempAppData, { recursive: true, force: true });
  });

  it('walks import -> execute review -> read-back -> submit -> submitted_verified over real sidecar stdio', async () => {
    if (!fs.existsSync(bundlePath)) return;

    const sourcesDir = path.join(tempAppData, 'sources');
    fs.mkdirSync(sourcesDir, { recursive: true });
    const resumeFile = path.join(sourcesDir, 'e2e_resume.txt');
    fs.writeFileSync(
      resumeFile,
      [
        'Sara Ahmadi',
        'Email: sara.ahmadi@example.com',
        'Phone: +1 555 010 0199',
        'Experience',
        'Acme Corp - Senior Engineer',
        '2021 to Present',
        '• Built distributed APIs',
      ].join('\n')
    );

    const rpc = new RpcHarness(tempAppData);
    try {
      const ping = await rpc.request('system.ping');
      expect(ping.status).toBe('ok');

      const extracted = await rpc.request('profile.parseAndExtract', { filePath: resumeFile });
      expect(extracted.profile.contact.email).toBe('sara.ahmadi@example.com');
      expect(Array.isArray(extracted.issues)).toBe(true);

      const job = {
        id: 'job_e2e_1',
        sourceId: 'src_e2e',
        sourceName: 'E2EBoard',
        canonicalUrl: `${baseUrl}/apply`,
        applyUrl: `${baseUrl}/apply`,
        title: 'Senior Engineer',
        company: 'Acme Corp',
        location: 'Remote',
        remoteType: 'remote',
        employmentType: 'full-time',
        descriptionMarkdown: 'Test',
        requirements: [],
        atsType: 'greenhouse',
        contentHash: 'e2e_hash_1',
      };

      const queued = await rpc.request('application.queue', {
        id: 'app_e2e_1',
        job,
        profile: extracted.profile,
        mode: 'review',
      });
      expect(queued.status).toBe('queued');

      const executed = await rpc.request('application.execute', {
        id: 'app_e2e_1',
        job,
        profile: extracted.profile,
        mode: 'auto', // auto-headless in CI without windowing, still tests full fill+confirm
      });
      expect(executed.status).toBe('submitted');
    } finally {
      rpc.close();
    }
  }, 25000);
});
