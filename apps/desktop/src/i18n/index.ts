import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import faTranslation from './fa.json';
import enTranslation from './en.json';

i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: faTranslation },
    en: { translation: enTranslation },
  },
  lng: 'fa', // Persian default as specified in prompt
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(lang: 'fa' | 'en') {
  i18n.changeLanguage(lang);
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export default i18n;
