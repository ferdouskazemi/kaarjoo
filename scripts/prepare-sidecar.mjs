import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BINARIES_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src-tauri', 'binaries');
const NODE_VERSION = process.env.KAARJOO_NODE_VERSION || 'v22.14.0';

const TRIPLE_CONFIG = {
  'x86_64-pc-windows-msvc': {
    archive: `node-${NODE_VERSION}-win-x64.zip`,
    innerBin: `node-${NODE_VERSION}-win-x64/node.exe`,
    outFile: 'node-x86_64-pc-windows-msvc.exe',
    isZip: true,
  },
  'aarch64-apple-darwin': {
    archive: `node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    innerBin: `node-${NODE_VERSION}-darwin-arm64/bin/node`,
    outFile: 'node-aarch64-apple-darwin',
    isZip: false,
  },
  'x86_64-apple-darwin': {
    archive: `node-${NODE_VERSION}-darwin-x64.tar.gz`,
    innerBin: `node-${NODE_VERSION}-darwin-x64/bin/node`,
    outFile: 'node-x86_64-apple-darwin',
    isZip: false,
  },
};

function detectHostTriple() {
  const platform = os.platform();
  const arch = os.arch();
  if (platform === 'win32') return ['x86_64-pc-windows-msvc'];
  if (platform === 'darwin') {
    // Universal macOS bundles need both ARM64 and x64 sidecars
    return ['aarch64-apple-darwin', 'x86_64-apple-darwin'];
  }
  throw new Error(`Unsupported host platform/arch for Kaarjoo release: ${platform}/${arch}`);
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const triples = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--triple' && args[i + 1]) {
      triples.push(args[++i]);
    } else if (args[i] === '--all-mac') {
      triples.push('aarch64-apple-darwin', 'x86_64-apple-darwin');
    } else if (args[i] === '--all') {
      triples.push(...Object.keys(TRIPLE_CONFIG));
    }
  }
  return triples.length > 0 ? triples : detectHostTriple();
}

async function prepareTriple(triple, shasumsText) {
  const cfg = TRIPLE_CONFIG[triple];
  if (!cfg) {
    throw new Error(`Unknown target triple: ${triple}`);
  }

  fs.mkdirSync(BINARIES_DIR, { recursive: true });
  const destPath = path.join(BINARIES_DIR, cfg.outFile);

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 10_000_000) {
    console.log(`[prepare-sidecar] Already present (${triple}): ${destPath}`);
    return;
  }

  const expectedLine = shasumsText
    .split('\n')
    .find((line) => line.trim().endsWith(`  ${cfg.archive}`));
  if (!expectedLine) {
    throw new Error(`Could not find SHA-256 entry for ${cfg.archive} in SHASUMS256.txt`);
  }
  const expectedSha = expectedLine.trim().split(/\s+/)[0];

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaarjoo-node-'));
  const archivePath = path.join(tmpDir, cfg.archive);
  const url = `https://nodejs.org/dist/${NODE_VERSION}/${cfg.archive}`;

  try {
    console.log(`[prepare-sidecar] Downloading ${url}...`);
    const buf = await downloadFile(url, archivePath);
    const actualSha = createHash('sha256').update(buf).digest('hex');
    if (actualSha !== expectedSha) {
      throw new Error(`SHA-256 mismatch for ${cfg.archive}: expected ${expectedSha}, got ${actualSha}`);
    }
    console.log(`[prepare-sidecar] Verified SHA-256 for ${cfg.archive}`);

    if (cfg.isZip) {
      execFileSync('powershell', [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${tmpDir}' -Force`,
      ]);
    } else {
      execFileSync('tar', ['-xzf', archivePath, '-C', tmpDir]);
    }

    const extractedBin = path.join(tmpDir, cfg.innerBin);
    if (!fs.existsSync(extractedBin)) {
      throw new Error(`Extracted Node binary not found at ${extractedBin}`);
    }

    fs.copyFileSync(extractedBin, destPath);
    if (!cfg.isZip) {
      fs.chmodSync(destPath, 0o755);
    }
    console.log(`[prepare-sidecar] Staged ${destPath}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const triples = parseArgs();
  console.log(`[prepare-sidecar] Target triples: ${triples.join(', ')}`);

  // Check if all requested triples already exist before hitting network
  const missing = triples.filter((t) => {
    const cfg = TRIPLE_CONFIG[t];
    if (!cfg) return true;
    const p = path.join(BINARIES_DIR, cfg.outFile);
    return !(fs.existsSync(p) && fs.statSync(p).size > 10_000_000);
  });

  if (missing.length === 0) {
    console.log('[prepare-sidecar] All sidecar binaries already present.');
    return;
  }

  const shasumsUrl = `https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt`;
  console.log(`[prepare-sidecar] Fetching ${shasumsUrl}...`);
  const shasumsText = await fetchText(shasumsUrl);

  for (const triple of missing) {
    await prepareTriple(triple, shasumsText);
  }
}

main().catch((err) => {
  console.error('[prepare-sidecar] Failed:', err);
  process.exit(1);
});
