/**
 * Analytics Service - Firebase Analytics
 *
 * Rastreamento de eventos e comportamento do usuário
 */

import analytics from '@react-native-firebase/analytics';

/**
 * Eventos personalizados do AstroQuiz
 */
export const AnalyticsEvents = {
  // Quiz
  QUIZ_START: 'quiz_start',
  QUIZ_COMPLETE: 'quiz_complete',
  QUIZ_ABANDON: 'quiz_abandon',
  QUESTION_ANSWERED: 'question_answered',

  // Progression
  PHASE_UNLOCKED: 'phase_unlocked',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',

  // User
  LOGIN: 'login',
  SIGNUP: 'sign_up',
  LOGOUT: 'logout',

  // Settings
  LANGUAGE_CHANGED: 'language_changed',
  SETTINGS_CHANGED: 'settings_changed',
} as const;

class AnalyticsService {
  /**
   * Define o ID do usuário para associar eventos
   */
  async setUserId(userId: string | null) {
    try {
      await analytics().setUserId(userId);
    } catch (error) {
      console.warn('Analytics setUserId error:', error);
    }
  }

  /**
   * Define propriedades do usuário
   */
  async setUserProperties(properties: Record<string, string | null>) {
    try {
      await analytics().setUserProperties(properties);
    } catch (error) {
      console.warn('Analytics setUserProperties error:', error);
    }
  }

  /**
   * Registra evento genérico
   */
  async logEvent(eventName: string, params?: Record<string, any>) {
    try {
      await analytics().logEvent(eventName, params);
      if (__DEV__) {
        console.log('📊 Analytics:', eventName, params);
      }
    } catch (error) {
      console.warn('Analytics logEvent error:', error);
    }
  }

  /**
   * Registra visualização de tela
   */
  async logScreenView(screenName: string, screenClass?: string) {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.warn('Analytics logScreenView error:', error);
    }
  }

  // ==================== Eventos Específicos ====================

  /**
   * Quiz iniciado
   */
  async logQuizStart(phaseNumber: number, locale: string) {
    await this.logEvent(AnalyticsEvents.QUIZ_START, {
      phase_number: phaseNumber,
      locale,
    });
  }

  /**
   * Quiz completado
   */
  async logQuizComplete(params: {
    phaseNumber: number;
    score: number;
    accuracy: number;
    timeSpent: number;
    correctAnswers: number;
    totalQuestions: number;
    passed: boolean;
  }) {
    await this.logEvent(AnalyticsEvents.QUIZ_COMPLETE, {
      phase_number: params.phaseNumber,
      score: params.score,
      accuracy: params.accuracy,
      time_spent_seconds: Math.round(params.timeSpent / 1000),
      correct_answers: params.correctAnswers,
      total_questions: params.totalQuestions,
      passed: params.passed ? 'yes' : 'no',
    });
  }

  /**
   * Quiz abandonado
   */
  async logQuizAbandon(phaseNumber: number, questionNumber: number) {
    await this.logEvent(AnalyticsEvents.QUIZ_ABANDON, {
      phase_number: phaseNumber,
      question_number: questionNumber,
    });
  }

  /**
   * Pergunta respondida
   */
  async logQuestionAnswered(params: {
    phaseNumber: number;
    questionNumber: number;
    correct: boolean;
    timeSpent: number;
    streak: number;
  }) {
    await this.logEvent(AnalyticsEvents.QUESTION_ANSWERED, {
      phase_number: params.phaseNumber,
      question_number: params.questionNumber,
      correct: params.correct ? 'yes' : 'no',
      time_spent_ms: params.timeSpent,
      streak: params.streak,
    });
  }

  /**
   * Fase desbloqueada
   */
  async logPhaseUnlocked(phaseNumber: number) {
    await this.logEvent(AnalyticsEvents.PHASE_UNLOCKED, {
      phase_number: phaseNumber,
    });
  }

  /**
   * Level up
   */
  async logLevelUp(newLevel: number, totalXP: number) {
    await this.logEvent(AnalyticsEvents.LEVEL_UP, {
      new_level: newLevel,
      total_xp: totalXP,
    });
  }

  /**
   * Conquista desbloqueada
   */
  async logAchievementUnlocked(achievementId: string, achievementName: string) {
    await this.logEvent(AnalyticsEvents.ACHIEVEMENT_UNLOCKED, {
      achievement_id: achievementId,
      achievement_name: achievementName,
    });
  }

  /**
   * Login
   */
  async logLogin(method: 'google' | 'email') {
    await analytics().logLogin({ method });
  }

  /**
   * Signup
   */
  async logSignUp(method: 'google' | 'email') {
    await analytics().logSignUp({ method });
  }

  /**
   * Logout
   */
  async logLogout() {
    await this.logEvent(AnalyticsEvents.LOGOUT);
  }

  /**
   * Idioma alterado
   */
  async logLanguageChanged(newLocale: string, previousLocale: string) {
    await this.logEvent(AnalyticsEvents.LANGUAGE_CHANGED, {
      new_locale: newLocale,
      previous_locale: previousLocale,
    });
  }
}

export default new AnalyticsService();
