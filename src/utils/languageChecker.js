// Utilitário para verificar se todas as traduções estão disponíveis
import i18n from '../i18n';

export const checkAvailableLanguages = () => {
  const availableLanguages = Object.keys(i18n.options.resources || {});
  console.log('🌐 Idiomas disponíveis:', availableLanguages);
  
  const expectedLanguages = ['en', 'pt', 'es', 'fr'];
  const missingLanguages = expectedLanguages.filter(lang => !availableLanguages.includes(lang));
  
  if (missingLanguages.length > 0) {
    console.warn('⚠️ Idiomas faltando:', missingLanguages);
  } else {
    console.log('✅ Todos os idiomas estão disponíveis');
  }
  
  return {
    available: availableLanguages,
    missing: missingLanguages,
    allPresent: missingLanguages.length === 0
  };
};

export const testTranslation = (key = 'admin_panel') => {
  const languages = ['en', 'pt', 'es', 'fr'];
  
  console.log(`🧪 Testando tradução para chave "${key}":`);
  languages.forEach(lang => {
    const translation = i18n.getResource(lang, 'translation', key);
    console.log(`  ${lang}: ${translation || 'MISSING'}`);
  });
};
