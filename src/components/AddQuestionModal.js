import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";

const AddQuestionModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    topic: "",
    level: 1,
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "",
    explanation: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(""); // Limpar erro ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.topic.trim()) {
      setError(t("topic_required"));
      return;
    }

    if (!formData.question.trim()) {
      setError(t("question_required"));
      return;
    }

    if (!formData.optionA.trim() || !formData.optionB.trim() || 
        !formData.optionC.trim() || !formData.optionD.trim()) {
      setError(t("all_options_required"));
      return;
    }

    if (!formData.correctOption.trim()) {
      setError(t("correct_option_required"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const options = [formData.optionA, formData.optionB, formData.optionC, formData.optionD];

      const questionData = {
        topic: formData.topic.trim(),
        level: Number(formData.level),
        question: formData.question.trim(),
        options,
        correctOption: formData.correctOption.trim(),
        explanation: formData.explanation.trim(),
        createdAt: new Date(),
      };

      await addDoc(collection(db, "questions"), questionData);

      // Reset form
      setFormData({
        topic: "",
        level: 1,
        question: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "",
        explanation: "",
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error("Error creating question:", error);
      setError(t("question_creation_error"));
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFormData({
      topic: "",
      level: 1,
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "",
      explanation: "",
    });
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-yellow-400">
            {t("add_new_question")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t("topic")} *
              </label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder={t("enter_topic")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t("level")} *
              </label>
              <select
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              >
                <option value={1}>{t("level")} 1</option>
                <option value={2}>{t("level")} 2</option>
                <option value={3}>{t("level")} 3</option>
                <option value={4}>{t("level")} 4</option>
                <option value={5}>{t("level")} 5</option>
              </select>
            </div>
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("question")} *
            </label>
            <textarea
              name="question"
              value={formData.question}
              onChange={handleInputChange}
              placeholder={t("enter_question")}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t("option_a")} *
              </label>
              <input
                type="text"
                name="optionA"
                value={formData.optionA}
                onChange={handleInputChange}
                placeholder={t("enter_option_a")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t("option_b")} *
              </label>
              <input
                type="text"
                name="optionB"
                value={formData.optionB}
                onChange={handleInputChange}
                placeholder={t("enter_option_b")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t("option_c")} *
              </label>
              <input
                type="text"
                name="optionC"
                value={formData.optionC}
                onChange={handleInputChange}
                placeholder={t("enter_option_c")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t("option_d")} *
              </label>
              <input
                type="text"
                name="optionD"
                value={formData.optionD}
                onChange={handleInputChange}
                placeholder={t("enter_option_d")}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Correct Option */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("correct_option")} *
            </label>
            <select
              name="correctOption"
              value={formData.correctOption}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            >
              <option value="">{t("select_correct_option")}</option>
              <option value={formData.optionA}>{formData.optionA || t("option_a")}</option>
              <option value={formData.optionB}>{formData.optionB || t("option_b")}</option>
              <option value={formData.optionC}>{formData.optionC || t("option_c")}</option>
              <option value={formData.optionD}>{formData.optionD || t("option_d")}</option>
            </select>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("explanation_optional")}
            </label>
            <textarea
              name="explanation"
              value={formData.explanation}
              onChange={handleInputChange}
              placeholder={t("enter_explanation")}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-900/50 border border-red-700 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-gray-900 font-medium rounded-md transition-colors"
            >
              {loading ? t("creating_question") : t("create_question")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuestionModal;
