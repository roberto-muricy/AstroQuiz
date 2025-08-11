// Configuração de idiomas suportados
export const SUPPORTED_LANGUAGES = {
  pt: {
    code: 'pt',
    name: 'Português',
    flag: '🇧🇷',
    nativeName: 'Português'
  },
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    nativeName: 'English'
  },
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    nativeName: 'Español'
  },
  fr: {
    code: 'fr',
    name: 'Français',
    flag: '🇫🇷',
    nativeName: 'Français'
  }
};

// Lista de códigos de idioma
export const LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES);

// Idioma padrão
export const DEFAULT_LANGUAGE = 'pt';

// Função para obter informações de um idioma
export function getLanguageInfo(languageCode) {
  return SUPPORTED_LANGUAGES[languageCode] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
}

// Função para verificar se um idioma é suportado
export function isLanguageSupported(languageCode) {
  return LANGUAGE_CODES.includes(languageCode);
}
