const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where, deleteDoc } = require('firebase/firestore');
const fs = require('fs');
const csv = require('csv-parser');

const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.appspot.com",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
  measurementId: "G-WNNXRM88XS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapeamento de tópicos para temas
const topicToThemeMap = {
  "Black Holes": "black-holes",
  "Comets and Asteroids": "comets-asteroids", 
  "Curiosidades": "curiosities",
  "Curiosities": "curiosities",
  "Drake Equation": "drake-equation",
  "Estrelas": "stars",
  "Fermi Paradox": "fermi-paradox",
  "Foguetes": "rockets",
  "Galáxias": "galaxies",
  "Galaxies": "galaxies",
  "Missões Espaciais": "space-missions",
  "Observatories": "observatories",
  "Relativity": "relativity",
  "Relatividade Geral": "relativity",
  "scientists": "scientists",
  "Sistema Solar": "solar-system",
  "Solar System": "solar-system",
  "Space Missions": "space-missions",
  "Stars": "stars",
  "Buracos Negros": "black-holes"
};

// Temas padrão que serão criados
const defaultThemes = [
  { id: "black-holes", name: "Buracos Negros", description: "Mistérios dos buracos negros", icon: "🕳️", colors: ["#1a1a2e", "#16213e"] },
  { id: "comets-asteroids", name: "Cometas e Asteroides", description: "Corpos celestes menores", icon: "☄️", colors: ["#2d3748", "#4a5568"] },
  { id: "curiosities", name: "Curiosidades", description: "Fatos interessantes sobre astronomia", icon: "🤔", colors: ["#744210", "#a0522d"] },
  { id: "drake-equation", name: "Equação de Drake", description: "Probabilidade de vida extraterrestre", icon: "👽", colors: ["#2f855a", "#38a169"] },
  { id: "fermi-paradox", name: "Paradoxo de Fermi", description: "Onde estão todos?", icon: "❓", colors: ["#742a2a", "#c53030"] },
  { id: "galaxies", name: "Galáxias", description: "Sistemas estelares gigantes", icon: "🌌", colors: ["#553c9a", "#805ad5"] },
  { id: "observatories", name: "Observatórios", description: "Instrumentos de observação", icon: "🔭", colors: ["#2a4365", "#3182ce"] },
  { id: "relativity", name: "Relatividade", description: "Teorias de Einstein", icon: "⚡", colors: ["#744210", "#d69e2e"] },
  { id: "rockets", name: "Foguetes", description: "Tecnologia espacial", icon: "🚀", colors: ["#742a2a", "#e53e3e"] },
  { id: "scientists", name: "Cientistas", description: "Grandes mentes da astronomia", icon: "👨‍🔬", colors: ["#2d3748", "#718096"] },
  { id: "solar-system", name: "Sistema Solar", description: "Nosso sistema planetário", icon: "🌞", colors: ["#d69e2e", "#f6ad55"] },
  { id: "space-missions", name: "Missões Espaciais", description: "Exploração do espaço", icon: "🛰️", colors: ["#2a4365", "#4299e1"] },
  { id: "stars", name: "Estrelas", description: "Corpos celestes luminosos", icon: "⭐", colors: ["#744210", "#d69e2e"] }
];

// Níveis padrão
const defaultLevels = [
  { id: 1, name: "Básico", description: "Conceitos fundamentais", icon: "🌱" },
  { id: 2, name: "Intermediário", description: "Conhecimento intermediário", icon: "🌿" },
  { id: 3, name: "Avançado", description: "Conhecimento avançado", icon: "🌳" },
  { id: 4, name: "Expert", description: "Conhecimento especializado", icon: "🏆" },
  { id: 5, name: "Mestre", description: "Conhecimento de especialista", icon: "👑" }
];

async function createThemes() {
  console.log("📝 Criando temas...");
  for (const theme of defaultThemes) {
    await setDoc(doc(db, 'themes', theme.id), theme);
    console.log(`✅ Tema criado: ${theme.name}`);
  }
}

async function createLevels() {
  console.log("📝 Criando níveis...");
  for (const level of defaultLevels) {
    await setDoc(doc(db, 'levels', level.id.toString()), level);
    console.log(`✅ Nível criado: ${level.name}`);
  }
}

