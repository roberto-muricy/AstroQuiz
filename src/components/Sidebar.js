import React from "react";
import { useTranslation } from "react-i18next";
import { useStats } from "../hooks/useStats";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const { totalQuestions, totalUsers, activeUsers, loading } = useStats();
  const { currentUser, logout } = useAuth();

  const tabs = [
    {
      id: "questions",
      name: t("questions_tab"),
      icon: "❓",
      description: t("questions_tab_desc")
    },
    {
      id: "themes",
      name: "Temas",
      icon: "🌌",
      description: "Gerenciar temas astronômicos"
    },
    {
      id: "database",
      name: "Banco de Dados",
      icon: "🏗️",
      description: "Gerenciar estrutura do banco"
    },
    {
      id: "users",
      name: t("users_tab"),
      icon: "👥",
      description: t("users_tab_desc")
    },
    {
      id: "analytics",
      name: t("analytics_tab"),
      icon: "📊",
      description: t("analytics_tab_desc")
    },
    {
      id: "settings",
      name: t("settings_tab"),
      icon: "⚙️",
      description: t("settings_tab_desc")
    }
  ];

  return (
    <div className="w-64 bg-gray-900/90 backdrop-blur-sm border-r border-gray-700 min-h-screen fixed left-0 top-0 z-30">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <img 
            src="/astro_quiz_logo.png" 
            alt="AstroQuiz" 
            className="w-10 h-10 rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-yellow-400">AstroQuiz</h1>
            <p className="text-xs text-gray-400">{t("admin_panel")}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-yellow-500/20 border-l-4 border-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{tab.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Stats Section */}
      <div className="p-4 mt-6 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          {t("quick_stats")}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">{t("total_questions")}</span>
            <span className="text-sm font-medium text-yellow-400">
              {loading ? "..." : totalQuestions}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">{t("total_users")}</span>
            <span className="text-sm font-medium text-yellow-400">
              {loading ? "..." : totalUsers}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">{t("active_users")}</span>
            <span className="text-sm font-medium text-green-400">
              {loading ? "..." : activeUsers}
            </span>
          </div>
        </div>
      </div>

      {/* User Info & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        {currentUser && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-black">
                  {currentUser.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.email}
                </p>
                <p className="text-xs text-gray-400">Administrador</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200"
            >
              🚪 Sair
            </button>
          </div>
        )}
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2024 AstroQuiz Admin
          </p>
          <p className="text-xs text-gray-500 mt-1">
            v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
