import { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

const SHEET_ID = "1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk";
const API_KEY = "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo";
const RANGE = "Sheet1";

export default function ImportFromSheet({ hiddenTrigger = false }) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleImport = async () => {
    setImporting(true);
    setStatus(t("importing_questions"));
    setShowSuccess(false);
    setImportResult(null);

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
      console.log("🔗 Tentando acessar Google Sheets:", url);
      
      const res = await fetch(url);
      const data = await res.json();

      console.log("📋 Dados da planilha:", {
        totalRows: data.values?.length || 0,
        headers: data.values?.[0] || [],
        sampleRow: data.values?.[1] || [],
        sheetInfo: {
          sheetId: SHEET_ID,
          range: RANGE,
          url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
        }
      });

      const rows = data.values;
      const headers = rows[0];
      const questions = rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i];
        });

        return {
          topic: obj.topic,
          level: Number(obj.level),
          question: obj.question,
          options: [obj.optionA, obj.optionB, obj.optionC, obj.optionD],
          correctOption: obj.correctOption,
          explanation: obj.explanation,
        };
      });

      let addedCount = 0;
      let skippedCount = 0;

      for (const question of questions) {
        const q = query(
          collection(db, "questions"),
          where("question", "==", question.question),
          where("level", "==", question.level)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          await addDoc(collection(db, "questions"), question);
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      const result = {
        added: addedCount,
        skipped: skippedCount,
        total: questions.length,
        timestamp: new Date()
      };

      setImportResult(result);
      setShowSuccess(true);
      setStatus(t("import_complete", { count: addedCount }));
    } catch (err) {
      console.error("❌ Import error:", err);
      setStatus(t("import_failed"));
      setShowSuccess(false);
    }

    setImporting(false);
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    setImportResult(null);
    setStatus("");
  };

  // Tela de Loading
  if (importing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            {/* Spinner animado */}
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
            </div>
            
            {/* Ícone */}
            <div className="text-6xl mb-4">📥</div>
            
            {/* Título */}
            <h3 className="text-xl font-bold text-yellow-400 mb-2">
              {t("importing_questions")}
            </h3>
            
            {/* Descrição */}
            <p className="text-gray-300 mb-4">
              {t("importing_description", "Conectando com Google Sheets e processando perguntas...")}
            </p>
            
            {/* Barra de progresso */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div className="bg-yellow-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            
            {/* Status */}
            <p className="text-sm text-gray-400">
              {status}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Sucesso
  if (showSuccess && importResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            {/* Ícone de sucesso */}
            <div className="text-6xl mb-4">✅</div>
            
            {/* Título */}
            <h3 className="text-xl font-bold text-green-400 mb-2">
              {t("import_success_title", "Importação Concluída!")}
            </h3>
            
            {/* Resultados */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">{t("questions_added", "Perguntas adicionadas")}:</span>
                  <span className="text-green-400 font-bold">{importResult.added}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">{t("questions_skipped", "Perguntas ignoradas")}:</span>
                  <span className="text-yellow-400 font-bold">{importResult.skipped}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2">
                  <span className="text-gray-300 font-medium">{t("total_processed", "Total processado")}:</span>
                  <span className="text-white font-bold">{importResult.total}</span>
                </div>
              </div>
            </div>
            
            {/* Timestamp */}
            <p className="text-xs text-gray-500 mb-6">
              {t("imported_at", "Importado em")}: {importResult.timestamp.toLocaleString()}
            </p>
            
            {/* Botão de fechar */}
            <button
              onClick={closeSuccess}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {t("close", "Fechar")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Componente normal
  return hiddenTrigger ? (
    <button
      id="importBtn"
      onClick={handleImport}
      className="hidden"
    />
  ) : (
    <div>
      <button
        onClick={handleImport}
        disabled={importing}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
      >
        {importing ? t("importing") : t("import_questions")}
      </button>
      {status && !showSuccess && (
        <div className="mt-2 p-3 rounded-lg bg-gray-800/50">
          <p className="text-sm text-gray-300">{status}</p>
        </div>
      )}
    </div>
  );
}
