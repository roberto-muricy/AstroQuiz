const { db } = require('../src/firebase/index.js');
const { collection, getDocs, updateDoc, doc } = require('firebase/firestore');

// Função para detectar idioma baseado no conteúdo
function detectLanguage(text) {
  const portugueseWords = [
    'qual', 'como', 'onde', 'quando', 'porque', 'quem', 'que', 'o', 'a', 'os', 'as',
    'um', 'uma', 'uns', 'umas', 'é', 'são', 'está', 'estão', 'tem', 'têm', 'foi', 'foram',
    'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas',
    'com', 'sem', 'por', 'para', 'em', 'de', 'a', 'o', 'e', 'ou', 'mas', 'porém', 'entretanto',
    'planeta', 'sistema', 'solar', 'terra', 'lua', 'sol', 'estrela', 'galáxia', 'universo',
    'astronomia', 'física', 'química', 'biologia', 'geografia', 'história', 'matemática'
  ];

  const englishWords = [
    'what', 'how', 'where', 'when', 'why', 'who', 'which', 'the', 'a', 'an', 'is', 'are',
    'was', 'were', 'has', 'have', 'had', 'will', 'would', 'could', 'should', 'can', 'may',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'against', 'between',
    'and', 'or', 'but', 'however', 'therefore', 'planet', 'system', 'solar', 'earth', 'moon',
    'sun', 'star', 'galaxy', 'universe', 'astronomy', 'physics', 'chemistry', 'biology',
    'geography', 'history', 'mathematics'
  ];

  const spanishWords = [
    'qué', 'cómo', 'dónde', 'cuándo', 'por qué', 'quién', 'cuál', 'el', 'la', 'los', 'las',
    'un', 'una', 'unos', 'unas', 'es', 'son', 'está', 'están', 'tiene', 'tienen', 'fue', 'fueron',
    'del', 'de la', 'de los', 'de las', 'en el', 'en la', 'en los', 'en las', 'con', 'sin',
    'por', 'para', 'en', 'de', 'a', 'o', 'y', 'pero', 'sin embargo', 'planeta', 'sistema',
    'solar', 'tierra', 'luna', 'sol', 'estrella', 'galaxia', 'universo', 'astronomía',
    'física', 'química', 'biología', 'geografía', 'historia', 'matemáticas'
  ];

  const frenchWords = [
    'quel', 'comment', 'où', 'quand', 'pourquoi', 'qui', 'que', 'le', 'la', 'les', 'un', 'une',
    'des', 'est', 'sont', 'était', 'étaient', 'a', 'ont', 'eu', 'eurent', 'dans', 'sur', 'avec',
    'sans', 'pour', 'par', 'de', 'du', 'des', 'et', 'ou', 'mais', 'cependant', 'planète', 'système',
    'solaire', 'terre', 'lune', 'soleil', 'étoile', 'galaxie', 'univers', 'astronomie',
    'physique', 'chimie', 'biologie', 'géographie', 'histoire', 'mathématiques'
  ];

  const textLower = text.toLowerCase();
  
  let ptCount = 0;
  let enCount = 0;
  let esCount = 0;
  let frCount = 0;

  portugueseWords.forEach(word => {
    if (textLower.includes(word)) ptCount++;
  });

  englishWords.forEach(word => {
    if (textLower.includes(word)) enCount++;
  });

  spanishWords.forEach(word => {
    if (textLower.includes(word)) esCount++;
  });

  frenchWords.forEach(word => {
    if (textLower.includes(word)) frCount++;
  });

  // Retorna o idioma com mais palavras encontradas
  if (ptCount > enCount && ptCount > esCount && ptCount > frCount) return 'pt';
  if (enCount > ptCount && enCount > esCount && enCount > frCount) return 'en';
  if (esCount > ptCount && esCount > enCount && esCount > frCount) return 'es';
  if (frCount > ptCount && frCount > enCount && frCount > esCount) return 'fr';
  
  // Se empate, verifica caracteres especiais
  if (text.includes('ç') || text.includes('ã') || text.includes('õ')) return 'pt';
  if (text.includes('ñ') || text.includes('á') || text.includes('é')) return 'es';
  if (text.includes('é') || text.includes('è') || text.includes('à')) return 'fr';
  
  // Padrão: inglês
  return 'en';
}

// Função para adicionar baseId e language às perguntas
async function addLanguageAndBaseId() {
  try {
    console.log('🔍 Buscando perguntas no Firestore...');
    
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma pergunta encontrada');
      return;
    }

    console.log(`📊 Encontradas ${snapshot.size} perguntas`);
    
    let processedCount = 0;
    let baseIdCounter = 1;

    for (const docSnapshot of snapshot.docs) {
      const questionData = docSnapshot.data();
      
      // Detecta idioma baseado na pergunta
      const detectedLanguage = detectLanguage(questionData.question || '');
      
      // Gera baseId único
      const baseId = `q${String(baseIdCounter).padStart(3, '0')}`;
      
      // Atualiza o documento
      await updateDoc(doc(db, 'questions', docSnapshot.id), {
        baseId: baseId,
        language: detectedLanguage
      });

      console.log(`✅ Pergunta ${docSnapshot.id}: baseId=${baseId}, language=${detectedLanguage}`);
      
      processedCount++;
      baseIdCounter++;
    }

    console.log(`🎉 Processamento concluído! ${processedCount} perguntas atualizadas`);
    
  } catch (error) {
    console.error('❌ Erro ao processar perguntas:', error);
  }
}

// Executa o script
addLanguageAndBaseId();
