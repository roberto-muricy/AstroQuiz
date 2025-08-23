// Script para verificar se todas as traduções estão disponíveis em produção
console.log('🌐 Verificando idiomas disponíveis...');

// Este arquivo garante que as traduções sejam incluídas no build
const supportedLanguages = ['en', 'pt', 'es', 'fr'];

// Verificar se window.i18next está disponível (após carregamento)
setTimeout(() => {
  if (window.i18next) {
    const availableLanguages = Object.keys(window.i18next.options.resources || {});
    console.log('✅ Idiomas disponíveis:', availableLanguages);
    
    const missing = supportedLanguages.filter(lang => !availableLanguages.includes(lang));
    if (missing.length > 0) {
      console.error('❌ Idiomas faltando:', missing);
    }
  }
}, 2000);
