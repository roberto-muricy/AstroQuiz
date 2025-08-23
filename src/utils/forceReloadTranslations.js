// Utilitário para forçar o reload das traduções
import i18n from '../i18n';
import { translations } from '../translations';

export const forceReloadTranslations = () => {
  console.log('🔄 Forçando reload das traduções...');
  
  // Verificar se i18n está disponível
  if (!i18n) {
    console.error('❌ i18n não está disponível');
    return false;
  }
  
  try {
    // Adicionar recursos manualmente
    const resources = {
      en: { translation: translations.en },
      pt: { translation: translations.pt },
      es: { translation: translations.es },
      fr: { translation: translations.fr }
    };
    
    // Atualizar recursos
    Object.keys(resources).forEach(lang => {
      i18n.addResourceBundle(lang, 'translation', resources[lang].translation, true, true);
    });
    
    // Forçar reload
    i18n.reloadResources();
    
    console.log('✅ Traduções recarregadas com sucesso');
    console.log('🌐 Idiomas disponíveis:', Object.keys(i18n.options.resources || {}));
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao recarregar traduções:', error);
    return false;
  }
};

export const checkAndFixTranslations = () => {
  const availableLanguages = Object.keys(i18n.options.resources || {});
  const expectedLanguages = ['en', 'pt', 'es', 'fr'];
  const missingLanguages = expectedLanguages.filter(lang => !availableLanguages.includes(lang));
  
  if (missingLanguages.length > 0) {
    console.warn('⚠️ Idiomas faltando:', missingLanguages);
    console.log('🔄 Tentando corrigir...');
    return forceReloadTranslations();
  }
  
  console.log('✅ Todos os idiomas estão disponíveis');
  return true;
};

// Executar verificação automática
if (typeof window !== 'undefined') {
  // Aguardar i18n estar pronto
  setTimeout(() => {
    checkAndFixTranslations();
  }, 1000);
}
