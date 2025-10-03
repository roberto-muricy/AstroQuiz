/**
 * Quiz Service
 * Gerencia todas as operações relacionadas ao quiz
 */

import api from './api';
import {
  QuizSession,
  CurrentQuestion,
  AnswerResult,
  GameRules,
  ApiResponse,
} from '@/types';

class QuizService {
  /**
   * Iniciar nova sessão de quiz
   */
  async startQuiz(
    phaseNumber: number,
    locale: string = 'pt',
    userId?: string,
  ): Promise<QuizSession> {
    const response = await api.post<ApiResponse<QuizSession>>('/quiz/start', {
      phaseNumber,
      locale,
      userId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao iniciar quiz');
    }

    return response.data;
  }

  /**
   * Obter sessão atual
   */
  async getSession(sessionId: string): Promise<QuizSession> {
    const response = await api.get<ApiResponse<{ session: QuizSession }>>(
      `/quiz/session/${sessionId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Sessão não encontrada');
    }

    return response.data.session;
  }

  /**
   * Obter pergunta atual
   */
  async getCurrentQuestion(sessionId: string): Promise<CurrentQuestion> {
    const response = await api.get<ApiResponse<CurrentQuestion>>(
      `/quiz/question/${sessionId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar pergunta');
    }

    return response.data;
  }

  /**
   * Submeter resposta
   */
  async submitAnswer(
    sessionId: string,
    selectedOption: 'A' | 'B' | 'C' | 'D',
    timeUsed: number,
  ): Promise<AnswerResult> {
    const response = await api.post<ApiResponse<AnswerResult>>(
      '/quiz/answer',
      {
        sessionId,
        selectedOption,
        timeUsed,
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao submeter resposta');
    }

    return response.data;
  }

  /**
   * Pausar quiz
   */
  async pauseQuiz(sessionId: string): Promise<QuizSession> {
    const response = await api.post<ApiResponse<QuizSession>>('/quiz/pause', {
      sessionId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao pausar quiz');
    }

    return response.data;
  }

  /**
   * Retomar quiz
   */
  async resumeQuiz(sessionId: string): Promise<QuizSession> {
    const response = await api.post<ApiResponse<QuizSession>>('/quiz/resume', {
      sessionId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao retomar quiz');
    }

    return response.data;
  }

  /**
   * Finalizar quiz
   */
  async finishQuiz(
    sessionId: string,
    reason: 'completed' | 'abandoned' = 'completed',
  ): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/quiz/finish', {
      sessionId,
      reason,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao finalizar quiz');
    }

    return response.data;
  }

  /**
   * Obter regras do jogo
   */
  async getGameRules(): Promise<GameRules> {
    const response = await api.get<ApiResponse<GameRules>>('/quiz/rules');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar regras');
    }

    return response.data;
  }

  /**
   * Obter estatísticas do pool de perguntas
   */
  async getPoolStats(locale: string = 'pt'): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/quiz/pool-stats', {
      locale,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar estatísticas');
    }

    return response.data;
  }

  /**
   * Obter leaderboard
   */
  async getLeaderboard(
    category: string = 'total_score',
    period: string = 'all_time',
    limit: number = 10,
  ): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/quiz/leaderboard', {
      category,
      period,
      limit,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar leaderboard');
    }

    return response.data;
  }
}

export default new QuizService();


