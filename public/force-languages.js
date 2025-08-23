// Script para forçar os 4 idiomas no dropdown
(function() {
  console.log('🌐 Forçando 4 idiomas no dropdown...');
  
  function forceLanguages() {
    const languageSelects = document.querySelectorAll('select');
    
    languageSelects.forEach(select => {
      const options = Array.from(select.options);
      const hasPortuguese = options.some(opt => opt.text.includes('Português'));
      const hasEnglish = options.some(opt => opt.text.includes('English'));
      const hasSpanish = options.some(opt => opt.text.includes('Español'));
      const hasFrench = options.some(opt => opt.text.includes('Français'));
      
      // Se é o dropdown de idiomas mas não tem todos os 4
      if (hasPortuguese && hasEnglish && (!hasSpanish || !hasFrench)) {
        console.log('🔧 Corrigindo dropdown:', select);
        
        // Salvar opções PT e EN
        const ptOption = options.find(opt => opt.value === 'pt');
        const enOption = options.find(opt => opt.value === 'en');
        
        // Limpar dropdown
        select.innerHTML = '';
        
        // Recriar com todas as 4 opções
        if (ptOption) select.appendChild(ptOption);
        if (enOption) select.appendChild(enOption);
        
        // Adicionar ES
        const esOption = document.createElement('option');
        esOption.value = 'es';
        esOption.textContent = '🇪🇸 Español';
        esOption.className = 'text-gray-900';
        select.appendChild(esOption);
        
        // Adicionar FR
        const frOption = document.createElement('option');
        frOption.value = 'fr';
        frOption.textContent = '🇫🇷 Français';
        frOption.className = 'text-gray-900';
        select.appendChild(frOption);
        
        console.log('✅ Dropdown corrigido com 4 idiomas');
      }
    });
  }
  
  // Executar imediatamente
  forceLanguages();
  
  // Executar novamente após um delay
  setTimeout(forceLanguages, 1000);
  setTimeout(forceLanguages, 3000);
  
  // Observar mudanças no DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        forceLanguages();
      }
    });
  });
  
  // Observar mudanças no body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('🌐 Script de idiomas ativo - monitorando mudanças no DOM');
})();
