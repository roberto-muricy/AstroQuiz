import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/index';
import { checkAvailableLanguages } from '../utils/languageChecker';


const QuestionManager = () => {
  // const { t } = useTranslation(); // Removido - não utilizado
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('pt');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [themes, setThemes] = useState([]);
  const [levels, setLevels] = useState([]);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(10);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Estado para nova/editar pergunta
  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    level: 1,
    theme: '',
    difficulty: 'easy',
    language: 'pt',
    active: true
  });

  // Estado para relacionamentos de idioma (removido - não utilizado)

  // Carregar perguntas
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const questionsRef = collection(db, 'questions');
      let q = query(questionsRef);
      
      if (selectedTheme !== 'all') {
        q = query(q, where('theme', '==', selectedTheme));
      }
      
      if (selectedLevel !== 'all') {
        q = query(q, where('level', '==', parseInt(selectedLevel)));
      }
      
      if (selectedDifficulty !== 'all') {
        q = query(q, where('difficulty', '==', selectedDifficulty));
      }
      
      if (selectedLanguage !== 'all') {
        q = query(q, where('language', '==', selectedLanguage));
      }
      
      const snapshot = await getDocs(q);
      let questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtro por busca
      if (searchTerm) {
        questionsData = questionsData.filter(question =>
          question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          question.explanation?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setTotalQuestions(questionsData.length);
      
      // Aplicar paginação
      const startIndex = (currentPage - 1) * questionsPerPage;
      const endIndex = startIndex + questionsPerPage;
      const paginatedQuestions = questionsData.slice(startIndex, endIndex);
      
      console.log('📊 Total de perguntas:', questionsData.length);
      console.log('📄 Página atual:', currentPage);
      console.log('📝 Perguntas na página:', paginatedQuestions.length);
      
      setQuestions(paginatedQuestions);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTheme, selectedLevel, selectedDifficulty, selectedLanguage, searchTerm, currentPage, questionsPerPage]);

  // Carregar temas e níveis
  const loadThemesAndLevels = async () => {
    try {
      // Verificar idiomas disponíveis em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        checkAvailableLanguages();
      }
      
      // Forçar reload das traduções em produção também
      if (window.i18next) {
        console.log('🌐 Idiomas disponíveis no i18next:', Object.keys(window.i18next.options.resources || {}));
      }
      
      const themesSnapshot = await getDocs(collection(db, 'themes'));
      const levelsSnapshot = await getDocs(collection(db, 'levels'));
      
      const themesData = themesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const levelsData = levelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('🎨 Temas carregados:', themesData.length);
      console.log('📊 Níveis carregados:', levelsData.length);
      
      setThemes(themesData);
      setLevels(levelsData);
    } catch (error) {
      console.error('Erro ao carregar temas e níveis:', error);
    }
  };

  // Adicionar nova pergunta
  const addQuestion = async () => {
    try {
      const questionId = `q_${Date.now()}`;
      const newQuestion = {
        ...questionForm,
        id: questionId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'questions', questionId), newQuestion);
      setShowAddModal(false);
      resetForm();
      loadQuestions();
      window.alert('✅ Pergunta adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar pergunta:', error);
      window.alert('❌ Erro ao adicionar pergunta: ' + error.message);
    }
  };

  // Editar pergunta
  const editQuestion = async () => {
    try {
      const updatedQuestion = {
        ...questionForm,
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'questions', editingQuestion.id), updatedQuestion);
      setShowAddModal(false);
      setEditingQuestion(null);
      resetForm();
      loadQuestions();
      window.alert('✅ Pergunta atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao editar pergunta:', error);
      window.alert('❌ Erro ao editar pergunta: ' + error.message);
    }
  };

  // Excluir pergunta
  const deleteQuestion = async (questionId) => {
    if (!window.confirm('⚠️ Tem certeza que deseja excluir esta pergunta?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'questions', questionId));
      loadQuestions();
      window.alert('🗑️ Pergunta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
      window.alert('❌ Erro ao excluir pergunta: ' + error.message);
    }
  };

  // Importar do Google Sheets
  const importFromGoogleSheets = async () => {
    try {
      // Mostrar loading
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">📥 Importando do Google Sheets...</h3>
            <p style="color: #6b7280; margin-bottom: 20px;">Conectando e processando perguntas</p>
            <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); animation: loading 2s infinite;"></div>
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
      
      // Configurações do Google Sheets
      const SHEET_ID = "1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk";
      const API_KEY = "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo";
      
      console.log("📋 Conectando com Google Sheets...");
      
      // Definir as abas para importar
      const sheets = [
        { name: 'PT', language: 'pt' },
        { name: 'EN', language: 'en' },
        { name: 'ES', language: 'es' },
        { name: 'FR', language: 'fr' }
      ];
      
      let allQuestions = [];
      
      // Importar de cada aba
      for (const sheet of sheets) {
        try {
          console.log(`📊 Importando da aba: ${sheet.name} (${sheet.language})`);
          
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheet.name}!A:Z?key=${API_KEY}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.values && data.values.length > 0) {
            const rows = data.values;
            const headers = rows[0];
            const sheetQuestions = rows.slice(1).map((row) => {
              const obj = {};
              headers.forEach((header, i) => {
                obj[header] = row[i];
              });
              obj.language = sheet.language; // Adicionar idioma explicitamente
              return obj;
            });
            
            allQuestions = allQuestions.concat(sheetQuestions);
            console.log(`✅ ${sheetQuestions.length} perguntas da aba ${sheet.name}`);
          } else {
            console.log(`⚠️ Nenhum dado na aba ${sheet.name}`);
          }
        } catch (error) {
          console.log(`❌ Erro ao importar aba ${sheet.name}:`, error.message);
        }
      }
      
      console.log(`📊 Total de perguntas coletadas: ${allQuestions.length}`);
      
      if (allQuestions.length === 0) {
        throw new Error("Nenhum dado encontrado em nenhuma aba da planilha");
      }
      
      console.log("📝 Processando", allQuestions.length, "perguntas...");
      
      // Processar e importar perguntas
      let importedCount = 0;
      let errorCount = 0;
      
      for (const questionData of allQuestions) {
        try {
          // Validar dados básicos
          if (!questionData.question || !questionData.topic) {
            console.log("⚠️ Pergunta sem dados essenciais:", questionData);
            continue;
          }
          
          // Verificar se já existe
          const exists = questions.some(q => q.question === questionData.question);
          if (exists) {
            console.log("🔄 Pergunta já existe:", questionData.question.substring(0, 50));
            continue;
          }
          
          // Converter para estrutura Firebase
          const level = parseInt(questionData.level) || 1;
          const correctAnswerMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
          const correctAnswer = correctAnswerMap[questionData.correctOption] || 0;
          
          let difficulty = 'easy';
          if (level >= 7) difficulty = 'hard';
          else if (level >= 4) difficulty = 'medium';
          
          // Usar idioma da aba
          const language = questionData.language || 'en';
          
          const firebaseQuestion = {
            question: questionData.question?.trim(),
            options: [
              questionData.optionA?.trim() || "Opção A",
              questionData.optionB?.trim() || "Opção B",
              questionData.optionC?.trim() || "Opção C",
              questionData.optionD?.trim() || "Opção D"
            ],
            correctAnswer: correctAnswer,
            explanation: questionData.explanation?.trim() || "Sem explicação disponível",
            level: level,
            difficulty: difficulty,
            theme: questionData.topic?.toLowerCase().replace(/\s+/g, '-') || 'astronomy',
            topics: [questionData.topic],
            language: language,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await setDoc(doc(db, 'questions', questionId), firebaseQuestion);
          importedCount++;
          
        } catch (error) {
          console.error("❌ Erro ao processar pergunta:", error.message);
          errorCount++;
        }
      }
      
      // Remover loading
      document.body.removeChild(loadingDiv);
      
      // Mostrar resultado
      const resultMessage = `
🎉 Importação do Google Sheets Concluída!

📊 RESULTADOS:
✅ Total processado: ${allQuestions.length}
📥 Importadas com sucesso: ${importedCount}
💥 Erros: ${errorCount}
⏭️ Duplicatas ignoradas: ${allQuestions.length - importedCount - errorCount}

🌍 Distribuição por idioma:
${(() => {
  const langCount = {};
  allQuestions.forEach(q => {
    const language = q.language || 'en';
    langCount[language] = (langCount[language] || 0) + 1;
  });
  return Object.entries(langCount).map(([lang, count]) => 
    `${lang.toUpperCase()}: ${count} perguntas`
  ).join('\n');
})()}
      `;
      
      window.alert(resultMessage);
      
      // Recarregar perguntas
      await loadQuestions();
      
    } catch (error) {
      console.error('❌ Erro na importação:', error);
      
      // Remover loading se existir
      const loadingDiv = document.querySelector('div[style*="position: fixed"]');
      if (loadingDiv) {
        document.body.removeChild(loadingDiv);
      }
      
      window.alert('❌ Erro na importação: ' + error.message);
    }
  };

  // Importar CSV via upload de arquivo
  const importFromCSVFile = async () => {
    try {
      // Criar input de arquivo
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.style.display = 'none';
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
          await importCSVFile(file);
        } catch (error) {
          console.error('Erro na importação:', error);
          window.alert('❌ Erro ao importar arquivo: ' + error.message);
        }
        
        // Limpar input
        document.body.removeChild(input);
      };
      
      document.body.appendChild(input);
      input.click();
    } catch (error) {
      console.error('Erro na importação:', error);
      window.alert('❌ Erro ao abrir seletor de arquivo');
    }
  };

  // Função para importar arquivo CSV
  const importCSVFile = async (file) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const csvText = event.target.result;
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      console.log('📊 Headers detectados:', headers);
      
      let importedCount = 0;
      let skippedCount = 0;
      let duplicateCount = 0;
      
      // Processar cada linha (exceto header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        // Mapear headers para valores
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Verificar dados essenciais
        if (!row.question || !row.topic) {
          console.log('⚠️ Pergunta sem dados essenciais:', row);
          skippedCount++;
          continue;
        }
        
        // Verificar se já existe (simples verificação)
        const exists = questions.some(q => q.question === row.question);
        if (exists) {
          console.log('🔄 Pergunta já existe:', row.question.substring(0, 50));
          duplicateCount++;
          continue;
        }
        
        // Determinar idioma
        const questionText = row.question.toLowerCase();
        const portugueseWords = ['como', 'qual', 'quando', 'onde', 'porque', 'quem', 'o que', 'qual é', 'quantos', 'quantas'];
        let language = 'en';
        for (const word of portugueseWords) {
          if (questionText.includes(word)) {
            language = 'pt';
            break;
          }
        }
        
        // Determinar nível
        const level = parseInt(row.level) || 1;
        
        // Determinar dificuldade
        let difficulty = 'easy';
        if (level >= 4) difficulty = 'hard';
        else if (level >= 2) difficulty = 'medium';
        
        // Mapear tema
        const themeId = row.topic.toLowerCase().replace(/\s+/g, '-') || 'astronomy';
        
        // Criar opções
        const options = [
          row.optionA || "Opção A",
          row.optionB || "Opção B", 
          row.optionC || "Opção C",
          row.optionD || "Opção D"
        ];
        
        // Determinar resposta correta
        const correctIndex = row.correctOption === 'A' ? 0 : 
                           row.correctOption === 'B' ? 1 : 
                           row.correctOption === 'C' ? 2 : 3;
        
        // Gerar ID único
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const question = {
          id: questionId,
          question: row.question,
          options: options,
          correctAnswer: correctIndex,
          explanation: row.explanation || "Sem explicação disponível",
          level: level,
          difficulty: difficulty,
          theme: themeId,
          topics: [row.topic],
          language: language,
          active: true,
          isBestVersion: true,
          duplicateCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            source: "CSV Upload",
            verified: true,
            lastReviewed: new Date(),
            reviewCount: 0,
            importDate: new Date()
          }
        };
        
        try {
          await setDoc(doc(db, 'questions', questionId), question);
          importedCount++;
          console.log(`✅ Importada: "${question.question.substring(0, 50)}..." (${language}, nível ${level})`);
        } catch (error) {
          console.error(`❌ Erro ao importar ${questionId}:`, error.message);
        }
      }
      
      // Recarregar perguntas
      await loadQuestions();
      
      // Mostrar resultado
      window.alert(`🎉 Importação concluída!\n\n📊 Resultados:\n✅ Importadas: ${importedCount}\n❌ Ignoradas: ${skippedCount}\n🔄 Duplicatas: ${duplicateCount}`);
    };
    
    reader.readAsText(file);
  };

  // Função para importar perguntas multi-idioma (COMENTADA - não utilizada)
  // const importMultiLanguageQuestions = async (csvData) => {
  //   try {
  //     const questions = [];
  //     const relations = [];
  //     
  //     // Agrupar por ID base
  //     const groupedQuestions = {};
  //     
  //     csvData.forEach(row => {
  //       const baseId = row.baseId || row.id;
  //       if (!groupedQuestions[baseId]) {
  //         groupedQuestions[baseId] = [];
  //       }
  //       groupedQuestions[baseId].push(row);
  //     });
  //     
  //     // Processar cada grupo
  //     for (const [baseId, translations] of Object.entries(groupedQuestions)) {
  //       const relationTranslations = {};
  //       
  //       for (const translation of translations) {
  //         const questionId = `${baseId}_${translation.language}`;
  //         const question = {
  //           id: questionId,
  //           question: translation.question,
  //           options: [
  //           translation.optionA,
  //           translation.optionB,
  //           translation.optionC,
  //           translation.optionD
  //         ],
  //         correctAnswer: translation.correctOption === 'A' ? 0 : 
  //                       translation.correctOption === 'B' ? 1 : 
  //                       translation.correctOption === 'C' ? 2 : 3,
  //         explanation: translation.explanation,
  //         level: parseInt(translation.level) || 1,
  //         difficulty: translation.difficulty || 'medium',
  //         theme: translation.theme || 'astronomy',
  //         language: translation.language,
  //         active: true,
  //         createdAt: new Date(),
  //         updatedAt: new Date()
  //       };
  //       
  //       questions.push(question);
  //       relationTranslations[translation.language] = questionId;
  //     }
  //     
  //     // Criar relacionamento
  //     relations.push({
  //       id: `relation_${baseId}`,
  //       originalQuestionId: baseId,
  //       translations: relationTranslations,
  //       createdAt: new Date(),
  //       updatedAt: new Date()
  //     });
  //   }
  //   
  //   // Salvar perguntas
  //   for (const question of questions) {
  //     await setDoc(doc(db, 'questions', question.id), question);
  //   }
  //   
  //   // Salvar relacionamentos
  //   for (const relation of relations) {
  //     await setDoc(doc(db, 'question_relations', relation.id), relation);
  //   }
  //   
  //   console.log(`✅ Importadas ${questions.length} perguntas em ${relations.length} idiomas`);
  //   await loadQuestions();
  //   
  // } catch (error) {
  //   console.error('❌ Erro na importação multi-idioma:', error);
  //   window.alert('❌ Erro na importação: ' + error.message);
  // }
  // };



  // Função para processar arquivo CSV com idioma específico (COMENTADA - não utilizada)
  // const parseCSVFile = (file, language) => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     
  //     reader.onload = (event) => {
  //       try {
  //         const csvText = event.target.result;
  //         const lines = csvText.split('\n');
  //         const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  //         
  //         console.log(`📊 Processando ${file.name} (${language}):`, headers);
  //         
  //         const questions = [];
  //         
  //         for (let i = 1; i < lines.length; i++) {
  //           const line = lines[i].trim();
  //           if (!line) continue;
  //             
  //           const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
  //           const row = {};
  //             
  //           headers.forEach((header, index) => {
  //             row[header] = values[index] || '';
  //           });
  //             
  //           if (!row.question || !row.baseId) {
  //             console.log('⚠️ Pergunta sem dados essenciais:', row);
  //             continue;
  //           }
  //             
  //           const questionId = `${row.baseId}_${language}`;
  //           const level = parseInt(row.level) || 1;
  //             
  //           let difficulty = 'easy';
  //           if (level >= 4) difficulty = 'hard';
  //           else if (level >= 2) difficulty = 'medium';
  //             
  //           const question = {
  //             id: questionId,
  //             baseId: row.baseId,
  //             question: row.question,
  //             options: [
  //               row.optionA || "Opção A",
  //               row.optionB || "Opção B", 
  //               row.optionC || "Opção C",
  //               row.optionD || "Opção D"
  //             ],
  //             correctAnswer: row.correctOption === 'A' ? 0 : 
  //                           row.correctOption === 'B' ? 1 : 
  //                           row.correctOption === 'B' ? 2 : 3,
  //             explanation: row.explanation || "Sem explicação disponível",
  //             level: level,
  //             difficulty: difficulty,
  //             theme: row.topic?.toLowerCase().replace(/\s+/g, '-') || 'astronomy',
  //             topics: [row.topic],
  //             language: language,
  //             active: true,
  //             createdAt: new Date(),
  //             updatedAt: new Date(),
  //             metadata: {
  //               source: `CSV Import - ${language}`,
  //               verified: true,
  //               lastReviewed: new Date(),
  //               reviewCount: 0,
  //               importDate: new Date()
  //             }
  //           };
  //             
  //           questions.push(question);
  //         }
  //           
  //         resolve(questions);
  //       } catch (error) {
  //         reject(error);
  //       }
  //     };
  //       
  //     reader.onerror = reject;
  //     reader.readAsText(file);
  //   });
  // };

  // Limpar duplicações
  const cleanDuplicates = useCallback(async () => {
    if (!window.confirm('⚠️ Esta operação irá remover perguntas duplicadas. Tem certeza?')) {
      return;
    }

    try {
      setLoading(true);
      setIsCleaning(true); // Inicia o estado de limpeza
      
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
      const questionsRef = collection(db, 'questions');
      const snapshot = await getDocs(questionsRef);
      
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
          }
        });
      });
      
      if (duplicatesToRemove.length === 0) {
        document.body.removeChild(loadingDiv);
        window.alert('✅ Nenhuma duplicação encontrada!');
        setIsCleaning(false); // Finaliza o estado de limpeza
        return;
      }
      
      // Remover duplicações
      const batch = writeBatch(db);
      
      duplicatesToRemove.forEach(question => {
        const questionRef = doc(db, 'questions', question.id);
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
      
      window.alert(report);
      
      // Recarregar perguntas
      loadQuestions();
      setIsCleaning(false); // Finaliza o estado de limpeza
      
    } catch (error) {
      console.error('Erro ao limpar duplicações:', error);
      window.alert('❌ Erro ao limpar duplicações: ' + error.message);
      setIsCleaning(false); // Finaliza o estado de limpeza
    } finally {
      setLoading(false);
    }
  }, [loadQuestions]);

  // Limpar todas as perguntas
  const clearAllQuestions = useCallback(async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Tem certeza que deseja APAGAR TODAS as perguntas do banco de dados?\n\nEsta ação é IRREVERSÍVEL e removerá todas as perguntas de todos os idiomas!\n\nDigite "CONFIRMAR" para continuar:')) {
      return;
    }

    const confirmation = prompt('Digite "CONFIRMAR" para apagar todas as perguntas:');
    if (confirmation !== 'CONFIRMAR') {
      alert('Operação cancelada.');
      return;
    }

    try {
      setLoading(true);
      setIsCleaning(true);
      
      // Mostrar loading
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">🗑️ Apagando todas as perguntas...</h3>
            <p style="color: #6b7280; margin-bottom: 20px;">Removendo todas as perguntas do banco de dados</p>
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

      const questionsRef = collection(db, 'questions');
      const snapshot = await getDocs(questionsRef);
      
      if (snapshot.empty) {
        document.body.removeChild(loadingDiv);
        alert('Não há perguntas para apagar.');
        setIsCleaning(false);
        return;
      }

      // Deletar todas as perguntas em lotes
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      // Remover loading
      document.body.removeChild(loadingDiv);
      
      alert(`✅ ${snapshot.docs.length} perguntas removidas com sucesso!\n\nAgora você pode fazer uma nova importação limpa.`);
      loadQuestions();
      
    } catch (error) {
      console.error('Erro ao limpar todas as perguntas:', error);
      alert('❌ Erro ao limpar perguntas: ' + error.message);
    } finally {
      setLoading(false);
      setIsCleaning(false);
    }
  }, [loadQuestions]);

  // Validar duplicações
  const validateDuplicates = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mostrar loading
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 500px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">🔍 Validando duplicações...</h3>
            <p style="color: #6b7280; margin-bottom: 20px;">Analisando perguntas por idioma</p>
            <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #3b82f6, #1d4ed8); animation: loading 2s infinite;"></div>
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

      const questionsRef = collection(db, 'questions');
      const snapshot = await getDocs(questionsRef);
      
      // Contar por idioma
      const countByLanguage = {};
      const questionsByLanguage = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const language = data.language || 'unknown';
        const questionText = data.question || '';
        const createdAt = data.createdAt || new Date(0);
        
        // Contar total por idioma
        countByLanguage[language] = (countByLanguage[language] || 0) + 1;
        
        // Agrupar por texto para encontrar duplicações
        if (!questionsByLanguage[language]) {
          questionsByLanguage[language] = {};
        }
        
        if (!questionsByLanguage[language][questionText]) {
          questionsByLanguage[language][questionText] = [];
        }
        
        questionsByLanguage[language][questionText].push({
          id: doc.id,
          createdAt: createdAt,
          question: questionText,
          language: language
        });
      });
      
      // Verificar duplicações com detalhes
      const duplicatesByLanguage = {};
      const uniqueCountByLanguage = {};
      const duplicateDetails = {};
      
      Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
        uniqueCountByLanguage[language] = Object.keys(questionsByText).length;
        duplicatesByLanguage[language] = 0;
        duplicateDetails[language] = [];
        
        Object.entries(questionsByText).forEach(([questionText, questions]) => {
          if (questions.length > 1) {
            const duplicateCount = questions.length - 1;
            duplicatesByLanguage[language] += duplicateCount;
            
            // Ordenar por data de criação para identificar qual manter
            questions.sort((a, b) => a.createdAt - b.createdAt);
            
            duplicateDetails[language].push({
              questionText: questionText.substring(0, 60) + '...',
              baseIds: questions.map(q => q.baseId || 'N/A'),
              questionIds: questions.map(q => q.id),
              keepId: questions[0].id, // Manter o mais antigo
              removeIds: questions.slice(1).map(q => q.id), // Remover os mais novos
              duplicateCount: duplicateCount
            });
          }
        });
      });
      
      // Remover loading
      document.body.removeChild(loadingDiv);
      
      // Gerar relatório melhorado com cores
      let report = '';
      
      // Cabeçalho
      report += '🔍 RELATÓRIO DE VALIDAÇÃO DE PERGUNTAS\n';
      report += '='.repeat(50) + '\n\n';
      
      // Resumo executivo
      const totalQuestions = Object.values(countByLanguage).reduce((sum, count) => sum + count, 0);
      const totalDuplicates = Object.values(duplicatesByLanguage).reduce((sum, count) => sum + count, 0);
      
      report += '📋 RESUMO EXECUTIVO:\n';
      report += `   • Total de perguntas: ${totalQuestions}\n`;
      report += `   • Total de duplicações: ${totalDuplicates}\n`;
      report += `   • Idiomas analisados: ${Object.keys(countByLanguage).length}\n\n`;
      
      // Tabela de contagem por idioma
      report += '📊 CONTAGEM DETALHADA POR IDIOMA:\n';
      report += '─'.repeat(60) + '\n';
      report += 'IDIOMA    | TOTAL | DUPLICATAS | ÚNICAS | STATUS\n';
      report += '─'.repeat(60) + '\n';
      
      Object.entries(countByLanguage).forEach(([lang, count]) => {
        const duplicates = duplicatesByLanguage[lang] || 0;
        const unique = uniqueCountByLanguage[lang] || 0;
        const status = duplicates > 0 ? '🚨 DUPLICATAS' : '✅ OK';
        const langUpper = lang.toUpperCase().padEnd(8);
        const totalStr = count.toString().padStart(5);
        const dupStr = duplicates.toString().padStart(10);
        const uniqueStr = unique.toString().padStart(7);
        
        report += `${langUpper} | ${totalStr} | ${dupStr} | ${uniqueStr} | ${status}\n`;
      });
      
      report += '─'.repeat(60) + '\n\n';
      
      // Detalhes das duplicações
      if (totalDuplicates > 0) {
        report += '🚨 DETALHES DAS DUPLICAÇÕES:\n';
        report += '─'.repeat(40) + '\n';
        
        Object.entries(duplicateDetails).forEach(([lang, details]) => {
          if (details.length > 0) {
            report += `${lang.toUpperCase()}:\n`;
            details.forEach((dup, index) => {
              report += `  ${index + 1}. "${dup.questionText}"\n`;
              report += `     • BaseIds: ${dup.baseIds.join(', ')}\n`;
              report += `     • Manter: ${dup.keepId}\n`;
              report += `     • Remover: ${dup.removeIds.join(', ')}\n`;
              report += `     • Duplicações: ${dup.duplicateCount}\n\n`;
            });
          }
        });
      }
      
      // Análise de balanceamento
      const counts = Object.values(uniqueCountByLanguage);
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);
      const difference = maxCount - minCount;
      
      report += '⚖️ ANÁLISE DE BALANCEAMENTO:\n';
      report += '─'.repeat(40) + '\n';
      
      if (minCount === maxCount) {
        report += '✅ PERFEITO! Todos os idiomas têm o mesmo número de perguntas únicas.\n';
        report += `   • Quantidade por idioma: ${minCount} perguntas\n`;
      } else {
        report += `⚠️ DESBALANCEADO! Diferença de ${difference} perguntas entre idiomas.\n`;
        report += `   • Menor quantidade: ${minCount} perguntas\n`;
        report += `   • Maior quantidade: ${maxCount} perguntas\n`;
        report += `   • Diferença: ${difference} perguntas\n\n`;
        
        // Detalhar quais idiomas têm problemas
        report += '📈 DETALHAMENTO POR IDIOMA:\n';
        Object.entries(uniqueCountByLanguage).forEach(([lang, count]) => {
          const langUpper = lang.toUpperCase();
          if (count === minCount) {
            report += `   • ${langUpper}: ${count} perguntas (MÍNIMO)\n`;
          } else if (count === maxCount) {
            report += `   • ${langUpper}: ${count} perguntas (MÁXIMO)\n`;
          } else {
            report += `   • ${langUpper}: ${count} perguntas\n`;
          }
        });
      }
      
      report += '\n';
      
      // Recomendações
      report += '💡 RECOMENDAÇÕES:\n';
      report += '─'.repeat(20) + '\n';
      
      if (totalDuplicates > 0) {
        report += '🚨 AÇÕES URGENTES:\n';
        report += '   • Use o botão "🧹 LIMPAR DUPLICATAS" para remover duplicações\n';
        report += '   • Execute a limpeza antes de qualquer nova importação\n\n';
      }
      
      if (difference > 0) {
        report += '⚠️ AÇÕES RECOMENDADAS:\n';
        report += '   • Verifique se todas as perguntas foram importadas corretamente\n';
        report += '   • Confirme se a planilha tem o mesmo número de linhas para cada idioma\n';
        report += '   • Revise se há perguntas faltando em alguns idiomas\n';
        report += '   • Considere reimportar os idiomas com menos perguntas\n\n';
      }
      
      if (totalDuplicates === 0 && difference === 0) {
        report += '✅ SITUAÇÃO IDEAL:\n';
        report += '   • Nenhuma duplicação encontrada\n';
        report += '   • Todos os idiomas estão balanceados\n';
        report += '   • Sistema pronto para uso em produção\n';
      }
      
      report += '\n';
      report += '─'.repeat(50) + '\n';
      report += `📅 Relatório gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
      
      // Mostrar relatório melhorado com HTML colorido
      const reportDiv = document.createElement('div');
      
      // Converter o relatório para HTML com cores
      const reportHTML = report
        .replace(/🔍/g, '<span style="color: #3b82f6; font-weight: bold;">🔍</span>')
        .replace(/📋/g, '<span style="color: #10b981; font-weight: bold;">📋</span>')
        .replace(/📊/g, '<span style="color: #f59e0b; font-weight: bold;">📊</span>')
        .replace(/⚖️/g, '<span style="color: #8b5cf6; font-weight: bold;">⚖️</span>')
        .replace(/💡/g, '<span style="color: #06b6d4; font-weight: bold;">💡</span>')
        .replace(/📅/g, '<span style="color: #84cc16; font-weight: bold;">📅</span>')
        .replace(/✅/g, '<span style="color: #10b981; font-weight: bold;">✅</span>')
        .replace(/⚠️/g, '<span style="color: #f59e0b; font-weight: bold;">⚠️</span>')
        .replace(/🚨/g, '<span style="color: #ef4444; font-weight: bold;">🚨</span>')
        .replace(/📈/g, '<span style="color: #8b5cf6; font-weight: bold;">📈</span>')
        .replace(/•/g, '<span style="color: #f59e0b;">•</span>')
        .replace(/\n/g, '<br>')
        .replace(/=/g, '<span style="color: #6b7280;">=</span>')
        .replace(/-/g, '<span style="color: #6b7280;">-</span>')
        .replace(/\|/g, '<span style="color: #6b7280;">|</span>');
      
      reportDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: #1f2937; padding: 30px; border-radius: 15px; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 80px rgba(0,0,0,0.5); border: 1px solid #374151;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #374151; padding-bottom: 15px;">
              <h3 style="color: #f9fafb; margin: 0; font-size: 24px; font-weight: bold;">🔍 Relatório de Validação</h3>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 50%; cursor: pointer; font-size: 18px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;">×</button>
            </div>
            <div style="background: #111827; padding: 25px; border-radius: 10px; border: 1px solid #374151;">
              <div style="background: #0f172a; color: #f1f5f9; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 15px; line-height: 1.7; border: 1px solid #1e293b; margin: 0; overflow-x: auto; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${reportHTML}</div>
            </div>
            <div style="margin-top: 20px; text-align: center; padding-top: 15px; border-top: 1px solid #374151;">
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 500; transition: background-color 0.2s;">Fechar Relatório</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(reportDiv);
      
    } catch (error) {
      console.error('Erro na validação:', error);
      window.alert('❌ Erro na validação: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Analisar diferenças entre idiomas
  const analyzeLanguageDifferences = useCallback(async () => {
    try {
      setLoading(true);
      
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 500px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">🔍 Analisando diferenças...</h3>
            <p style="color: #6b7280; margin-bottom: 20px;">Investigando por que os idiomas têm números diferentes</p>
            <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #6d28d9); animation: loading 2s infinite;"></div>
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

      const questionsRef = collection(db, 'questions');
      const snapshot = await getDocs(questionsRef);
      
      // Agrupar por baseId e idioma
      const questionsByBaseId = {};
      const questionsByLanguage = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const baseId = data.baseId || 'unknown';
        const language = data.language || 'unknown';
        const questionText = data.question || '';
        
        // Agrupar por baseId
        if (!questionsByBaseId[baseId]) {
          questionsByBaseId[baseId] = {};
        }
        questionsByBaseId[baseId][language] = {
          id: doc.id,
          question: questionText,
          ...data
        };
        
        // Agrupar por idioma
        if (!questionsByLanguage[language]) {
          questionsByLanguage[language] = [];
        }
        questionsByLanguage[language].push({
          id: doc.id,
          baseId: baseId,
          question: questionText,
          ...data
        });
      });
      
      // Analisar diferenças
      const analysis = {
        totalBaseIds: Object.keys(questionsByBaseId).length,
        languages: Object.keys(questionsByLanguage),
        missingTranslations: {},
        incompleteBaseIds: [],
        completeBaseIds: []
      };
      
      // Verificar quais baseIds estão incompletos
      Object.entries(questionsByBaseId).forEach(([baseId, translations]) => {
        const expectedLanguages = ['pt', 'en', 'es', 'fr'];
        const missingLanguages = expectedLanguages.filter(lang => !translations[lang]);
        
        if (missingLanguages.length > 0) {
          analysis.incompleteBaseIds.push({
            baseId: baseId,
            missing: missingLanguages,
            present: Object.keys(translations),
            sampleQuestion: Object.values(translations)[0]?.question || 'N/A'
          });
        } else {
          analysis.completeBaseIds.push(baseId);
        }
        
        // Contar idiomas faltando por idioma
        missingLanguages.forEach(lang => {
          if (!analysis.missingTranslations[lang]) {
            analysis.missingTranslations[lang] = [];
          }
          analysis.missingTranslations[lang].push(baseId);
        });
      });
      
      // Remover loading
      document.body.removeChild(loadingDiv);
      
            // Gerar relatório simplificado
      let report = '';
      
      report += 'ANÁLISE DE BASEIDS - DUPLICADOS E FALTANDO TRADUÇÕES\n';
      report += '='.repeat(60) + '\n\n';
      
      // Verificar duplicações por baseId
      const duplicateBaseIds = [];
      Object.entries(questionsByBaseId).forEach(([baseId, translations]) => {
        const languages = Object.keys(translations);
        const expectedLanguages = ['pt', 'en', 'es', 'fr'];
        
        // Verificar se há duplicações em algum idioma
        const hasDuplicates = languages.some(lang => {
          const questionsInLang = Object.values(questionsByLanguage[lang] || {}).filter(q => q.baseId === baseId);
          return questionsInLang.length > 1;
        });
        
        if (hasDuplicates) {
          duplicateBaseIds.push({
            baseId: baseId,
            languages: languages,
            missing: expectedLanguages.filter(lang => !languages.includes(lang))
          });
        }
      });
      
      // Verificar baseIds faltando traduções
      const missingTranslations = [];
      Object.entries(questionsByBaseId).forEach(([baseId, translations]) => {
        const languages = Object.keys(translations);
        const expectedLanguages = ['pt', 'en', 'es', 'fr'];
        const missing = expectedLanguages.filter(lang => !languages.includes(lang));
        
        if (missing.length > 0) {
          missingTranslations.push({
            baseId: baseId,
            present: languages,
            missing: missing
          });
        }
      });
      
      // Relatório de duplicações
      if (duplicateBaseIds.length > 0) {
        report += 'BASEIDS DUPLICADOS:\n';
        report += '─'.repeat(30) + '\n';
        duplicateBaseIds.forEach((item, index) => {
          report += `${index + 1}. ${item.baseId}\n`;
          report += `   Idiomas: ${item.languages.join(', ')}\n`;
          if (item.missing.length > 0) {
            report += `   Faltando: ${item.missing.join(', ')}\n`;
          }
          report += '\n';
        });
      } else {
        report += 'BASEIDS DUPLICADOS: Nenhum encontrado\n\n';
      }
      
      // Relatório de traduções faltando
      if (missingTranslations.length > 0) {
        report += 'BASEIDS FALTANDO TRADUÇÕES:\n';
        report += '─'.repeat(40) + '\n';
        missingTranslations.forEach((item, index) => {
          report += `${index + 1}. ${item.baseId}\n`;
          report += `   Presente em: ${item.present.join(', ')}\n`;
          report += `   Faltando: ${item.missing.join(', ')}\n\n`;
        });
      } else {
        report += 'BASEIDS FALTANDO TRADUÇÕES: Nenhum encontrado\n\n';
      }
      
      // Resumo
      report += 'RESUMO:\n';
      report += '─'.repeat(10) + '\n';
      report += `Total de baseIds únicos: ${analysis.totalBaseIds}\n`;
      report += `BaseIds duplicados: ${duplicateBaseIds.length}\n`;
      report += `BaseIds faltando traduções: ${missingTranslations.length}\n`;
      report += `BaseIds completos: ${analysis.completeBaseIds.length}\n\n`;
      
      report += '─'.repeat(60) + '\n';
      report += `Análise gerada em: ${new Date().toLocaleString('pt-BR')}\n`;
      
      // Mostrar relatório simplificado
      const reportDiv = document.createElement('div');
      
      // Converter quebras de linha para HTML
      const reportHTML = report.replace(/\n/g, '<br>');
      
      reportDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px;">
              <h3 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: bold;">Análise de BaseIds</h3>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #6b7280; color: white; border: none; padding: 8px 12px; border-radius: 50%; cursor: pointer; font-size: 18px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <pre style="background: white; color: #374151; padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.5; border: 1px solid #d1d5db; margin: 0; overflow-x: auto; white-space: pre-wrap;">${reportHTML}</pre>
            </div>
            <div style="margin-top: 20px; text-align: center; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">Fechar</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(reportDiv);
      
    } catch (error) {
      console.error('Erro na análise:', error);
      window.alert('❌ Erro na análise: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Resetar formulário
  const resetForm = () => {
    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      level: 1,
      theme: '',
      difficulty: 'easy',
      language: 'pt',
      active: true
    });
  };

  // Abrir modal para editar
  const openEditModal = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question: question.question,
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer || 0,
      explanation: question.explanation || '',
      level: question.level || 1,
      theme: question.theme || '',
      difficulty: question.difficulty || 'easy',
      language: question.language || 'pt',
      active: question.active !== false
    });
    setShowAddModal(true);
  };

  // Funções de paginação
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  
  const goToPage = (page) => {
    setCurrentPage(page);
  };
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Resetar página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTheme, selectedLevel, selectedDifficulty, selectedLanguage, searchTerm]);
  
  useEffect(() => {
    loadQuestions();
    loadThemesAndLevels();
  }, [loadQuestions]);

  // Adicionar atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl+Shift+L ou Cmd+Shift+L para limpar duplicações
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        cleanDuplicates();
      }
      
      // Alt+Shift+V para validar duplicações
      if (event.altKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        validateDuplicates();
      }
      
      // Alt+Shift+D para analisar diferenças
      if (event.altKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        analyzeLanguageDifferences();
      }
      
      // Ctrl+Shift+X para limpar todas as perguntas
      if (event.ctrlKey && event.shiftKey && event.key === 'X') {
        event.preventDefault();
        clearAllQuestions();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [cleanDuplicates, validateDuplicates, analyzeLanguageDifferences, clearAllQuestions]);





  console.log('🔍 QuestionManager renderizando...');
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Gerenciador de Perguntas
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log('🔍 Botão de validação clicado!');
              validateDuplicates();
            }}
            disabled={loading}
            className="px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-bold text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            title="Validar duplicações (Alt+Shift+V)"
            style={{minWidth: '200px'}}
          >
            🔍 VALIDAR DUPLICATAS
          </button>
          <button
            onClick={() => {
              console.log('🔍 Botão de análise de diferenças clicado!');
              analyzeLanguageDifferences();
            }}
            disabled={loading}
            className="px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            title="Analisar diferenças entre idiomas (Alt+Shift+D)"
            style={{minWidth: '200px'}}
          >
            🔍 ANALISAR DIFERENÇAS
          </button>
          <button
            onClick={() => {
              console.log('🧹 Botão de limpeza clicado!');
              cleanDuplicates();
            }}
            disabled={isCleaning}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-bold text-lg ${
              isCleaning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
            }`}
            title="Limpar duplicações (Ctrl+Shift+L)"
            style={{minWidth: '200px'}}
          >
            {isCleaning ? '⏳ Limpando...' : '🧹 LIMPAR DUPLICATAS'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            ➕ Adicionar Pergunta
          </button>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        {/* Primeira linha: Busca e Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          <input
            type="text"
            placeholder="🔍 Buscar perguntas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
          
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="all" className="text-gray-900">Todos os Temas</option>
            {themes?.map(theme => (
              <option key={theme.id} value={theme.id} className="text-gray-900">{theme.icon} {theme.name}</option>
            )) || []}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="all" className="text-gray-900">Todos os Níveis</option>
            {levels?.map(level => (
              <option key={level.id} value={level.id} className="text-gray-900">{level.icon} {level.name}</option>
            )) || []}
          </select>
          
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="all" className="text-gray-900">Todas as Dificuldades</option>
            <option value="easy" className="text-gray-900">Fácil</option>
            <option value="medium" className="text-gray-900">Médio</option>
            <option value="hard" className="text-gray-900">Difícil</option>
          </select>
          
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="pt" className="text-gray-900">🇧🇷 Português</option>
            <option value="en" className="text-gray-900">🇺🇸 English</option>
            <option value="es" className="text-gray-900">🇪🇸 Español</option>
            <option value="fr" className="text-gray-900">🇫🇷 Français</option>
          </select>
          
          <select
            value={questionsPerPage}
            onChange={(e) => setQuestionsPerPage(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value={5} className="text-gray-900">5 por página</option>
            <option value={10} className="text-gray-900">10 por página</option>
            <option value={20} className="text-gray-900">20 por página</option>
            <option value={50} className="text-gray-900">50 por página</option>
          </select>
        </div>

        {/* Segunda linha: Botões de Ação */}
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={() => {
              setEditingQuestion(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            ➕ Adicionar Pergunta
          </button>
          <button
            onClick={importFromCSVFile}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            📥 Importar CSV
          </button>
          <button
            onClick={importFromGoogleSheets}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            📊 Importar Google Sheets
          </button>
        </div>
      </div>

      {/* Lista de Perguntas */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-yellow-400">
                Perguntas ({totalQuestions} total)
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                Página {currentPage} de {totalPages} • 
                Mostrando {questions.length} de {totalQuestions} perguntas
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cleanDuplicates}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors font-bold"
                title="Limpar duplicações (Ctrl+Shift+L)"
              >
                🧹 Limpar Duplicatas
              </button>
              <button
                onClick={clearAllQuestions}
                className="bg-red-800 text-white px-4 py-2 rounded text-sm hover:bg-red-900 transition-colors font-bold"
                title="Limpar todas as perguntas (Ctrl+Shift+X)"
              >
                🗑️ Limpar Tudo
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">⏳ Carregando perguntas...</div>
          </div>
        ) : (
          <div className="divide-y">
            {questions?.map((question) => (
              <div key={question.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {question.question}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {question.options?.map((option, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-sm ${
                            index === question.correctAnswer
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {question.theme && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {question.theme}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        Nível {question.level}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        question.language === 'pt' ? 'bg-orange-100 text-orange-800' :
                        question.language === 'en' ? 'bg-indigo-100 text-indigo-800' :
                        question.language === 'es' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {question.language === 'pt' ? '🇧🇷 PT' : 
                         question.language === 'en' ? '🇺🇸 EN' :
                         question.language === 'es' ? '🇪🇸 ES' :
                         '🇫🇷 FR'}
                      </span>
                    </div>

                    {question.explanation && (
                      <p className="text-sm text-gray-600 mt-2">
                        💡 {question.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(question)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  ← Anterior
                </button>
                
                {/* Números das páginas */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Próxima →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Adicionar/Editar Pergunta */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900">
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">
              {editingQuestion ? '✏️ Editar Pergunta' : '➕ Adicionar Pergunta'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pergunta
                </label>
                <textarea
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opções
                </label>
                {questionForm.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={questionForm.correctAnswer === index}
                      onChange={() => setQuestionForm({...questionForm, correctAnswer: index})}
                      className="text-blue-600"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionForm.options];
                        newOptions[index] = e.target.value;
                        setQuestionForm({...questionForm, options: newOptions});
                      }}
                      placeholder={`Opção ${String.fromCharCode(65 + index)}`}
                      className="flex-1 p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explicação
                </label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nível
                  </label>
                  <select
                    value={questionForm.level}
                    onChange={(e) => setQuestionForm({...questionForm, level: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    {levels?.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.icon} {level.name}
                      </option>
                    )) || []}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dificuldade
                  </label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({...questionForm, difficulty: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idioma
                  </label>
                  <select
                    value={questionForm.language}
                    onChange={(e) => setQuestionForm({...questionForm, language: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    <option value="pt">🇧🇷 Português</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="fr">🇫🇷 Français</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tema
                </label>
                <select
                  value={questionForm.theme}
                  onChange={(e) => setQuestionForm({...questionForm, theme: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                >
                  <option value="">Selecione um tema</option>
                  {themes?.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.icon} {theme.name}
                    </option>
                  )) || []}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingQuestion(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={editingQuestion ? editQuestion : addQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingQuestion ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionManager;
