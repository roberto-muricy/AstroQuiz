import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/index';

const DatabaseManager = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    themes: 0,
    levels: 0,
    questions: 0,
    questionSets: 0
  });

  // Dados base para criação
  const baseThemes = [
    {
      id: "planets",
      name: "Planetas",
      description: "Conheça os planetas do Sistema Solar e suas características únicas",
      icon: "🪐",
      color: "#4CAF50",
      gradientStart: "#4CAF50",
      gradientEnd: "#45a049",
      topics: ["Mercúrio", "Vênus", "Terra", "Marte", "Júpiter", "Saturno", "Urano", "Netuno"],
      difficultyRange: [1, 5],
      isActive: true
    },
    {
      id: "stars",
      name: "Estrelas",
      description: "Explore o universo das estrelas, desde o nosso Sol até as gigantes vermelhas",
      icon: "⭐",
      color: "#FF9800",
      gradientStart: "#FF9800",
      gradientEnd: "#F57C00",
      topics: ["Sol", "Anãs Brancas", "Gigantes Vermelhas", "Supernovas", "Nebulosas"],
      difficultyRange: [1, 5],
      isActive: true
    },
    {
      id: "galaxies",
      name: "Galáxias",
      description: "Descubra as diferentes galáxias do universo e suas estruturas",
      icon: "🌌",
      color: "#9C27B0",
      gradientStart: "#9C27B0",
      gradientEnd: "#7B1FA2",
      topics: ["Via Láctea", "Andrômeda", "Galáxias Espirais", "Galáxias Elípticas", "Quasares"],
      difficultyRange: [2, 5],
      isActive: true
    },
    {
      id: "space-exploration",
      name: "Exploração Espacial",
      description: "A história da exploração espacial e as missões mais importantes",
      icon: "🚀",
      color: "#2196F3",
      gradientStart: "#2196F3",
      gradientEnd: "#1976D2",
      topics: ["Apollo", "ISS", "Mars Rovers", "Telescópios", "Satélites"],
      difficultyRange: [1, 4],
      isActive: true
    },
    {
      id: "cosmology",
      name: "Cosmologia",
      description: "Os grandes mistérios do universo e sua origem",
      icon: "🌍",
      color: "#607D8B",
      gradientStart: "#607D8B",
      gradientEnd: "#455A64",
      topics: ["Big Bang", "Matéria Escura", "Energia Escura", "Expansão do Universo", "Buracos Negros"],
      difficultyRange: [3, 5],
      isActive: true
    }
  ];

  const baseLevels = [
    {
      id: "1-basic",
      number: 1,
      name: "Básico",
      description: "Conceitos fundamentais de astronomia para iniciantes",
      difficulty: "easy",
      requiredScore: 0,
      maxQuestions: 10,
      timeLimit: 15,
      color: "#4CAF50",
      emoji: "🌍",
      isUnlocked: true
    },
    {
      id: "2-intermediate",
      number: 2,
      name: "Intermediário",
      description: "Conhecimentos intermediários sobre astronomia",
      difficulty: "medium",
      requiredScore: 100,
      maxQuestions: 12,
      timeLimit: 12,
      color: "#FF9800",
      emoji: "🌙",
      isUnlocked: false
    },
    {
      id: "3-advanced",
      number: 3,
      name: "Avançado",
      description: "Conceitos avançados e detalhados de astronomia",
      difficulty: "hard",
      requiredScore: 250,
      maxQuestions: 15,
      timeLimit: 10,
      color: "#F44336",
      emoji: "⭐",
      isUnlocked: false
    },
    {
      id: "4-expert",
      number: 4,
      name: "Especialista",
      description: "Nível para especialistas em astronomia",
      difficulty: "expert",
      requiredScore: 500,
      maxQuestions: 20,
      timeLimit: 8,
      color: "#9C27B0",
      emoji: "🌌",
      isUnlocked: false
    },
    {
      id: "5-master",
      number: 5,
      name: "Mestre",
      description: "O nível mais alto de conhecimento astronômico",
      difficulty: "master",
      requiredScore: 1000,
      maxQuestions: 25,
      timeLimit: 6,
      color: "#000000",
      emoji: "👑",
      isUnlocked: false
    }
  ];

  const baseQuestions = [
    {
      id: "q_001",
      question: "Qual é o planeta mais próximo do Sol?",
      options: ["Mercúrio", "Vênus", "Terra", "Marte"],
      correctAnswer: 0,
      explanation: "Mercúrio é o planeta mais próximo do Sol, localizado a aproximadamente 57,9 milhões de km.",
      level: 1,
      themes: ["planets", "space-exploration"],
      categories: ["basic-astronomy"],
      difficulty: "easy",
      tags: ["planets", "solar-system", "mercury"],
      metadata: {
        source: "NASA",
        verified: true,
        reviewCount: 0
      },
      stats: {
        timesAsked: 0,
        correctAnswers: 0,
        averageTime: 0
      },
      isActive: true
    },
    {
      id: "q_002",
      question: "Qual é o maior planeta do Sistema Solar?",
      options: ["Terra", "Marte", "Júpiter", "Saturno"],
      correctAnswer: 2,
      explanation: "Júpiter é o maior planeta do Sistema Solar, com uma massa 318 vezes maior que a da Terra.",
      level: 1,
      themes: ["planets"],
      categories: ["basic-astronomy"],
      difficulty: "easy",
      tags: ["planets", "solar-system", "jupiter"],
      metadata: {
        source: "NASA",
        verified: true,
        reviewCount: 0
      },
      stats: {
        timesAsked: 0,
        correctAnswers: 0,
        averageTime: 0
      },
      isActive: true
    },
    {
      id: "q_003",
      question: "Qual é a estrela mais próxima da Terra?",
      options: ["Alpha Centauri", "Sol", "Sirius", "Proxima Centauri"],
      correctAnswer: 1,
      explanation: "O Sol é a estrela mais próxima da Terra, localizada a aproximadamente 150 milhões de km.",
      level: 1,
      themes: ["stars"],
      categories: ["basic-astronomy"],
      difficulty: "easy",
      tags: ["stars", "sun", "solar-system"],
      metadata: {
        source: "NASA",
        verified: true,
        reviewCount: 0
      },
      stats: {
        timesAsked: 0,
        correctAnswers: 0,
        averageTime: 0
      },
      isActive: true
    },
    {
      id: "q_004",
      question: "Em que galáxia vivemos?",
      options: ["Andrômeda", "Via Láctea", "Triângulo", "Pequena Nuvem de Magalhães"],
      correctAnswer: 1,
      explanation: "Vivemos na galáxia Via Láctea, uma galáxia espiral que contém bilhões de estrelas.",
      level: 1,
      themes: ["galaxies"],
      categories: ["basic-astronomy"],
      difficulty: "easy",
      tags: ["galaxies", "milky-way"],
      metadata: {
        source: "NASA",
        verified: true,
        reviewCount: 0
      },
      stats: {
        timesAsked: 0,
        correctAnswers: 0,
        averageTime: 0
      },
      isActive: true
    },
    {
      id: "q_005",
      question: "Qual foi a primeira missão tripulada a pousar na Lua?",
      options: ["Apollo 11", "Apollo 10", "Apollo 12", "Apollo 13"],
      correctAnswer: 0,
      explanation: "A Apollo 11 foi a primeira missão tripulada a pousar na Lua, em 20 de julho de 1969.",
      level: 1,
      themes: ["space-exploration"],
      categories: ["space-history"],
      difficulty: "easy",
      tags: ["apollo", "moon", "space-exploration"],
      metadata: {
        source: "NASA",
        verified: true,
        reviewCount: 0
      },
      stats: {
        timesAsked: 0,
        correctAnswers: 0,
        averageTime: 0
      },
      isActive: true
    }
  ];

  const baseQuestionSets = [
    {
      id: "planets_level1",
      name: "Planetas - Nível Básico",
      description: "Conjunto de perguntas sobre planetas para iniciantes",
      theme: "planets",
      level: 1,
      questions: ["q_001", "q_002"],
      questionCount: 2,
      timeLimit: 15,
      difficulty: "easy",
      isActive: true
    },
    {
      id: "stars_level1",
      name: "Estrelas - Nível Básico",
      description: "Conjunto de perguntas sobre estrelas para iniciantes",
      theme: "stars",
      level: 1,
      questions: ["q_003"],
      questionCount: 1,
      timeLimit: 15,
      difficulty: "easy",
      isActive: true
    },
    {
      id: "galaxies_level1",
      name: "Galáxias - Nível Básico",
      description: "Conjunto de perguntas sobre galáxias para iniciantes",
      theme: "galaxies",
      level: 1,
      questions: ["q_004"],
      questionCount: 1,
      timeLimit: 15,
      difficulty: "easy",
      isActive: true
    },
    {
      id: "space-exploration_level1",
      name: "Exploração Espacial - Nível Básico",
      description: "Conjunto de perguntas sobre exploração espacial para iniciantes",
      theme: "space-exploration",
      level: 1,
      questions: ["q_005"],
      questionCount: 1,
      timeLimit: 15,
      difficulty: "easy",
      isActive: true
    }
  ];

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      const themesSnapshot = await getDocs(collection(db, 'themes'));
      const levelsSnapshot = await getDocs(collection(db, 'levels'));
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      const setsSnapshot = await getDocs(collection(db, 'question_sets'));

      setStats({
        themes: themesSnapshot.size,
        levels: levelsSnapshot.size,
        questions: questionsSnapshot.size,
        questionSets: setsSnapshot.size
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Modo de demonstração - dados simulados
      console.log('🔄 Usando modo de demonstração...');
      setStats({
        themes: 5,
        levels: 5,
        questions: 5,
        questionSets: 4
      });
    }
  };

  // Criar estrutura base
  const createBaseStructure = async () => {
    setLoading(true);
    try {
      console.log('🚀 Criando estrutura base...');

      // 1. Criar temas
      console.log('📁 Criando temas...');
      for (const theme of baseThemes) {
        try {
          await setDoc(doc(db, 'themes', theme.id), {
            ...theme,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          console.log(`⚠️ Erro ao criar tema ${theme.name}:`, error.message);
        }
      }

      // 2. Criar níveis
      console.log('📊 Criando níveis...');
      for (const level of baseLevels) {
        try {
          await setDoc(doc(db, 'levels', level.id), {
            ...level,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          console.log(`⚠️ Erro ao criar nível ${level.name}:`, error.message);
        }
      }

      // 3. Criar perguntas
      console.log('❓ Criando perguntas...');
      for (const question of baseQuestions) {
        try {
          await setDoc(doc(db, 'questions', question.id), {
            ...question,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          console.log(`⚠️ Erro ao criar pergunta:`, error.message);
        }
      }

      // 4. Criar conjuntos de perguntas
      console.log('📚 Criando conjuntos de perguntas...');
      for (const set of baseQuestionSets) {
        try {
          await setDoc(doc(db, 'question_sets', set.id), {
            ...set,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          console.log(`⚠️ Erro ao criar conjunto ${set.name}:`, error.message);
        }
      }

      // Verificar se alguma operação foi bem-sucedida
      const themesSnapshot = await getDocs(collection(db, 'themes'));
      const levelsSnapshot = await getDocs(collection(db, 'levels'));
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      const setsSnapshot = await getDocs(collection(db, 'question_sets'));

      const totalCreated = themesSnapshot.size + levelsSnapshot.size + questionsSnapshot.size + setsSnapshot.size;

      if (totalCreated > 0) {
        window.alert(`✅ Estrutura base criada com sucesso!\n\n📊 Criados:\n- ${themesSnapshot.size} temas\n- ${levelsSnapshot.size} níveis\n- ${questionsSnapshot.size} perguntas\n- ${setsSnapshot.size} conjuntos`);
      } else {
        window.alert('⚠️ Nenhum dado foi criado devido a problemas de permissão.\n\n💡 Soluções:\n1. Configure as regras do Firestore\n2. Verifique o projeto Firebase\n3. Use o modo de demonstração');
      }
      
      loadStats();
    } catch (error) {
      console.error('Erro ao criar estrutura:', error);
      window.alert('❌ Erro ao criar estrutura: ' + error.message + '\n\n💡 Use o modo de demonstração para testar a interface.');
    } finally {
      setLoading(false);
    }
  };

  // Limpar todos os dados
  const clearAllData = async () => {
    if (!window.confirm('⚠️ Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita!')) {
      return;
    }

    setLoading(true);
    try {
      // Limpar temas
      const themesSnapshot = await getDocs(collection(db, 'themes'));
      for (const doc of themesSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Limpar níveis
      const levelsSnapshot = await getDocs(collection(db, 'levels'));
      for (const doc of levelsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Limpar perguntas
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      for (const doc of questionsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Limpar conjuntos
      const setsSnapshot = await getDocs(collection(db, 'question_sets'));
      for (const doc of setsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      window.alert('🗑️ Todos os dados foram removidos!');
      loadStats();
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      window.alert('❌ Erro ao limpar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">🏗️ Gerenciador de Banco de Dados</h1>
        <p className="text-gray-600">Gerencie a estrutura completa do banco de dados do AstroQuiz</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📊 Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'structure'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🏗️ Estrutura
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'actions'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ⚡ Ações
        </button>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">🪐</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Temas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.themes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Níveis</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.levels}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">❓</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Perguntas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.questions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-2xl">📚</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conjuntos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.questionSets}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">📈 Status do Banco de Dados</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Estrutura Base:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  stats.themes > 0 && stats.levels > 0 && stats.questions > 0 && stats.questionSets > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {stats.themes > 0 && stats.levels > 0 && stats.questions > 0 && stats.questionSets > 0
                    ? '✅ Completa'
                    : '⚠️ Incompleta'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Temas Ativos:</span>
                <span className="text-gray-900 font-medium">{stats.themes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Níveis Configurados:</span>
                <span className="text-gray-900 font-medium">{stats.levels}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Perguntas Disponíveis:</span>
                <span className="text-gray-900 font-medium">{stats.questions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Conjuntos de Perguntas:</span>
                <span className="text-gray-900 font-medium">{stats.questionSets}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">🏗️ Estrutura do Banco de Dados</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-yellow-400">📁 Collections</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <div><strong>themes/</strong> - Temas astronômicos (planetas, estrelas, etc.)</div>
                  <div><strong>levels/</strong> - Níveis de dificuldade (básico, intermediário, etc.)</div>
                  <div><strong>questions/</strong> - Perguntas individuais do quiz</div>
                  <div><strong>question_sets/</strong> - Conjuntos de perguntas por tema/nível</div>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium text-yellow-400">🔗 Relacionamentos</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <div>• Perguntas → Temas (múltiplos)</div>
                  <div>• Perguntas → Nível (único)</div>
                  <div>• Conjuntos → Tema + Nível</div>
                  <div>• Conjuntos → Lista de Perguntas</div>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-medium text-yellow-400">📊 Índices Recomendados</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <div>• questions: level + themes + isActive</div>
                  <div>• questions: themes + difficulty + isActive</div>
                  <div>• question_sets: theme + level + isActive</div>
                  <div>• question_sets: difficulty + isActive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">⚡ Ações de Gerenciamento</h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-400 mb-2">🚀 Criar Estrutura Base</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Cria a estrutura inicial com temas, níveis, perguntas e conjuntos de exemplo.
                </p>
                <button
                  onClick={createBaseStructure}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Criando...' : '🚀 Criar Estrutura Base'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-400 mb-2">🔄 Atualizar Estatísticas</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Recarrega as estatísticas do banco de dados.
                </p>
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔄 Atualizar Stats
                </button>
              </div>

              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-800 mb-2">🎭 Modo Demonstração</h4>
                <p className="text-sm text-blue-600 mb-3">
                  Ativa dados simulados para testar a interface sem Firebase.
                </p>
                <button
                  onClick={() => {
                    setStats({
                      themes: 5,
                      levels: 5,
                      questions: 5,
                      questionSets: 4
                    });
                    window.alert('🎭 Modo demonstração ativado!\n\n📊 Dados simulados:\n- 5 temas\n- 5 níveis\n- 5 perguntas\n- 4 conjuntos\n\n✅ Interface funcionando normalmente!');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  🎭 Ativar Demonstração
                </button>
              </div>

              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-medium text-red-800 mb-2">🗑️ Limpar Todos os Dados</h4>
                <p className="text-sm text-red-600 mb-3">
                  <strong>⚠️ ATENÇÃO:</strong> Remove TODOS os dados do banco. Esta ação não pode ser desfeita!
                </p>
                <button
                  onClick={clearAllData}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Removendo...' : '🗑️ Limpar Todos os Dados'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Próximos Passos</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div>1. ✅ Criar estrutura base</div>
              <div>2. 📝 Adicionar mais perguntas</div>
              <div>3. 🎨 Personalizar temas</div>
              <div>4. 📊 Configurar níveis avançados</div>
              <div>5. 🔧 Otimizar consultas</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager;
