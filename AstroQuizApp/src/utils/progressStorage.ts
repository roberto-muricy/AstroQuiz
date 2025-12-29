/**
 * Progress Storage
 * Gerencia o progresso do usuário no jogo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_KEY = '@quiz_progress';

interface GameProgress {
  unlockedPhases: number;
  completedPhases: number[];
}

export const ProgressStorage = {
  async getProgress(): Promise<GameProgress> {
    try {
      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return { unlockedPhases: 1, completedPhases: [] };
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
      return { unlockedPhases: 1, completedPhases: [] };
    }
  },

  async saveProgress(progress: GameProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  },

  async unlockNextPhase(currentPhase: number): Promise<void> {
    try {
      const progress = await this.getProgress();
      
      // Adicionar à lista de fases completadas
      if (!progress.completedPhases.includes(currentPhase)) {
        progress.completedPhases.push(currentPhase);
      }
      
      // Desbloquear próxima fase
      const nextPhase = currentPhase + 1;
      if (nextPhase > progress.unlockedPhases) {
        progress.unlockedPhases = nextPhase;
        console.log(`🎉 Fase ${nextPhase} desbloqueada!`);
      }
      
      await this.saveProgress(progress);
    } catch (error) {
      console.error('Erro ao desbloquear próxima fase:', error);
    }
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

