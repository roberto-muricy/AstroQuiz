import React, { useState } from "react";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    status: "active",
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email) => {
    const q = query(
      collection(db, "users"),
      where("email", "==", email.toLowerCase())
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.firstName.trim()) {
      setError(t("first_name_required"));
      return;
    }

    if (!formData.lastName.trim()) {
      setError(t("last_name_required"));
      return;
    }

    if (!formData.email.trim()) {
      setError(t("email_required"));
      return;
    }

    if (!validateEmail(formData.email)) {
      setError(t("invalid_email"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verificar se o email já existe
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setError(t("email_already_exists"));
        setLoading(false);
        return;
      }

      // Criar o usuário
      const userData = {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        status: formData.status,
        createdAt: new Date(),
        totalScore: 0,
        completedQuizzes: 0,
        achievements: [],
        preferences: {
          notifications: true,
          language: "pt"
        }
      };

      await addDoc(collection(db, "users"), userData);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        status: "active",
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error("Error creating user:", error);
      setError(t("user_creation_error"));
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      status: "active",
    });
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-yellow-400">
            {t("create_user")}
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
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("first_name")} *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder={t("enter_first_name")}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("last_name")} *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder={t("enter_last_name")}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("email")} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t("enter_email")}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t("status")}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
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
              {loading ? t("creating_user") : t("create_user")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
