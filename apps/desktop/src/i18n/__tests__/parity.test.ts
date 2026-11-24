import { describe, it, expect } from 'vitest';
import en from '../en.json';
import fa from '../fa.json';

function flattenKeys(obj: Record<string, any>, prefix = ''): Record<string, string> {
  let result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result = { ...result, ...flattenKeys(value, fullKey) };
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

describe('i18n Key Parity Guard', () => {
  const enFlat = flattenKeys(en);
  const faFlat = flattenKeys(fa);

  it('contains the same set of keys in both English and Persian', () => {
    const enKeys = Object.keys(enFlat).sort();
    const faKeys = Object.keys(faFlat).sort();

    const missingInFa = enKeys.filter((k) => !(k in faFlat));
    const missingInEn = faKeys.filter((k) => !(k in enFlat));

    if (missingInFa.length > 0) {
      console.error('Keys missing in fa.json:', missingInFa);
    }
    if (missingInEn.length > 0) {
      console.error('Keys missing in en.json:', missingInEn);
    }

    expect(missingInFa).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(enKeys).toEqual(faKeys);
  });

  it('has no empty string values in en.json', () => {
    const emptyKeys = Object.entries(enFlat).filter(([_, v]) => !v || v.trim().length === 0);
    expect(emptyKeys).toEqual([]);
  });

  it('has no empty string values in fa.json', () => {
    const emptyKeys = Object.entries(faFlat).filter(([_, v]) => !v || v.trim().length === 0);
    expect(emptyKeys).toEqual([]);
  });
});
