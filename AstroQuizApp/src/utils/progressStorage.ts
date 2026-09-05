/**
 * Progress Storage
 * Gerencia o progresso do usuário no jogo (fases, XP, estrelas)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameStats,
  PhaseProgress,
} from '@/types';
import {
  calculateStarRating,
  getUnlockRequirement,
  isPhaseUnlocked,
  estimatePhaseXP,
} from './progressionSystem';
import authService from '@/services/authService';
import strapiSyncService from '@/services/strapiSyncService';

const PROGRESS_KEY = '@quiz_progress_v2';

export interface GameProgress {
  unlockedPhases: number;
  completedPhases: number[];
  stats: GameStats;
  answeredQuestionIds: number[];
}

/**
 * Junta as perguntas recém-vistas às já registradas, respeitando o teto.
 *
 * O teto é 300, e não 2000. Esta lista viaja no corpo de TODA abertura de fase:
 * com 2000 IDs são ~10 KB por requisição, e foi exatamente isso que derrubava o
 * /quiz/start no Android — o envio lento fazia o fluxo HTTP/2 ser resetado antes
 * de terminar. Com a lista vazia, uma fase inteira rodou sem um único erro.
 *
 * 300 cobre 30 fases sem repetição, de sobra para o efeito pretendido. O
 * servidor trata a lista como preferência, então estourar o teto não deixa
 * ninguém sem perguntas — só devolve as mais antigas ao sorteio.
 */
const LIMITE_VISTAS = 300;

const mesclarVistas = (atuais: number[] = [], novas: number[] = []): number[] => {
  const merged = new Set(atuais || []);
  novas.filter(Boolean).forEach((id) => merged.add(id));
  return Array.from(merged).slice(-LIMITE_VISTAS);
};

const getDefaultProgress = (): GameProgress => ({
  unlockedPhases: 1,
  completedPhases: [],
  answeredQuestionIds: [],
  stats: {
    totalXP: 0,
    phasesCompleted: 0,
    perfectPhases: 0,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    maxStreak: 0,
    currentStreak: 0,
    fastAnswers: 0,
    phaseStats: {},
    achievements: [],
  },
});

export const ProgressStorage = {
  async getProgress(): Promise<GameProgress> {
    try {
      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...getDefaultProgress(),
          ...parsed,
          answeredQuestionIds: parsed.answeredQuestionIds || [],
          stats: {
            ...getDefaultProgress().stats,
            ...parsed.stats,
          },
        };
      }
      return getDefaultProgress();
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
      return getDefaultProgress();
    }
  },

  async saveProgress(progress: GameProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      
      // Sync with Strapi if user is logged in
      const fbUser = authService.getCurrentUser();
      if (fbUser) {
        strapiSyncService
          .updateUserStats(fbUser.uid, progress.stats)
          .then(() => console.log('✅ Stats synced to Strapi'))
          .catch((err) => console.warn('⚠️ Failed to sync stats:', err));
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  },

  /**
   * Atualiza progresso após finalizar uma fase.
   */
  async updateAfterPhase(params: {
    phaseNumber: number;
    correctAnswers: number;
    totalQuestions: number;
    maxStreak: number;
    totalTimeMs?: number;
    score?: number;
    questionIds?: number[];
  }): Promise<GameProgress> {
    const progress = await this.getProgress();
    const { phaseNumber, correctAnswers, totalQuestions, maxStreak, questionIds } = params;

    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const stars = calculateStarRating(correctAnswers, totalQuestions);
    const gainedXP = estimatePhaseXP(phaseNumber, correctAnswers);

    const phaseStats: PhaseProgress = {
      phase: phaseNumber,
      correctAnswers,
      totalQuestions,
      accuracy,
      stars,
      completed: accuracy >= 60,
      bestTime: params.totalTimeMs || 0,
      score: params.score ?? 0,
    };

    // salvar fase
    progress.stats.phaseStats[phaseNumber] = phaseStats;
    progress.stats.totalQuestionsAnswered += totalQuestions;
    progress.stats.totalCorrectAnswers += correctAnswers;
    progress.stats.maxStreak = Math.max(progress.stats.maxStreak, maxStreak);
    progress.stats.totalXP += gainedXP;
    if (phaseStats.completed) {
      if (!progress.completedPhases.includes(phaseNumber)) {
        progress.completedPhases.push(phaseNumber);
      }
      progress.stats.phasesCompleted = progress.completedPhases.length;
      if (accuracy === 100) {
        progress.stats.perfectPhases += 1;
      }
    }

    // desbloquear próxima se atender requisito
    const requirement = getUnlockRequirement(phaseNumber + 1);
    const canUnlock = phaseStats.completed && isPhaseUnlocked(phaseNumber + 1, { accuracy, correctAnswers });
    if (canUnlock && phaseNumber + 1 > progress.unlockedPhases) {
      progress.unlockedPhases = phaseNumber + 1;
      console.log(`🎉 Fase ${phaseNumber + 1} desbloqueada! (req ${requirement.requiredAccuracy}%)`);
    }

    if (Array.isArray(questionIds) && questionIds.length > 0) {
      progress.answeredQuestionIds = mesclarVistas(progress.answeredQuestionIds, questionIds);
    }

    await this.saveProgress(progress);
    return progress;
  },

  /**
   * Registra as perguntas que o jogador viu, sem mexer em XP nem desbloqueio.
   *
   * Existe porque `updateAfterPhase` só era chamado quando a fase era APROVADA
   * (`if (data.passed)` na QuizResultScreen). Quem reprovava na fase 1 tinha as
   * 10 perguntas esquecidas — e as reencontrava na fase 2. Era metade da
   * repetição relatada; a outra metade estava no servidor, que ignorava a lista.
   *
   * Reprovar não pode dar XP, mas as perguntas foram vistas de qualquer jeito.
   */
  async registrarPerguntasVistas(questionIds: number[]): Promise<void> {
    if (!Array.isArray(questionIds) || questionIds.length === 0) return;
    const progress = await this.getProgress();
    progress.answeredQuestionIds = mesclarVistas(progress.answeredQuestionIds, questionIds);
    await this.saveProgress(progress);
  },

  async resetProgress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROGRESS_KEY);
      console.log('✅ Progresso resetado');
    } catch (error) {
      console.error('Erro ao resetar progresso:', error);
    }
  },
};

