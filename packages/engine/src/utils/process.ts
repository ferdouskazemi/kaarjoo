import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Cleanly terminates processes by name (e.g. leftover browser or sidecar processes).
 * Adapted from terminate_processes in open-antigravity-patcher.
 */
export async function terminateProcesses(names: string[]): Promise<boolean> {
  const isWindows = os.platform() === 'win32';
  let anySuccess = false;

  for (const name of names) {
    try {
      if (isWindows) {
        const exeName = name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`;
        await execFileAsync('taskkill', ['/F', '/IM', exeName], { timeout: 10000 });
        anySuccess = true;
      } else {
        await execFileAsync('pkill', ['-f', name], { timeout: 10000 });
        anySuccess = true;
      }
    } catch {
      // Process was either not running or permission denied; ignore
    }
  }

  return anySuccess;
}
