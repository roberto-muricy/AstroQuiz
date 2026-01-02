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

const PROGRESS_KEY = '@quiz_progress_v2';

export interface GameProgress {
  unlockedPhases: number;
  completedPhases: number[];
  stats: GameStats;
}

const getDefaultProgress = (): GameProgress => ({
  unlockedPhases: 1,
  completedPhases: [],
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
        return JSON.parse(saved);
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
  }): Promise<GameProgress> {
    const progress = await this.getProgress();
    const { phaseNumber, correctAnswers, totalQuestions, maxStreak } = params;

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

    await this.saveProgress(progress);
    return progress;
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

