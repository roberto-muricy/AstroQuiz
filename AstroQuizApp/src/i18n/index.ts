/**
 * Configuração de Internacionalização (i18n)
 * Usando react-i18next para suporte multilíngue
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traduções
import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt', // idioma padrão
    fallbackLng: 'pt',
    
    interpolation: {
      escapeValue: false, // React já escapa por padrão
    },
    
    // Não suspender enquanto carrega
    react: {
      useSuspense: false,
    },
  });

/**
 * Função para mudar o idioma
 */
export const changeLanguage = (locale: string) => {
  i18n.changeLanguage(locale);
};

/**
 * Função para obter o idioma atual
 */
export const getCurrentLanguage = () => {
  return i18n.language;
};

export default i18n;
