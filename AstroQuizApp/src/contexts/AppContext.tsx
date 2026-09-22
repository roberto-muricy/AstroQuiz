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
import auth from "@react-native-firebase/auth";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import i18n, { changeLanguage } from "@/i18n";
import { setSentryUser } from "@/config/sentry";
import analyticsService from "@/services/analyticsService";
import { ehUsuarioAutenticado, sessaoPerdida } from "@/utils/autenticacao";

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

/** Quem fica depois de sair, excluir a conta ou perder a sessão. */
const usuarioConvidado = (locale: string): User => ({
  id: "guest",
  name: "Astronauta",
  email: "guest@astroquiz.com",
  level: 1,
  xp: 0,
  totalXP: 0,
  streak: 0,
  avatarUrl: null,
  locale,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

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

  /** Quem o Firebase diz que está conectado; undefined até ele responder. */
  const [uidDoFirebase, setUidDoFirebase] = useState<string | null | undefined>(undefined);
  /**
   * Sair e excluir a conta desligam o Firebase de propósito. Enquanto isso
   * acontece, a queda da sessão é esperada e não merece aviso.
   */
  const saindoRef = useRef(false);

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
      loadGameRules().catch((_err) => {
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
      setSentryUser({ id: user.id });
      analyticsService.setUserId(user.id);
      analyticsService.setUserProperties({
        user_level: String(user.level || 1),
      });
      // Decidido pela regra, nao pelo ramo: aqui dentro tambem cai o convidado.
      analyticsService.registrarAutenticacao(ehUsuarioAutenticado(user), user.locale || locale);
    } else {
      AsyncStorage.removeItem("@user");
      setSentryUser(null);
      analyticsService.setUserId(null);
      // As propriedades do Firebase persistem no aparelho ate serem
      // sobrescritas. Antes disto o logout so limpava o userId, e o user_level
      // do usuario anterior ficava grudado para sempre — qualquer relatorio
      // segmentado por nivel contava um convidado como se fosse aquela pessoa.
      analyticsService.setUserProperties({ user_level: null });
      analyticsService.registrarAutenticacao(false, locale);
    }
  }, [user, locale]);

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

  const isAuthenticated = ehUsuarioAutenticado(user);

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
    // NÃO alterar isLoading antes/durante a folha nativa do Sign in with Apple.
    // Qualquer re-render da árvore enquanto a folha está aberta faz o iOS
    // cancelar o fluxo (ASAuthorizationError 1001 / "Login cancelado"). A
    // própria folha nativa já cobre a UX; a troca com o Firebase é rápida.
    const result = await authService.signInWithApple();
    if (!result.ok) {
      return { ok: false, message: 'message' in result ? result.message : 'Erro desconhecido' };
    }

    const fbUser = authService.getCurrentUser();
    if (!fbUser) return { ok: false, message: 'Firebase não retornou usuário após o login.' };

    await handleFirebaseUser(fbUser);
    analyticsService.logLogin('apple');
    return { ok: true };
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
   *
   * A ordem importa, e é nesta. Só o token do Firebase prova quem é o dono de
   * um UID, e é por UID que o backend apaga tudo. Apagar a conta do Firebase
   * primeiro — ou mesmo continuar depois de o backend falhar — deixaria o
   * perfil, os resultados de fase e o cadastro no ranking no banco sem nenhum
   * caminho de exclusão, porque aquele UID nunca mais conseguiria se
   * autenticar. O apelido continuaria aparecendo na lista pública de alguém
   * que excluiu a conta.
   *
   * Por isso o erro do backend interrompe tudo: é melhor não excluir nada e a
   * pessoa tentar de novo. A rota aguenta a repetição — ela apaga resultados e
   * cadastro no ranking mesmo quando o perfil já não existe.
   */
  const deleteAccount = useCallback(async () => {
    setIsLoading(true);
    saindoRef.current = true;
    try {
      // repetirEmFalhaDeRede: a rota é idempotente, e uma conexão instável é
      // justamente o caso em que a exclusão não pode ficar pela metade.
      await api.delete('/user-profile/me', { repetirEmFalhaDeRede: true });

      // Só agora, com os dados fora do servidor, a conta pode ir embora.
      await authService.deleteAccount();
      await api.clearAuthToken();

      // Limpar estado local (volta para usuário anônimo)
      setUser(usuarioConvidado(locale || 'pt'));
    } finally {
      saindoRef.current = false;
      setIsLoading(false);
    }
  }, [locale]);

  /**
   * Logout
   */
  const signOut = useCallback(async () => {
    setIsLoading(true);
    saindoRef.current = true;
    try {
      analyticsService.logLogout();
      try {
        await authService.signOut();
      } catch {
        // Sem ninguém no Firebase — a sessão já tinha caído sozinha — o
        // signOut lança "no-current-user". Antes isso interrompia a função
        // antes de limpar o estado local, e o botão Sair não fazia nada.
        console.warn('signOut do Firebase falhou; limpando o estado local mesmo assim');
      }
      await api.clearAuthToken();
      console.log('🔓 Auth token cleared');
      setCurrentSession(null);
      setUser(usuarioConvidado(locale || "pt"));
    } finally {
      saindoRef.current = false;
      setIsLoading(false);
    }
  }, [locale]);

  // O Firebase avisa aqui quando a sessão muda, inclusive quando cai sozinha:
  // conta apagada ou desativada em outro lugar, sessão revogada. Antes nada
  // escutava isso, e a tela seguia com a conta antiga.
  useEffect(() => auth().onAuthStateChanged((fb) => setUidDoFirebase(fb ? fb.uid : null)), []);

  /**
   * Ninguém no Firebase — nem de verdade, nem anônimo — entra sozinho com
   * login anônimo. É o que dá a toda instalação um firebaseUid de verdade
   * (o app já manda o token dele em cada requisição, ver tokenParaRequisicao),
   * e com isso elegibilidade no ranking assim que uma fase termina, sem exigir
   * tela de login. `user` (o modelo local, com o id `anon_…`) não muda por
   * causa disto — quem decide se a pessoa "está logada" na tela continua
   * sendo ehUsuarioAutenticado, olhando o `user`, não o Firebase.
   *
   * Dispara de novo depois de Sair ou Excluir conta, porque os dois derrubam
   * o Firebase e uidDoFirebase volta a null — então a pessoa nunca fica sem
   * uid enquanto joga como convidado.
   *
   * Exige a autenticação anônima ligada no Console do Firebase; sem isso,
   * signInAnonymously falha (auth/operation-not-allowed) e cai no catch —
   * o app segue exatamente como hoje, sem token nenhum.
   */
  useEffect(() => {
    if (uidDoFirebase !== null) return; // undefined = Firebase ainda não respondeu; string = já tem alguém
    auth()
      .signInAnonymously()
      .catch((erro: any) => {
        console.log('Login anônimo não disponível:', erro?.code || erro?.message);
      });
  }, [uidDoFirebase]);

  // Tela e Firebase discordando: volta para convidado e explica por quê, para
  // a pessoa não seguir jogando achando que as fases vão para o ranking.
  useEffect(() => {
    if (uidDoFirebase === undefined) return;
    if (!sessaoPerdida(user, uidDoFirebase, saindoRef.current)) return;

    saindoRef.current = true;
    (async () => {
      try {
        // Com outro uid ainda há alguém no Firebase, e ele precisa sair também,
        // senão o token dessa pessoa continuaria indo nas requisições. Sem
        // ninguém, o signOut lança erro, e aqui isso não importa.
        await authService.signOut().catch(() => undefined);
        await api.clearAuthToken();
        setCurrentSession(null);
        setUser(usuarioConvidado(locale || "pt"));
      } finally {
        saindoRef.current = false;
      }
      Alert.alert(i18n.t("login.sessionExpired.title"), i18n.t("login.sessionExpired.message"));
    })();
  }, [user, uidDoFirebase, locale]);

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
