/**
 * Types para o AstroQuiz App
 * Baseados na API do Strapi
 */

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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  perfectPhases: number;
  avatar?: string;
}

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
  Main: undefined;
  QuizGame: {
    phaseNumber: number;
    sessionId?: string;
  };
  QuizResult: {
    sessionId: string;
  };
  LevelDetail: {
    levelNumber: number;
  };
};

export type TabParamList = {
  Home: undefined;
  Quiz: undefined;
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


