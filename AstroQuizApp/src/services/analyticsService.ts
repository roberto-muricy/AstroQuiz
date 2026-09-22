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

  // Ranking
  LEADERBOARD_VIEW: 'leaderboard_view',
  LEADERBOARD_FILTER_CHANGE: 'leaderboard_filter_change',
  LEADERBOARD_LOGIN_CTA: 'leaderboard_login_cta_click',
  LEADERBOARD_ENROLL: 'leaderboard_enroll',
  LEADERBOARD_NICKNAME_SET: 'leaderboard_nickname_set',
  LEADERBOARD_REPORT: 'leaderboard_report',
} as const;

class AnalyticsService {
  /**
   * Liga a coleta só em build de release.
   *
   * Todo build Debug fala com produção (`USE_PROD_IN_DEV` em api.ts) e, sem
   * isto, mandava analytics para a mesma propriedade dos jogadores: cada teste
   * no simulador virava um "jogador" da fase 1, inflando justamente as
   * dimensões usadas para decidir a curva de dificuldade.
   *
   * O SDK nativo persiste a escolha no aparelho, então da segunda abertura em
   * diante nem os eventos automáticos (first_open, session_start) saem de um
   * build de desenvolvimento. Release religa a coleta toda vez que abre.
   *
   * Cobre só `__DEV__`: TestFlight e o teste interno do Play são builds de
   * release e continuam coletando.
   */
  async configurarColeta() {
    try {
      await analytics().setAnalyticsCollectionEnabled(!__DEV__);
    } catch (error) {
      console.warn('Analytics setAnalyticsCollectionEnabled error:', error);
    }
  }

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
   * Até onde o jogador chegou.
   *
   * Vai como propriedade de usuário, e não como evento, porque a pergunta é
   * "onde os jogadores estão" e não "o que aconteceu". Como propriedade, dá
   * para segmentar QUALQUER relatório por fase alcançada. Como evento, a mesma
   * resposta exigiria juntar todos os quiz_complete de cada pessoa no BigQuery.
   *
   * São dois inteiros. Não identificam ninguém.
   */
  async registrarProgresso(params: { faseMaxima: number; fasesCompletas: number }) {
    await this.setUserProperties({
      fase_maxima: String(params.faseMaxima),
      fases_completas: String(params.fasesCompletas),
    });
  }

  /**
   * Se a pessoa está logada — sem dizer quem é.
   *
   * `setUserId` não resolve isto: o Firebase não oferece "tem User ID" como
   * dimensão nos relatórios, então comparar convidado com logado só sairia
   * exportando para o BigQuery.
   *
   * `locale` viaja junto porque é a única propriedade não identificante que já
   * existia e que só era gravada no ramo autenticado — convidado nunca tinha.
   */
  async registrarAutenticacao(autenticado: boolean, locale: string) {
    await this.setUserProperties({
      autenticado: autenticado ? 'sim' : 'nao',
      locale,
    });
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
  async logLogin(method: 'google' | 'email' | 'apple') {
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
  /**
   * O ranking foi aberto.
   *
   * `origem` separa quem procurou o ranking na aba de quem foi levado pelo
   * cartão da Início ou pelo fim da fase — é o que diz se os dois pontos de
   * entrada novos valem a pena. `tem_posicao` distingue quem já pontuou de quem
   * abriu e não se encontrou.
   */
  async logLeaderboardView(params: {
    origem: 'aba' | 'inicio' | 'resultado';
    periodo: string;
    escopo: string;
    metrica: string;
    autenticado: boolean;
    temPosicao: boolean;
  }) {
    await this.logEvent(AnalyticsEvents.LEADERBOARD_VIEW, {
      origem: params.origem,
      periodo: params.periodo,
      escopo: params.escopo,
      metrica: params.metrica,
      autenticado: params.autenticado ? 'sim' : 'nao',
      tem_posicao: params.temPosicao ? 'sim' : 'nao',
    });
  }

  /** Qual recorte as pessoas realmente trocam — e quais ninguém toca. */
  async logLeaderboardFilterChange(controle: 'periodo' | 'escopo' | 'metrica', valor: string) {
    await this.logEvent(AnalyticsEvents.LEADERBOARD_FILTER_CHANGE, {
      controle,
      valor,
    });
  }

  /**
   * O convidado tocou no convite para entrar. É a metade do funil que importa:
   * o ranking existe para trazer conta, e sem isto só se sabe quem entrou, não
   * quem se interessou.
   */
  async logLeaderboardLoginCta(posicaoHipotetica: number | null) {
    await this.logEvent(AnalyticsEvents.LEADERBOARD_LOGIN_CTA, {
      posicao_hipotetica: posicaoHipotetica ?? 0,
    });
  }

  /** O que a pessoa fez na apresentação da primeira visita. */
  async logLeaderboardEnroll(acao: 'continuar' | 'sortear' | 'nao_aparecer') {
    await this.logEvent(AnalyticsEvents.LEADERBOARD_ENROLL, { acao });
  }

  async logLeaderboardNicknameSet(acao: 'definido' | 'limpo') {
    await this.logEvent(AnalyticsEvents.LEADERBOARD_NICKNAME_SET, { acao });
  }

  /** Quantas denúncias chegam, e por quê — a moderação é manual. */
  async logLeaderboardReport(motivo: string) {
    await this.logEvent(AnalyticsEvents.LEADERBOARD_REPORT, { motivo });
  }

  async logLanguageChanged(newLocale: string, previousLocale: string) {
    await this.logEvent(AnalyticsEvents.LANGUAGE_CHANGED, {
      new_locale: newLocale,
      previous_locale: previousLocale,
    });
  }
}

export default new AnalyticsService();
