/**
 * Types para o AstroQuiz App
 * Baseados na API do Strapi
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ===== USER TYPES =====
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  avatarUrl?: string | null;
  level: number;
  xp: number;
  totalXP?: number;
  streak: number;
  locale?: string;
  createdAt: string;
  updatedAt?: string;
}

// ===== QUESTION TYPES =====
export interface Question {
  id: number;
  documentId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  // OBS: a API NÃO deve enviar o gabarito junto com a pergunta (anti-cheat).
  // O gabarito vem no resultado do endpoint POST /quiz/answer.
  correctOption?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  level: 1 | 2 | 3 | 4 | 5;
  topic: string;
  locale: 'en' | 'pt' | 'es' | 'fr';
  questionType?: 'text' | 'image';
  imageUrl?: string;
}

// ===== QUIZ SESSION TYPES =====
export interface QuizSession {
  sessionId: string;
  phaseNumber: number;
  locale: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  questions: Question[];
  answers: Answer[];
  score: number;
  streakCount: number;
  maxStreak: number;
  startTime: string;
  timePerQuestion: number;
}

export interface Answer {
  questionIndex: number;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  correctOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  isTimeout: boolean;
  timeUsed: number;
  timeRemaining: number;
  points: number;
  topic: string;
  level: number;
}

export interface CurrentQuestion {
  questionIndex: number;
  totalQuestions: number;
  question: Question;
  timeRemaining: number;
  timePerQuestion: number;
  currentScore: number;
  currentStreak: number;
}

// ===== SCORING TYPES =====
export interface ScoreResult {
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  penalty: number;
  totalPoints: number;
  speedMultiplier: number;
  breakdown: {
    [key: string]: string;
  };
}

export interface AnswerResult {
  answerRecord: Answer;
  scoreResult: ScoreResult;
  sessionStatus: {
    currentQuestionIndex: number;
    totalQuestions: number;
    score: number;
    streakCount: number;
    isPhaseComplete: boolean;
  };
}

// ===== GAME RULES TYPES =====
export interface PhaseConfig {
  name: string;
  range: [number, number];
  levels: number[];
  distribution: {
    [level: number]: number;
  };
  minimumScore: number;
}

export interface GameRules {
  general: {
    totalPhases: number;
    questionsPerPhase: number;
    timePerQuestion: number;
    supportedLocales: string[];
  };
  phases: {
    [key: string]: PhaseConfig;
  };
  scoring: any;
  achievements: any;
}

// ===== STATS TYPES =====
export interface PhaseProgress {
  phase: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  stars: number;
  completed: boolean;
  bestTime: number;
  score?: number;
}

export interface GameStats {
  totalXP: number;
  phasesCompleted: number;
  perfectPhases: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  maxStreak: number;
  currentStreak: number;
  fastAnswers: number;
  phaseStats: Record<number, PhaseProgress>;
  achievements: string[];
}

// Histórico local de perguntas já usadas (para evitar repetição).
export interface GameProgressAnswered {
  answeredQuestionIds: number[];
}

export interface UserStats {
  totalPhases: number;
  phasesCompleted: number;
  totalQuestions: number;
  totalCorrect: number;
  totalPoints: number;
  overallAccuracy: number;
  averagePhaseScore: number;
  perfectPhases: number;
  currentLevel: number;
  achievements: string[];
}

// LeaderboardEntry saiu daqui: as entradas do ranking sao tipadas em
// services/leaderboardService.ts, junto das chamadas que as trazem. A antiga
// nao correspondia ao que o servidor devolve e ninguem a usava.

// ===== DAILY CHALLENGE TYPES =====
export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  completed: boolean;
  progress: number;
  total: number;
}

// ===== NAVIGATION TYPES =====
export type RootStackParamList = {
  Login: undefined;
  /**
   * As abas. Recebe parametros para quem esta FORA delas poder abrir uma aba
   * especifica — a tela de resultado manda para o ranking assim.
   */
  Main: NavigatorScreenParams<TabParamList> | undefined;
  QuizGame: {
    phaseNumber: number;
    sessionId?: string;
  };
  QuizResult: {
    sessionId: string;
    usedQuestionIds?: number[];
  };
  LevelDetail: {
    levelNumber: number;
  };
  ImageCredits: undefined;
  Upgrade: undefined;
};

export type TabParamList = {
  Home: undefined;
  Quiz: undefined;
  Leaderboard: undefined;
  Stats: undefined;
  Profile: undefined;
};

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}


