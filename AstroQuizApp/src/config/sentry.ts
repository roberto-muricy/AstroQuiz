/**
 * Sentry Configuration - AstroQuiz
 *
 * Crash reporting e monitoramento de performance
 *
 * IMPORTANTE: Substitua SENTRY_DSN pelo seu DSN real do Sentry.io
 */

import * as Sentry from '@sentry/react-native';

// TODO: Substitua pelo seu DSN do Sentry.io
// Obtenha em: https://sentry.io -> Projeto -> Settings -> Client Keys (DSN)
const SENTRY_DSN = 'https://a1e8b0afe9a647085d43329aaf5fb745@o4510846491623424.ingest.us.sentry.io/4510846493720577';

// Configuração do ambiente
const getEnvironment = (): string => {
  if (__DEV__) return 'development';
  return 'production';
};

/**
 * Inicializa o Sentry
 * Chame esta função no início do App.tsx
 */
export const initSentry = () => {
  // Não inicializa em desenvolvimento (opcional - remova se quiser testar em dev)
  if (__DEV__) {
    console.log('🔧 Sentry disabled in development mode');
    return;
  }


  Sentry.init({
    dsn: SENTRY_DSN,
    environment: getEnvironment(),

    // Habilita captura automática de erros
    enableAutoSessionTracking: true,

    // Intervalo de sessão (30 minutos)
    sessionTrackingIntervalMillis: 30000,

    // Habilita captura de breadcrumbs (ações do usuário antes do crash)
    enableNativeCrashHandling: true,

    // Performance monitoring (amostragem)
    tracesSampleRate: 0.2, // 20% das transações

    // Filtra eventos sensíveis
    beforeSend(event) {
      // Remove dados sensíveis se necessário
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },

    // Debug em desenvolvimento
    debug: __DEV__,
  });

  console.log('✅ Sentry initialized');
};

/**
 * Define o usuário atual para contexto de erros
 *
 * Só o id vai, e ele basta para o que o Sentry precisa responder: quantas
 * pessoas distintas um erro atinge e se é sempre a mesma. O e-mail ia junto de
 * cada relatório de falha até 16/09/2026, sem acrescentar nada ao diagnóstico —
 * era endereço de e-mail guardado por terceiro sem motivo.
 */
export const setSentryUser = (user: { id: string; name?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Adiciona contexto extra aos erros
 */
export const setSentryContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

/**
 * Captura erro manualmente
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('extra', context);
  }
  Sentry.captureException(error);
};

/**
 * Captura mensagem/evento
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Adiciona breadcrumb (trilha de ações)
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// Re-exporta o wrap para usar no App.tsx
export const SentryWrap = Sentry.wrap;

export default Sentry;
