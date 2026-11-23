/**
 * Persian and English text normalizer for Kaarjoo resume processing.
 * Handles ZWNJ (نیم‌فاصله), letter unification (ي->ی, ك->ک, ۀ->هٔ),
 * and Persian/Arabic digit normalization.
 */

const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const DIGIT_REGEX = /[۰-۹٠-٩]/g;

export function normalizeDigits(text: string): string {
  return text.replace(DIGIT_REGEX, (char) => DIGIT_MAP[char] || char);
}

export function normalizePersianLetters(text: string): string {
  return text
    // Arabic Kaf to Persian Keheh
    .replace(/\u0643/g, '\u06a9')
    // Arabic Yeh and Alef Maksura to Persian Yeh
    .replace(/[\u0649\u064a]/g, '\u06cc')
    // Arabic Ta Marbuta to Teh or Heh depending on context, standard normalize
    .replace(/\u0629/g, '\u0647')
    // Normalize Hamza over Heh
    .replace(/\u06c0/g, '\u0647\u0654')
    // Normalize excessive Tatweel / Kashida
    .replace(/\u0640+/g, '')
    // Clean invisible non-standard ZWNJ duplicates
    .replace(/\u200c{2,}/g, '\u200c');
}

export function normalizeText(text: string): string {
  if (!text) return '';
  const step1 = normalizePersianLetters(text);
  const step2 = normalizeDigits(step1);
  // Split lines, trim each line of redundant spaces, filter empty lines excess, rejoin
  return step2
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
