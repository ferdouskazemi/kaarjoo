import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BrowserInfo } from '@kaarjoo/shared';

/**
 * Discovers installed browsers on the host system (Chrome, Edge, Brave).
 * Implements heuristics adapted from open-antigravity-patcher's discovery logic.
 */
export function discoverSystemBrowsers(): BrowserInfo[] {
  const platform = os.platform();
  const browsers: BrowserInfo[] = [];

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const windowsCandidates: Array<{ name: BrowserInfo['name']; paths: string[] }> = [
      {
        name: 'chrome',
        paths: [
          path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ],
      },
      {
        name: 'msedge',
        paths: [
          path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ],
      },
      {
        name: 'brave',
        paths: [
          path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
          path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        ],
      },
    ];

    for (const item of windowsCandidates) {
      for (const candidatePath of item.paths) {
        if (fs.existsSync(candidatePath)) {
          browsers.push({
            name: item.name,
            executablePath: candidatePath,
            isDefault: item.name === 'chrome' || item.name === 'msedge',
          });
          break; // take first existing for this browser
        }
      }
    }
  } else if (platform === 'darwin') {
    const home = os.homedir();
    const macCandidates: Array<{ name: BrowserInfo['name']; paths: string[] }> = [
      {
        name: 'chrome',
        paths: [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        ],
      },
      {
        name: 'msedge',
        paths: [
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          path.join(home, 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
        ],
      },
      {
        name: 'brave',
        paths: [
          '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
          path.join(home, 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser'),
        ],
      },
    ];

    for (const item of macCandidates) {
      for (const candidatePath of item.paths) {
        if (fs.existsSync(candidatePath)) {
          browsers.push({
            name: item.name,
            executablePath: candidatePath,
            isDefault: item.name === 'chrome',
          });
          break;
        }
      }
    }
  } else {
    // Linux / POSIX
    const linuxCandidates: Array<{ name: BrowserInfo['name']; binaries: string[] }> = [
      { name: 'chrome', binaries: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'] },
      { name: 'chromium', binaries: ['/usr/bin/chromium', '/usr/bin/chromium-browser'] },
      { name: 'msedge', binaries: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'] },
      { name: 'brave', binaries: ['/usr/bin/brave-browser'] },
    ];

    for (const item of linuxCandidates) {
      for (const bin of item.binaries) {
        if (fs.existsSync(bin)) {
          browsers.push({
            name: item.name,
            executablePath: bin,
            isDefault: item.name === 'chrome',
          });
          break;
        }
      }
    }
  }

  return browsers;
}
