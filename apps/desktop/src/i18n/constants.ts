export const TARGET_LANGUAGE_LABELS = {
  fa: 'English',
  en: 'فارسی',
} as const;

export const LANGUAGE_NAMES = {
  en: 'English',
  fa: 'فارسی',
} as const;

export type SupportedLanguage = keyof typeof TARGET_LANGUAGE_LABELS;
