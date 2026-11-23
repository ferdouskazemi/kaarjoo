import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Atomically writes data to a file by writing to a safe temporary file first,
 * flushing buffers, fsyncing, and then atomically renaming it to the target path.
 * Modeled after atomic_replace_posix in open-antigravity-patcher.
 */
export async function atomicWriteFile(targetPath: string, data: string | Buffer): Promise<void> {
  const resolved = path.resolve(targetPath);
  const dir = path.dirname(resolved);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const randSuffix = crypto.randomBytes(6).toString('hex');
  const tempPath = path.join(dir, `.${path.basename(resolved)}.${randSuffix}.tmp`);

  const fd = fs.openSync(tempPath, 'w');
  try {
    if (typeof data === 'string') {
      fs.writeFileSync(fd, data, 'utf-8');
    } else {
      fs.writeFileSync(fd, data);
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    // Atomic replacement
    fs.renameSync(tempPath, resolved);
  } catch (err) {
    try {
      fs.closeSync(fd);
    } catch {
      // ignore
    }
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
    throw err;
  }
}