async function importQuestions() {
  console.log("📝 Importando perguntas do CSV...");
  
  const questions = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('firebase-questions-export-2025-08-08.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Mapear tópico para tema
        const themeId = topicToThemeMap[row.Topic] || 'curiosities';
        
        // Verificar se o tema existe, senão usar curiosities
        if (!themeId) {
          console.warn(`⚠️ Tópico não mapeado: ${row.Topic}, usando 'curiosities'`);
        }
        
        // Determinar dificuldade baseada no nível
        let difficulty = 'easy';
        if (row.Level >= 4) difficulty = 'hard';
        else if (row.Level >= 2) difficulty = 'medium';
        
        // Criar opções (como estão vazias no CSV, vamos criar opções genéricas)
        const options = [
          row.OptionA || "Opção A",
          row.OptionB || "Opção B", 
          row.OptionC || "Opção C",
          row.OptionD || "Opção D"
        ];
        
        // Determinar resposta correta
        const correctIndex = row.CorrectOption === 'A' ? 0 : 
                           row.CorrectOption === 'B' ? 1 : 
                           row.CorrectOption === 'C' ? 2 : 3;
        
        // Verificar se o ID é válido
        if (!row.ID || row.ID === 'undefined') {
          console.warn(`⚠️ ID inválido para pergunta: ${row.Question.substring(0, 50)}...`);
          return;
        }
        
        const question = {
          id: row.ID,
          question: row.Question,
          options: options,
          correctAnswer: correctIndex,
          explanation: row.Explanation || "Sem explicação disponível",
          level: parseInt(row.Level),
          difficulty: difficulty,
          theme: themeId,
          topics: [row.Topic],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        questions.push(question);
      })
      .on('end', async () => {
        console.log(`📊 Total de perguntas encontradas: ${questions.length}`);
        
        // Salvar perguntas no Firestore
        for (const question of questions) {
          await setDoc(doc(db, 'questions', question.id), question);
          console.log(`✅ Pergunta importada: ${question.question.substring(0, 50)}...`);
        }
        
        resolve(questions.length);
      })
      .on('error', reject);
  });
}

async function createQuestionSets() {
  console.log("📝 Criando conjuntos de perguntas...");
  
  // Buscar todas as perguntas
  const questionsSnapshot = await getDocs(collection(db, 'questions'));
  const questions = questionsSnapshot.docs.map(doc => doc.data());
  
  // Agrupar por tema e nível
  const groupedQuestions = {};
  
  questions.forEach(question => {
    // Garantir que o tema existe
    const themeId = question.theme || 'curiosities';
    const key = `${themeId}_level_${question.level}`;
    
    console.log(`🔍 Agrupando: ${question.id} -> ${key}`);
    
    if (!groupedQuestions[key]) {
      groupedQuestions[key] = [];
    }
    groupedQuestions[key].push(question.id);
  });
  
  // Criar conjuntos de perguntas
  for (const [key, questionIds] of Object.entries(groupedQuestions)) {
    const [themeId, level] = key.split('_level_');
    
    // Verificar se os dados são válidos
    if (!themeId || !level || !questionIds || questionIds.length === 0) {
      console.warn(`⚠️ Dados inválidos para conjunto: ${key}`);
      continue;
    }
    
    const questionSet = {
      id: key,
      themeId: themeId,
      level: parseInt(level),
      questionIds: questionIds,
      questionCount: questionIds.length,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'question_sets', key), questionSet);
    console.log(`✅ Conjunto criado: ${themeId} - Nível ${level} (${questionIds.length} perguntas)`);
  }
}

async function main() {
  try {
    console.log("🚀 Iniciando importação do CSV...");
    
    // 1. Criar temas
    await createThemes();
    
    // 2. Criar níveis
    await createLevels();
    
    // 3. Importar perguntas
    const questionCount = await importQuestions();
    
    // 4. Criar conjuntos de perguntas
    await createQuestionSets();
    
    console.log("✅ Importação concluída com sucesso!");
    console.log(`📊 Total de perguntas importadas: ${questionCount}`);
    
  } catch (error) {
    console.error("❌ Erro durante a importação:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createThemes,
  createLevels,
  importQuestions,
  createQuestionSets
};
