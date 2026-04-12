/**
 * App Context
 * Gerenciamento de estado global do app
 */

import api from "@/services/api";
import authService from "@/services/authService";
import quizService from "@/services/quizService";
import strapiSyncService from "@/services/strapiSyncService";
import { ProgressStorage } from "@/utils/progressStorage";
import { GameRules, QuizSession, User } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { changeLanguage } from "@/i18n";
import { setSentryUser } from "@/config/sentry";
import analyticsService from "@/services/analyticsService";

type AuthResponse = { ok: true } | { ok: false; message: string };

interface AppContextData {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<AuthResponse>;
  signInWithApple: () => Promise<AuthResponse>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResponse>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;

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
  const [locale, setLocaleState] = useState<string>("pt");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const localeLoadedRef = React.useRef(false);

  // Carregar dados ao iniciar o app
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Gerar ID anônimo único (UUID v4 simples)
   */
  const generateAnonymousId = () => {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  };

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
        const anonId = generateAnonymousId();
        const anonUser: User = {
          id: anonId,
          name: "Astronauta",
          email: `${anonId}@guest.astroquiz.com`,
          level: 1,
          xp: 0,
          totalXP: 0,
          streak: 0,
          avatarUrl: null,
          locale: "pt",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(anonUser);
        await AsyncStorage.setItem("@user", JSON.stringify(anonUser));
      }

      // Carregar locale salvo
      const savedLocale = await AsyncStorage.getItem("@locale");
      if (savedLocale) {
        setLocaleState(savedLocale);
        changeLanguage(savedLocale);
      }
      localeLoadedRef.current = true;

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
      const mockUser: User = {
        id: "guest",
        name: "Astronauta",
        email: "guest@astroquiz.com",
        level: 1,
        xp: 0,
        totalXP: 0,
        streak: 0,
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
      console.log("⚠️ Erro ao carregar regras (offline?):", (error as any)?.message || error);
    }
  };

  /**
   * Salvar usuário no storage, atualizar Sentry e Analytics
   */
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem("@user", JSON.stringify(user));
      setSentryUser({
        id: user.id,
        email: user.email,
        name: user.name,
      });
      analyticsService.setUserId(user.id);
      analyticsService.setUserProperties({
        user_level: String(user.level || 1),
        locale: user.locale || 'pt',
      });
    } else {
      AsyncStorage.removeItem("@user");
      setSentryUser(null);
      analyticsService.setUserId(null);
    }
  }, [user]);

  /**
   * Função para mudar o locale (salva no storage e sincroniza i18n)
   */
  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem("@locale", newLocale);
    changeLanguage(newLocale);
  };

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

  const isAuthenticated = !!user && !user.id.startsWith("anon_") && user.id !== "guest";

  const handleFirebaseUser = useCallback(async (fbUser: any): Promise<User> => {
    // Get and save Firebase ID token for backend API authentication
    const idToken = await authService.getIdToken();
    if (idToken) {
      await api.setAuthToken(idToken);
      console.log('🔑 Firebase ID token saved for API authentication');
    }

    // Sync with Strapi backend
    console.log('📡 Syncing user with Strapi...');
    try {
      const serverProfile = await strapiSyncService.syncUser(
        fbUser.uid,
        fbUser.email,
        fbUser.displayName,
        fbUser.photoURL
      );

      const localProgress = await ProgressStorage.getProgress();
      const mergedStats = strapiSyncService.mergeStats(localProgress.stats, serverProfile);

      await ProgressStorage.saveProgress({
        ...localProgress,
        stats: mergedStats,
      });

      console.log('✅ User synced with Strapi');
    } catch (error) {
      console.warn('⚠️ Could not sync with Strapi, continuing with local data:', error);
    }

    const nextUser: User = {
      id: fbUser.uid,
      name: fbUser.displayName || "Astronauta",
      email: fbUser.email || "user@astroquiz.com",
      avatarUrl: fbUser.photoURL || null,
      level: user?.level ?? 1,
      xp: user?.xp ?? 0,
      totalXP: user?.totalXP ?? 0,
      streak: user?.streak ?? 0,
      locale: user?.locale ?? "pt",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUser(nextUser);
    return nextUser;
  }, [user]);

  /**
   * Login com Google (Firebase Auth)
   */
  const signInWithGoogle = useCallback(async (): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (!result.ok) {
        console.log("❌ Google login failed:", result);
        return { ok: false, message: 'message' in result ? result.message : 'Erro desconhecido' };
      }

      const fbUser = authService.getCurrentUser();
      if (!fbUser) return { ok: false, message: "Firebase não retornou usuário após o login." };

      await handleFirebaseUser(fbUser);
      analyticsService.logLogin('google');
      return { ok: true };
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseUser]);

  /**
   * Login com Apple (Firebase Auth)
   */
  const signInWithApple = useCallback(async (): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithApple();
      if (!result.ok) {
        return { ok: false, message: 'message' in result ? result.message : 'Erro desconhecido' };
      }

      const fbUser = authService.getCurrentUser();
      if (!fbUser) return { ok: false, message: 'Firebase não retornou usuário após o login.' };

      await handleFirebaseUser(fbUser);
      analyticsService.logLogin('apple');
      return { ok: true };
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseUser]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithEmail(email, password);
      if (!result.ok) return { ok: false, message: 'message' in result ? result.message : 'Erro ao entrar' };

      const fbUser = authService.getCurrentUser();
      if (!fbUser) return { ok: false, message: "Firebase não retornou usuário após o login." };

      await handleFirebaseUser(fbUser);
      analyticsService.logLogin('email');
      return { ok: true };
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseUser]);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const result = await authService.signUpWithEmail(email, password);
      if (!result.ok) return { ok: false, message: 'message' in result ? result.message : 'Erro ao criar conta' };

      const fbUser = authService.getCurrentUser();
      if (!fbUser) return { ok: false, message: "Firebase não retornou usuário após criar a conta." };

      await handleFirebaseUser(fbUser);
      analyticsService.logSignUp('email');
      return { ok: true };
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseUser]);

  /**
   * Excluir conta - remove dados do backend e deleta usuário no Firebase
   */
  const deleteAccount = useCallback(async () => {
    setIsLoading(true);
    try {
      // Deletar dados do perfil no Strapi backend
      try {
        await api.delete('/user-profile/me');
      } catch (backendError) {
        console.warn('⚠️ Could not delete backend profile:', backendError);
      }

      // Deletar usuário no Firebase Auth
      await authService.deleteAccount();
      await api.clearAuthToken();

      // Limpar estado local (volta para usuário anônimo)
      setUser({
        id: 'guest',
        name: 'Astronauta',
        email: 'guest@astroquiz.com',
        level: 1,
        xp: 0,
        totalXP: 0,
        streak: 0,
        avatarUrl: null,
        locale: locale || 'pt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  /**
   * Logout
   */
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      analyticsService.logLogout();
      await authService.signOut();
      await api.clearAuthToken();
      console.log('🔓 Auth token cleared');
      setCurrentSession(null);
      setUser({
        id: "guest",
        name: "Astronauta",
        email: "guest@astroquiz.com",
        level: 1,
        xp: 0,
        totalXP: 0,
        streak: 0,
        avatarUrl: null,
        locale: locale || "pt",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const contextValue = useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    deleteAccount,
    currentSession,
    setCurrentSession,
    gameRules,
    loadGameRules,
    locale,
    setLocale,
    isLoading,
    setIsLoading,
  }), [user, isAuthenticated, currentSession, gameRules, locale, isLoading,
       signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signOut, deleteAccount]);

  return (
    <AppContext.Provider value={contextValue}>
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
