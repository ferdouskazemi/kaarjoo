import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Ensures a binary or .app bundle on macOS has valid ad-hoc signature and is free of quarantine flags.
 * Crucial for Apple Silicon running local Node sidecar and native llama.cpp addons.
 * Adapted from resign_macos_bundle / resign_macos_binary in open-antigravity-patcher.
 */
export async function prepareMacOSBinary(targetPath: string): Promise<boolean> {
  if (os.platform() !== 'darwin') {
    return true;
  }

  try {
    // 1. Remove immutable flags if any
    try {
      await execFileAsync('chflags', ['-R', 'nouchg', targetPath], { timeout: 30000 });
    } catch {
      // ignore
    }

    // 2. Remove quarantine flag
    try {
      await execFileAsync('xattr', ['-dr', 'com.apple.quarantine', targetPath], { timeout: 30000 });
    } catch {
      // ignore
    }

    // 3. Ad-hoc re-sign
    await execFileAsync('codesign', ['--force', '--deep', '--sign', '-', targetPath], { timeout: 60000 });
    return true;
  } catch (err) {
    console.warn(`[codesign] Warning: failed to sign ${targetPath}:`, err);
    return false;
  }
}
