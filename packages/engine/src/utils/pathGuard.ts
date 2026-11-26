import path from 'node:path';
import os from 'node:os';

export type AllowedEngineSubdir = 'sources' | 'exports' | 'screenshots' | 'browser-sessions';

export function getAppDataDir(): string {
  return path.resolve(process.env.KAARJOO_APP_DATA_DIR || os.tmpdir());
}

function normalizeForCompare(p: string): string {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * Ensures `candidate` has no NUL bytes or UNC prefix and resolves strictly inside `baseDir`.
 */
export function resolveWithinDir(baseDir: string, candidate: string): string {
  if (!candidate || typeof candidate !== 'string') {
    throw new Error('Path must be a non-empty string');
  }
  if (candidate.includes('\0')) {
    throw new Error('Path contains NUL byte');
  }
  if (candidate.startsWith('\\\\') || candidate.startsWith('//')) {
    throw new Error(`UNC paths are rejected: ${candidate}`);
  }

  const root = path.resolve(baseDir);
  const resolved = path.resolve(root, candidate);

  const normRoot = normalizeForCompare(root);
  const normResolved = normalizeForCompare(resolved);
  const rootPrefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;

  if (!normResolved.startsWith(rootPrefix)) {
    throw new Error(`Path traversal rejected: "${candidate}" escapes "${root}"`);
  }

  return resolved;
}

/**
 * Validates that an input/output path passed to an engine RPC method resides strictly
 * inside one of the allowed `appDataDir/<subdir>` directories.
 */
export function resolveAllowedEnginePath(
  candidate: string,
  allowedSubdirs: AllowedEngineSubdir[]
): string {
  if (!candidate || typeof candidate !== 'string') {
    throw new Error('Path must be a non-empty string');
  }
  if (candidate.includes('\0')) {
    throw new Error('Path contains NUL byte');
  }
  if (candidate.startsWith('\\\\') || candidate.startsWith('//')) {
    throw new Error(`UNC paths are rejected: ${candidate}`);
  }

  const resolved = path.resolve(candidate);
  const normResolved = normalizeForCompare(resolved);
  const appDataDir = getAppDataDir();

  for (const sub of allowedSubdirs) {
    const subRoot = path.resolve(appDataDir, sub);
    const normSub = normalizeForCompare(subRoot);
    const prefix = normSub.endsWith(path.sep) ? normSub : normSub + path.sep;
    if (normResolved.startsWith(prefix)) {
      return resolved;
    }
  }

  throw new Error(
    `Path "${candidate}" is outside allowed engine directories (${allowedSubdirs.join(', ')})`
  );
}

/**
 * Resolves an export filename inside `appDataDir/exports`, rejecting traversal sequences,
 * absolute paths, and UNC paths.
 */
export function resolveExportPath(filename: string | undefined, ext: '.pdf' | '.docx'): string {
  const exportsDir = path.resolve(getAppDataDir(), 'exports');
  const rawName = filename ?? `export_${Date.now()}${ext}`;

  if (
    rawName.includes('\0') ||
    rawName.includes('..') ||
    rawName.includes('/') ||
    rawName.includes('\\') ||
    rawName.startsWith('\\\\') ||
    /^[a-zA-Z]:/.test(rawName)
  ) {
    throw new Error(`Invalid export filename (path traversal or absolute path rejected): ${rawName}`);
  }

  const sanitized = rawName.replace(/[<>:"/\\|?*]/g, '_').trim();
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new Error('Invalid empty export filename');
  }
  const finalName = sanitized.toLowerCase().endsWith(ext) ? sanitized : `${sanitized}${ext}`;
  return resolveWithinDir(exportsDir, finalName);
}
