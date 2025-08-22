import { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

const SHEET_ID = "1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk";
const API_KEY = "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo";
const RANGE = "Sheet1";

// Configurações de idiomas suportados
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr'];
const LANGUAGE_NAMES = {
  'pt': 'Português',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français'
};

// Mapeamento de tópicos para temas
const topicToThemeMap = {
  "astronomia": "astronomy",
  "astronomy": "astronomy",
  "astronomía": "astronomy",
  "astronomie": "astronomy",
  "planetas": "planets",
  "planets": "planets",
  "estrelas": "stars",
  "stars": "stars",
  "galáxias": "galaxies",
  "galaxies": "galaxies",
  "exploração espacial": "space-exploration",
  "space exploration": "space-exploration",
  "exploración espacial": "space-exploration",
  "exploration spatiale": "space-exploration",
  "cosmologia": "cosmology",
  "cosmology": "cosmology",
  "cosmología": "cosmology",
  "cosmologie": "cosmology"
};

export default function ImportFromSheet({ hiddenTrigger = false }) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Função para validar dados da pergunta
  const validateQuestionData = (questionData) => {
    const errors = [];
    
    // Validar campos obrigatórios
    if (!questionData.baseId) errors.push('baseId é obrigatório');
    if (!questionData.language) errors.push('language é obrigatório');
    if (!questionData.question) errors.push('question é obrigatório');
    if (!questionData.optionA || !questionData.optionB || !questionData.optionC || !questionData.optionD) {
      errors.push('Todas as opções (A, B, C, D) são obrigatórias');
    }
    if (!questionData.correctOption) errors.push('correctOption é obrigatório');
    
    // Validar idioma
    if (!SUPPORTED_LANGUAGES.includes(questionData.language)) {
      errors.push(`Idioma não suportado: ${questionData.language}`);
    }
    
    // Validar nível
    const level = parseInt(questionData.level);
    if (isNaN(level) || level < 1 || level > 10) {
      errors.push(`Nível inválido: ${questionData.level}`);
    }
    
    // Validar resposta correta
    if (!['A', 'B', 'C', 'D'].includes(questionData.correctOption)) {
      errors.push(`Resposta correta inválida: ${questionData.correctOption}`);
    }
    
    return errors;
  };

  // Função para converter dados para estrutura Firebase
  const convertToFirebaseStructure = (questionData) => {
    const level = parseInt(questionData.level);
    const theme = topicToThemeMap[questionData.topic?.toLowerCase()] || 'general';
    
    // Converter resposta correta de letra para índice
    const correctAnswerMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
    const correctAnswer = correctAnswerMap[questionData.correctOption];
    
    // Determinar dificuldade baseada no nível
    let difficulty = 'easy';
    if (level >= 7) difficulty = 'hard';
    else if (level >= 4) difficulty = 'medium';
    
    return {
      baseId: questionData.baseId,
      language: questionData.language,
      question: questionData.question?.trim(),
      options: [
        questionData.optionA?.trim(),
        questionData.optionB?.trim(),
        questionData.optionC?.trim(),
        questionData.optionD?.trim()
      ],
      correctAnswer: correctAnswer,
      explanation: questionData.explanation?.trim() || "Sem explicação disponível",
      level: level,
      difficulty: difficulty,
      theme: theme,
      topics: [questionData.topic],
      active: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: "Google Sheets Multi-Language Import",
        importDate: new Date(),
        version: "1.0",
        verified: true,
        reviewCount: 0,
        lastReviewed: new Date()
      }
    };
  };

  // Função para agrupar perguntas por baseId
  const groupQuestionsByBaseId = (questionsData) => {
    const grouped = {};
    
    questionsData.forEach(questionData => {
      const baseId = questionData.baseId;
      if (!grouped[baseId]) {
        grouped[baseId] = [];
      }
      grouped[baseId].push(questionData);
    });
    
    return grouped;
  };

  // Função para analisar dados
  const analyzeData = (questionsData) => {
    const grouped = groupQuestionsByBaseId(questionsData);
    const analysis = {
      totalQuestions: questionsData.length,
      uniqueBaseIds: Object.keys(grouped).length,
      languages: {},
      levels: {},
      topics: {},
      completeness: {}
    };
    
    // Analisar idiomas
    questionsData.forEach(row => {
      analysis.languages[row.language] = (analysis.languages[row.language] || 0) + 1;
    });
    
    // Analisar níveis
    questionsData.forEach(row => {
      analysis.levels[row.level] = (analysis.levels[row.level] || 0) + 1;
    });
    
    // Analisar tópicos
    questionsData.forEach(row => {
      analysis.topics[row.topic] = (analysis.topics[row.topic] || 0) + 1;
    });
    
    // Analisar completude por baseId
    Object.entries(grouped).forEach(([baseId, questions]) => {
      const languages = questions.map(q => q.language);
      const missingLanguages = SUPPORTED_LANGUAGES.filter(lang => !languages.includes(lang));
      
      analysis.completeness[baseId] = {
        total: questions.length,
        languages: languages,
        missingLanguages: missingLanguages,
        isComplete: missingLanguages.length === 0
      };
    });
    
    return analysis;
  };

  const handleImport = async () => {
    setImporting(true);
    setStatus(t("importing_questions"));
    setShowSuccess(false);
    setImportResult(null);
    setAnalysis(null);

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
      console.log("🔗 Tentando acessar Google Sheets:", url);
      
      const res = await fetch(url);
      const data = await res.json();

      if (!data.values || data.values.length === 0) {
        throw new Error("Nenhum dado encontrado na planilha");
      }

      console.log("📋 Dados da planilha:", {
        totalRows: data.values.length,
        headers: data.values[0],
        sampleRow: data.values[1],
        sheetInfo: {
          sheetId: SHEET_ID,
          range: RANGE,
          url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
        }
      });

      const rows = data.values;
      const headers = rows[0];
      
      // Converter linhas para objetos
      const rawQuestions = rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i];
        });
        return obj;
      });

      // Validar e processar dados
      const validQuestions = [];
      const invalidQuestions = [];
      
      rawQuestions.forEach((row, index) => {
        const errors = validateQuestionData(row);
        if (errors.length === 0) {
          validQuestions.push(row);
        } else {
          invalidQuestions.push({
            data: row,
            errors: errors,
            rowIndex: index + 2 // +2 porque começamos do índice 1 e pulamos o header
          });
        }
      });

      // Analisar dados válidos
      const dataAnalysis = analyzeData(validQuestions);
      setAnalysis(dataAnalysis);

      console.log("📊 Análise dos dados:", dataAnalysis);

      // Verificar perguntas existentes
      const existingQuestions = {};
      const questionsRef = collection(db, 'questions');
      const existingSnapshot = await getDocs(questionsRef);
      
      existingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.baseId && data.language) {
          const key = `${data.baseId}_${data.language}`;
          existingQuestions[key] = {
            id: doc.id,
            ...data
          };
        }
      });

      // Separar perguntas novas e duplicadas
      const newQuestions = [];
      const duplicateQuestions = [];
      
      validQuestions.forEach(questionData => {
        const key = `${questionData.baseId}_${questionData.language}`;
        if (existingQuestions[key]) {
          duplicateQuestions.push({
            data: questionData,
            existing: existingQuestions[key]
          });
        } else {
          newQuestions.push(questionData);
        }
      });

      // Importar perguntas novas usando batch
      let importedCount = 0;
      let errorCount = 0;

      if (newQuestions.length > 0) {
        const batch = writeBatch(db);
        
        newQuestions.forEach(questionData => {
          try {
            const firebaseQuestion = convertToFirebaseStructure(questionData);
            const questionId = `q_${questionData.baseId}_${questionData.language}_${Date.now()}`;
            const questionRef = doc(db, 'questions', questionId);
            
            batch.set(questionRef, firebaseQuestion);
            importedCount++;
          } catch (error) {
            console.error(`❌ Erro ao processar pergunta ${questionData.baseId}:`, error.message);
            errorCount++;
          }
        });

        // Executar batch
        await batch.commit();
        console.log(`✅ Batch executado com sucesso! ${importedCount} perguntas importadas`);
      }

      const result = {
        total: rawQuestions.length,
        valid: validQuestions.length,
        invalid: invalidQuestions.length,
        new: newQuestions.length,
        duplicates: duplicateQuestions.length,
        imported: importedCount,
        errors: errorCount,
        timestamp: new Date()
      };

      setImportResult(result);
      setShowSuccess(true);
      setStatus(t("import_complete", { count: importedCount }));
      
      console.log("📊 Resultado da importação:", result);
      
    } catch (err) {
      console.error("❌ Import error:", err);
      setStatus(t("import_failed"));
      setShowSuccess(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      {!hiddenTrigger && (
        <button
          id="importBtn"
          onClick={handleImport}
          disabled={importing}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {importing ? "Importando..." : "Importar do Google Sheets"}
        </button>
      )}

      {importing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Importando Perguntas</h3>
              <p className="text-gray-600">{status}</p>
            </div>
          </div>
        </div>
      )}

      {showSuccess && importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-600 mb-4">✅ Importação Concluída!</h3>
              
              <div className="text-left space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-semibold">Total Processado</p>
                    <p className="text-2xl text-blue-600">{importResult.total}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded">
                    <p className="font-semibold">Importadas</p>
                    <p className="text-2xl text-green-600">{importResult.imported}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded">
                    <p className="font-semibold">Duplicadas</p>
                    <p className="text-2xl text-yellow-600">{importResult.duplicates}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded">
                    <p className="font-semibold">Erros</p>
                    <p className="text-2xl text-red-600">{importResult.errors}</p>
                  </div>
                </div>

                {analysis && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">📊 Análise dos Dados</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>IDs Únicos:</strong> {analysis.uniqueBaseIds}</p>
                        <p><strong>Média por ID:</strong> {(analysis.totalQuestions / analysis.uniqueBaseIds).toFixed(1)}</p>
                      </div>
                      <div>
                        <p><strong>IDs Completos:</strong> {Object.values(analysis.completeness).filter(info => info.isComplete).length}</p>
                        <p><strong>IDs Incompletos:</strong> {Object.values(analysis.completeness).filter(info => !info.isComplete).length}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h5 className="font-semibold mb-2">🌍 Distribuição por Idioma:</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(analysis.languages).map(([lang, count]) => (
                          <div key={lang} className="flex justify-between">
                            <span>{LANGUAGE_NAMES[lang] || lang}:</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowSuccess(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
