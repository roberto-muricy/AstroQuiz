/**
 * AstroQuiz App
 * Arquivo principal da aplicação
 */

import { AppProvider } from "@/contexts/AppContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { NavigationContainer } from "@react-navigation/native";
import React, { useEffect } from "react";
import { StatusBar } from "react-native";

const App = () => {
  useEffect(() => {
    checkBackendConnection();
  }, []);

  /**
   * Verificar conexão com backend
   */
  const checkBackendConnection = async () => {
    try {
      // Comentado temporariamente para não bloquear a UI
      // await api.healthCheck();
      console.log("⚠️ Health check desativado temporariamente");
    } catch (error) {
      console.error("❌ Erro ao conectar com backend:", error);
      // Não mostrar alert para não atrapalhar desenvolvimento
      console.warn(
        "Backend não está respondendo, mas o app continuará funcionando"
      );
    }
  };

  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <RootNavigator />
      </NavigationContainer>
    </AppProvider>
  );
};

export default App;
