/**
 * Pseudo-localization generator (en-XA)
 * Replaces standard ASCII characters with accented counterparts and expands length by ~30%
 * with wrapper brackets [!!! ... !!!] to detect text clipping and untranslated hardcoded strings.
 */
const ACCENT_MAP: Record<string, string> = {
  a: 'à',
  b: 'ƀ',
  c: 'ç',
  d: 'đ',
  e: 'é',
  f: 'ƒ',
  g: 'ğ',
  h: 'ĥ',
  i: 'î',
  j: 'ĵ',
  k: 'ƙ',
  l: 'ℓ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ô',
  p: 'ƥ',
  q: 'ʠ',
  r: 'ř',
  s: 'š',
  t: 'ŧ',
  u: 'û',
  v: 'ṽ',
  w: 'ŵ',
  x: 'х',
  y: 'ý',
  z: 'ž',
  A: 'À',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Đ',
  E: 'É',
  F: 'Ƒ',
  G: 'Ğ',
  H: 'Ĥ',
  I: 'Î',
  J: 'Ĵ',
  K: 'Ƙ',
  L: 'Ł',
  M: 'Ṃ',
  N: 'Ñ',
  O: 'Ô',
  P: 'Ƥ',
  Q: 'Ǫ',
  R: 'Ř',
  S: 'Š',
  T: 'Ŧ',
  U: 'Û',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

export function pseudolocalize(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Preserve interpolation tokens like {{count}} or {name}
  const parts = text.split(/(\{\{[^}]+\}\}|\{[^}]+\})/g);

  const transformed = parts
    .map((part) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        return part;
      }
      return part
        .split('')
        .map((ch) => ACCENT_MAP[ch] || ch)
        .join('');
    })
    .join('');

  return `[!!! ${transformed} !!!]`;
}

export function generatePseudoDictionary(sourceObj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(sourceObj)) {
    if (typeof val === 'string') {
      result[key] = pseudolocalize(val);
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      result[key] = generatePseudoDictionary(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}
