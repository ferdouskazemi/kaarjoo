import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { seedChromiumProfile } from '../utils/chromiumProfile.js';

describe('Chromium Profile Seeder (from flash-rive)', () => {
  it('safely attempts seeding without throwing errors on temporary profile directories', () => {
    const tempDir = path.join(os.tmpdir(), `test_seed_profile_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const result = seedChromiumProfile(tempDir);
    // On Windows, if Chrome or Edge exists, it returns true and writes Local State
    if (process.platform === 'win32') {
      const localStatePath = path.join(tempDir, 'Local State');
      if (fs.existsSync(localStatePath)) {
        const content = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
        expect(content.password_manager).toBeDefined();
        expect(typeof content.password_manager.os_password_blank).toBe('boolean');
      }
    }

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
