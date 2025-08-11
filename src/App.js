import React, { useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import UserManagement from "./components/UserManagement";
import AddUserModal from "./components/AddUserModal";
import AddQuestionModal from "./components/AddQuestionModal";
import GameRulesManager from "./components/GameRulesManager";
import ThemeManager from "./components/ThemeManager";
import DatabaseManager from "./components/DatabaseManager";
import QuestionManager from "./components/QuestionManager";
import Sidebar from "./components/Sidebar";

function AppContent() {
  const [activeTab, setActiveTab] = useState("questions");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "questions":
        return <QuestionManager />;
      case "themes":
        return <ThemeManager />;
      case "database":
        return <DatabaseManager />;
      case "users":
        return (
          <UserManagement onAddUser={() => setIsAddUserModalOpen(true)} />
        );
      case "analytics":
        return (
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Analytics</h2>
            <p className="text-gray-300">
              Seção de analytics em desenvolvimento. Aqui você poderá ver estatísticas detalhadas sobre:
            </p>
            <ul className="text-gray-300 mt-4 space-y-2 max-w-md mx-auto">
              <li>• Desempenho dos usuários</li>
              <li>• Perguntas mais difíceis</li>
              <li>• Estatísticas de uso do app</li>
              <li>• Relatórios de engajamento</li>
            </ul>
          </div>
        );
      case "settings":
        return <GameRulesManager />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="ml-64">
        <AdminLayout>
          <div className="max-w-6xl mx-auto px-6 py-8">
            {renderContent()}
          </div>
        </AdminLayout>
      </div>
      
      {/* Modal para adicionar usuário */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={() => {
          // Opcional: mostrar notificação de sucesso
          console.log("User created successfully!");
        }}
      />

      {/* Modal para adicionar pergunta */}
      <AddQuestionModal
        isOpen={isAddQuestionModalOpen}
        onClose={() => setIsAddQuestionModalOpen(false)}
        onSuccess={() => {
          // Opcional: mostrar notificação de sucesso
          console.log("Question created successfully!");
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
