import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { CompanyBoard, DirectoryManifest } from '@kaarjoo/shared';
import type { PoliteHttpClient } from '../network/client.js';

let cachedDirectory: CompanyBoard[] | null = null;
let cachedManifest: DirectoryManifest | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveCompanyAsset(fileName: string): string {
  const candidates = [
    resolve(__dirname, fileName),
    process.env.KAARJOO_RESOURCES_DIR
      ? resolve(process.env.KAARJOO_RESOURCES_DIR, 'engine', fileName)
      : '',
    process.env.KAARJOO_RESOURCES_DIR
      ? resolve(process.env.KAARJOO_RESOURCES_DIR, fileName)
      : '',
    resolve(__dirname, '../src/companies', fileName),
    resolve(process.cwd(), 'packages/adapters/src/companies', fileName),
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return resolve(__dirname, fileName);
}

export function loadBundledManifest(): DirectoryManifest {
  if (cachedManifest) return cachedManifest;

  const manifestPath = resolveCompanyAsset('manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  cachedManifest = JSON.parse(raw) as DirectoryManifest;
  return cachedManifest;
}

export function loadBundledDirectory(): CompanyBoard[] {
  if (cachedDirectory) return cachedDirectory;

  const gzPath = resolveCompanyAsset('directory.json.gz');
  const buffer = readFileSync(gzPath);

  // Verify SHA-256 integrity
  const manifest = loadBundledManifest();
  const hash = createHash('sha256').update(buffer).digest('hex');
  if (manifest.sha256 && hash !== manifest.sha256) {
    throw new Error(`Directory integrity verification failed: expected ${manifest.sha256}, got ${hash}`);
  }

  const jsonStr = gunzipSync(buffer).toString('utf-8');
  cachedDirectory = JSON.parse(jsonStr) as CompanyBoard[];
  return cachedDirectory;
}

/**
 * Checks for a remote directory manifest update.
 */
export async function checkDirectoryUpdate(
  currentVersion: string,
  httpClient: PoliteHttpClient,
  manifestUrl = 'https://raw.githubusercontent.com/ferdouskazemi/kaarjoo/master/packages/adapters/src/companies/manifest.json'
): Promise<{ hasUpdate: boolean; newManifest?: DirectoryManifest }> {
  try {
    const res = await httpClient.fetch(manifestUrl, {
      rateLimitPerMinute: 30,
      checkRobots: false,
      maxRetries: 1,
    });

    if (res.status === 200) {
      const manifest = await res.json<DirectoryManifest>();
      if (manifest?.version && manifest.version !== currentVersion) {
        return { hasUpdate: true, newManifest: manifest };
      }
    }
  } catch {
    // If offline or network error, quietly report no update
  }

  return { hasUpdate: false };
}
