import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from './LoginScreen';

const ProtectedRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado ou não é admin, mostrar tela de login
  if (!currentUser || !isAdmin) {
    return <LoginScreen />;
  }

  // Se está autenticado e é admin, mostrar o conteúdo protegido
  return children;
};

export default ProtectedRoute;
