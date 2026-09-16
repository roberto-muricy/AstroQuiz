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
import { avancarSequencia, SequenciaDiaria } from './sequenciaDiaria';

const PROGRESS_KEY = '@quiz_progress_v2';

export interface GameProgress {
  unlockedPhases: number;
  completedPhases: number[];
  stats: GameStats;
  answeredQuestionIds: number[];
  /**
   * Dias seguidos em que o jogador terminou uma fase.
   *
   * Opcional porque o progresso salvo por versões anteriores não tem o campo;
   * `getProgress` espalha o que estiver salvo, e as funções de
   * `sequenciaDiaria` tratam a ausência como sequência vazia. Fica fora de
   * `stats` de propósito: `stats` é sincronizado com o Strapi.
   */
  sequenciaDiaria?: SequenciaDiaria;
  /**
   * Tempo somado das fases terminadas, em ms, para o tempo medio por pergunta.
   *
   * Fica aqui e nao em `stats` pelo mesmo motivo da sequencia diaria: o
   * saveProgress manda `stats` inteiro para PUT /user-profile/:uid/stats, e
   * aquela rota espalha o corpo direto no update do Strapi. Um campo que nao
   * existe em user_profiles quebraria a sincronizacao de quem esta logado.
   */
  totalTimeMs?: number;
  /**
   * Melhor pontuação que o SERVIDOR deu em cada fase, pelo número da fase.
   *
   * Existe para o app dizer ao convidado a posição que ele teria no ranking
   * antes de criar conta: somar a melhor de cada fase é a mesma regra que o
   * servidor usa.
   *
   * Fica fora de `stats` pelo mesmo motivo da sequência diária e do
   * `totalTimeMs`: `stats` inteiro vai para PUT /user-profile/:uid/stats, e um
   * campo que não existe em user_profiles quebraria a sincronização.
   */
  pontuacoesDoServidor?: Record<string, number>;
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
    progress.totalTimeMs = (progress.totalTimeMs || 0) + (params.totalTimeMs || 0);
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

  /**
   * Conta o dia de hoje na sequência de dias jogados.
   *
   * Chamado quando o jogador TERMINA uma fase, passando ou não. Chamar duas
   * vezes no mesmo dia não conta em dobro.
   */
  async registrarDiaJogado(agora: Date = new Date()): Promise<SequenciaDiaria> {
    const progress = await this.getProgress();
    progress.sequenciaDiaria = avancarSequencia(progress.sequenciaDiaria, agora);
    await this.saveProgress(progress);
    return progress.sequenciaDiaria;
  },

  /**
   * Guarda a pontuação que o SERVIDOR deu para a fase, mantendo só a melhor.
   *
   * Chamado ao TERMINAR a fase, passando ou não: no ranking, fase reprovada
   * também pontua. Como a sequência diária, precisa ser gravado antes do
   * `updateAfterPhase` — o bloco de conquistas salva uma cópia lida lá dentro e
   * sobrescreveria o que viesse depois.
   *
   * A soma disto é uma estimativa: o servidor ainda aplica a contagem
   * anti-salto, que aqui não dá para reproduzir. Para o convidado, que nem está
   * no ranking, basta.
   */
  async registrarPontuacaoDoServidor(fase: number, pontos: number): Promise<GameProgress> {
    const progress = await this.getProgress();
    if (!Number.isFinite(fase) || fase < 1) return progress;

    const chave = String(Math.floor(fase));
    const pontuacoes = progress.pontuacoesDoServidor || {};
    const anterior = pontuacoes[chave];
    const nova = Math.max(0, Math.floor(Number(pontos) || 0));
    if (anterior !== undefined && nova <= anterior) return progress;

    progress.pontuacoesDoServidor = { ...pontuacoes, [chave]: nova };
    await this.saveProgress(progress);
    return progress;
  },

  /** Soma das melhores pontuações por fase — a mesma regra do ranking. */
  async pontuacaoTotalDoServidor(): Promise<number> {
    const { pontuacoesDoServidor } = await this.getProgress();
    const pontuacoes: Record<string, number> = pontuacoesDoServidor || {};
    return Object.values(pontuacoes).reduce<number>(
      (soma, valor) => soma + (Number(valor) || 0),
      0,
    );
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

