import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations, supportedLanguages } from './translations';

const resources = {
  en: { translation: translations.en },
  pt: { translation: translations.pt },
  fr: { translation: translations.fr },
  es: { translation: translations.es }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
