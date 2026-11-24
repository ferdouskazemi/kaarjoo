import { describe, it, expect } from 'vitest';
import { pseudolocalize, generatePseudoDictionary } from '../pseudo.js';
import en from '../en.json';

describe('Pseudo-localization (en-XA)', () => {
  it('correctly transforms English text with accents and expansion brackets', () => {
    const input = 'Application Queue';
    const output = pseudolocalize(input);
    expect(output).toContain('[!!!');
    expect(output).toContain('!!!]');
    expect(output.length).toBeGreaterThan(input.length);
  });

  it('preserves interpolation brackets', () => {
    const input = 'Showing {{count}} openings';
    const output = pseudolocalize(input);
    expect(output).toContain('{{count}}');
  });

  it('generates a full pseudo dictionary matching en schema', () => {
    const pseudo = generatePseudoDictionary(en);
    expect(pseudo.nav.home).toBeDefined();
    expect(pseudo.nav.home).toContain('[!!!');
    expect(pseudo.settings.title).toContain('[!!!');
  });
});
