import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";

const QuestionList = ({ onAddQuestion }) => {
  const { t } = useTranslation();

  const [questions, setQuestions] = useState([]);
  const [topicFilter, setTopicFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(50);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "questions"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const q = doc.data() || {};
        return {
          id: doc.id,
          question: q.question || "",
          topic: q.topic || "",
          level: q.level ?? 0,
          correctOption: q.correctOption || "",
          ...q,
        };
      });
      setQuestions(data);
      
      // Log para debug - mostrar informações sobre as perguntas
      console.log("📊 Perguntas no Firebase:", {
        total: data.length,
        topics: [...new Set(data.map(q => q.topic))],
        levels: [...new Set(data.map(q => q.level))],
        sampleQuestion: data[0] || "Nenhuma pergunta encontrada"
      });
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm(t("confirm_delete"))) {
      await deleteDoc(doc(db, "questions", id));
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesTopic = topicFilter === "" || q.topic === topicFilter;
    const matchesLevel = levelFilter === "" || q.level === parseInt(levelFilter);
    return matchesTopic && matchesLevel;
  });

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const currentQuestions = filteredQuestions.slice(
    startIndex,
    startIndex + questionsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [topicFilter, levelFilter, questionsPerPage]);

  // Garantir que a página atual não exceda o número total de páginas
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const uniqueTopics = [...new Set(questions.map((q) => q.topic || ""))].sort();
  const uniqueLevels = [...new Set(questions.map((q) => q.level ?? 0))].sort((a, b) => a - b);

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-yellow-400">
            {t("questions_tab")}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {t("total_questions")}: {questions.length}
          </p>
        </div>
        <button
          onClick={onAddQuestion}
          className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-lg">+</span>
          <span>{t("add_question")}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="p-2 rounded text-black"
          onChange={(e) => setTopicFilter(e.target.value)}
          value={topicFilter}
        >
          <option value="">{t("all_topics")}</option>
          {uniqueTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded text-black"
          onChange={(e) => setLevelFilter(e.target.value)}
          value={levelFilter}
        >
          <option value="">{t("all_levels")}</option>
          {uniqueLevels.map((level) => (
            <option key={level} value={level}>
              {t("level")} {level}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded text-black"
          onChange={(e) => setQuestionsPerPage(Number(e.target.value))}
          value={questionsPerPage}
        >
          <option value={10}>{t("questions_per_page")} 10</option>
          <option value={25}>{t("questions_per_page")} 25</option>
          <option value={50}>{t("questions_per_page")} 50</option>
        </select>

        <button
          onClick={() => {
            setTopicFilter("");
            setLevelFilter("");
          }}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          {t("clear_filters")}
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed bg-white bg-opacity-10 rounded-md text-sm">
          <thead>
            <tr className="border-b border-gray-500 text-left text-white">
              <th className="py-2 px-4 w-2/12">{t("topic")}</th>
              <th className="py-2 px-4 w-1/12">{t("level")}</th>
              <th className="py-2 px-4 w-5/12">{t("question")}</th>
              <th className="py-2 px-4 w-1/12">{t("correct")}</th>
              <th className="py-2 px-4 w-3/12">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {currentQuestions.map((q) => (
              <tr
                key={q.id}
                className="border-b border-gray-700 hover:bg-white hover:bg-opacity-5"
              >
                <td className="py-2 px-4 break-words">{q.topic}</td>
                <td className="py-2 px-4">{q.level}</td>
                <td className="py-2 px-4 truncate">{q.question}</td>
                <td className="py-2 px-4">{q.correctOption}</td>
                <td className="py-2 px-4 flex gap-2 flex-wrap">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-xs rounded">
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-xs rounded"
                  >
                    {t("delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Sem resultados */}
        {filteredQuestions.length === 0 && (
          <p className="text-center text-gray-300 mt-4">
            {t("no_results")}
          </p>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50"
          >
            {t("previous")}
          </button>
          <span className="text-white">
            {t("page")} {currentPage} {t("of")} {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionList;
