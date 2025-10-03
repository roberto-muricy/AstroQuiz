/**
 * App Context
 * Gerenciamento de estado global do app
 */

import quizService from "@/services/quizService";
import { GameRules, QuizSession, User } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AppContextData {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;

  // Quiz state
  currentSession: QuizSession | null;
  setCurrentSession: (session: QuizSession | null) => void;

  // Game rules
  gameRules: GameRules | null;
  loadGameRules: () => Promise<void>;

  // Settings
  locale: string;
  setLocale: (locale: string) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(
    null
  );
  const [gameRules, setGameRules] = useState<GameRules | null>(null);
  const [locale, setLocale] = useState<string>("pt");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Carregar dados ao iniciar o app
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Carregar dados iniciais
   */
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Carregar usuário salvo
      const savedUser = await AsyncStorage.getItem("@user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        // Criar usuário mock para desenvolvimento
        const mockUser: User = {
          id: "1",
          name: "Astronauta",
          email: "user@astroquiz.com",
          level: 5,
          xp: 1250,
          totalXP: 5000,
          avatarUrl: null,
          locale: "pt",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
      }

      // Carregar locale salvo
      const savedLocale = await AsyncStorage.getItem("@locale");
      if (savedLocale) {
        setLocale(savedLocale);
      }

      // Carregar sessão ativa
      const savedSession = await AsyncStorage.getItem("@current_session");
      if (savedSession) {
        setCurrentSession(JSON.parse(savedSession));
      }

      // Carregar regras do jogo (opcional, não bloqueia UI)
      loadGameRules().catch((err) => {
        console.log("Regras do jogo não carregadas, usando defaults");
      });
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      // Criar usuário mock em caso de erro
      const mockUser: User = {
        id: "1",
        name: "Astronauta",
        email: "user@astroquiz.com",
        level: 5,
        xp: 1250,
        totalXP: 5000,
        avatarUrl: null,
        locale: "pt",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carregar regras do jogo
   */
  const loadGameRules = async () => {
    try {
      const rules = await quizService.getGameRules();
      setGameRules(rules);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
    }
  };

  /**
   * Salvar usuário no storage
   */
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem("@user", JSON.stringify(user));
    } else {
      AsyncStorage.removeItem("@user");
    }
  }, [user]);

  /**
   * Salvar locale no storage
   */
  useEffect(() => {
    AsyncStorage.setItem("@locale", locale);
  }, [locale]);

  /**
   * Salvar sessão no storage
   */
  useEffect(() => {
    if (currentSession) {
      AsyncStorage.setItem("@current_session", JSON.stringify(currentSession));
    } else {
      AsyncStorage.removeItem("@current_session");
    }
  }, [currentSession]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        currentSession,
        setCurrentSession,
        gameRules,
        loadGameRules,
        locale,
        setLocale,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

/**
 * Hook para usar o contexto
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp deve ser usado dentro de AppProvider");
  }
  return context;
};
