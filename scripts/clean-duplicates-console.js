// Script para executar no console do navegador do painel admin
// Copie e cole este código no console (F12 > Console)

console.log('🧹 Iniciando limpeza de duplicações...');

// Função para limpar duplicações
async function cleanDuplicates() {
  try {
    // Mostrar loading
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px;">
          <h3 style="color: #1f2937; margin-bottom: 15px;">🧹 Limpando duplicações...</h3>
          <p style="color: #6b7280; margin-bottom: 20px;">Analisando e removendo perguntas duplicadas</p>
          <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #ef4444, #dc2626); animation: loading 2s infinite;"></div>
          </div>
          <style>
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          </style>
        </div>
      </div>
    `;
    document.body.appendChild(loadingDiv);

    // Buscar todas as perguntas
    const questionsRef = firebase.firestore().collection('questions');
    const snapshot = await questionsRef.get();
    
    // Agrupar por idioma e texto da pergunta
    const questionsByLanguage = {};
    const duplicatesToRemove = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const language = data.language || 'unknown';
      const questionText = data.question || '';
      const createdAt = data.createdAt || new Date(0);
      
      if (!questionsByLanguage[language]) {
        questionsByLanguage[language] = {};
      }
      
      if (!questionsByLanguage[language][questionText]) {
        questionsByLanguage[language][questionText] = [];
      }
      
      questionsByLanguage[language][questionText].push({
        id: doc.id,
        createdAt: createdAt,
        ...data
      });
    });
    
    // Identificar duplicações
    Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
      Object.entries(questionsByText).forEach(([questionText, questions]) => {
        if (questions.length > 1) {
          // Ordenar por data de criação (mais antiga primeiro)
          questions.sort((a, b) => a.createdAt - b.createdAt);
          
          // Manter a primeira (mais antiga) e marcar as outras para remoção
          const toRemove = questions.slice(1);
          duplicatesToRemove.push(...toRemove);
          
          console.log(`🔍 ${language}: "${questionText.substring(0, 50)}..."`);
          console.log(`   Manter: ${questions[0].id} (${questions[0].createdAt})`);
          toRemove.forEach(q => {
            console.log(`   Remover: ${q.id} (${q.createdAt})`);
          });
        }
      });
    });
    
    if (duplicatesToRemove.length === 0) {
      document.body.removeChild(loadingDiv);
      alert('✅ Nenhuma duplicação encontrada!');
      return;
    }
    
    // Remover duplicações
    const batch = firebase.firestore().batch();
    
    duplicatesToRemove.forEach(question => {
      const questionRef = firebase.firestore().collection('questions').doc(question.id);
      batch.delete(questionRef);
    });
    
    await batch.commit();
    
    // Remover loading
    document.body.removeChild(loadingDiv);
    
    // Relatório
    const removedByLanguage = {};
    duplicatesToRemove.forEach(q => {
      const lang = q.language || 'unknown';
      if (!removedByLanguage[lang]) {
        removedByLanguage[lang] = 0;
      }
      removedByLanguage[lang]++;
    });
    
    let report = `🧹 Limpeza concluída!\n\n`;
    Object.entries(removedByLanguage).forEach(([language, count]) => {
      report += `🌍 ${language.toUpperCase()}: ${count} duplicações removidas\n`;
    });
    report += `\n📊 TOTAL: ${duplicatesToRemove.length} perguntas duplicadas removidas`;
    
    alert(report);
    
    // Recarregar página
    location.reload();
    
  } catch (error) {
    console.error('Erro ao limpar duplicações:', error);
    alert('❌ Erro ao limpar duplicações: ' + error.message);
  }
}

// Executar limpeza
cleanDuplicates();
