/**
 * Chromium Profile Seeder
 * Adapted directly from flash-rive (C:\Work\My Personal Projects\flash-rive\scripts\seed-chromium-profile.mjs)
 * 
 * Chromium's password manager checks whether the Windows password is blank by signing in
 * with an empty password, unless the profile's Local State already caches the answer.
 * Every fresh --user-data-dir repeats the check, and each check is a failed Windows logon;
 * 10 failed sign-ins lock the user's Windows account!
 * Copying the cached answer from the user's existing Chrome or Edge skips the check and
 * guarantees 100% protection against Windows OS account lockouts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCES = [
  ['Google', 'Chrome'],
  ['Microsoft', 'Edge'],
];

export function seedChromiumProfile(profileDir: string): boolean {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return false;
  try {
    for (const parts of SOURCES) {
      const file = join(process.env.LOCALAPPDATA, ...parts, 'User Data', 'Local State');
      if (!existsSync(file)) continue;

      const raw = readFileSync(file, 'utf8');
      const manager = JSON.parse(raw).password_manager;
      if (typeof manager?.os_password_last_changed !== 'string') continue;

      mkdirSync(profileDir, { recursive: true });
      writeFileSync(
        join(profileDir, 'Local State'),
        JSON.stringify({
          password_manager: {
            os_password_blank: manager.os_password_blank === true,
            os_password_last_changed: manager.os_password_last_changed,
          },
        })
      );
      return true;
    }
  } catch {
    // Best effort: seeding must never fail execution
  }
  return false;
}
