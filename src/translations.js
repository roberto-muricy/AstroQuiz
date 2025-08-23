// Este arquivo força a inclusão de todas as traduções no build
// Importar explicitamente todos os arquivos de tradução

import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';
import translationES from './locales/es/translation.json';
import translationFR from './locales/fr/translation.json';

export const translations = {
  en: translationEN,
  pt: translationPT,
  es: translationES,
  fr: translationFR
};

export const supportedLanguages = ['en', 'pt', 'es', 'fr'];

// Verificar se todas as traduções estão presentes
export const validateTranslations = () => {
  const missing = [];
  
  supportedLanguages.forEach(lang => {
    if (!translations[lang]) {
      missing.push(lang);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ Traduções faltando:', missing);
    return false;
  }
  
  console.log('✅ Todas as traduções estão presentes:', supportedLanguages);
  return true;
};

// Executar validação em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  validateTranslations();
}
