import fs from 'node:fs';
import crypto from 'node:crypto';

/**
 * Calculates SHA-256 hash of a file using 1MB streams to avoid memory exhaustion with large GGUF models.
 * Adapted from file_hash in open-antigravity-patcher.
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}
