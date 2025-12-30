/**
 * QuizScreen
 * Tela de gameplay do quiz
 */

import { Button, QuestionCard } from '@/components';
import quizService from '@/services/quizService';
import soundService from '@/services/soundService';
import { CurrentQuestion, RootStackParamList } from '@/types';
import { useNavigation, useRoute, NavigationProp, RouteProp, useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const QuizScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuizGame'>>();
  const isFocused = useIsFocused();
  const { sessionId } = route.params as { sessionId: string; phaseNumber: number };

  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [initialCountdownDone, setInitialCountdownDone] = useState(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const submitTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const startCountdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const resultDelayTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isScreenActiveRef = React.useRef(true);
  const isFocusedRef = React.useRef(true);
  const RESULT_DISPLAY_MS = 4000; // 3s -> 4s (mais tempo para ler explicação)

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    isScreenActiveRef.current = true;
    // Resetar pontuação ao iniciar nova sessão
    setCurrentScore(0);
    setCurrentStreak(0);
    setQuestionsAnswered(0);
    setInitialCountdownDone(false);
    setStartCountdown(null);
    loadQuestion();
    
    // Limpar timers ao desmontar
    return () => {
      isScreenActiveRef.current = false;
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (startCountdownIntervalRef.current) clearInterval(startCountdownIntervalRef.current);
      if (resultDelayTimerRef.current) clearTimeout(resultDelayTimerRef.current);
    };
  }, [sessionId]);

  // Countdown inicial (3..2..1) antes de iniciar o quiz (somente na 1ª pergunta)
  useEffect(() => {
    if (!currentQuestion) return;
    if (loading) return;
    if (initialCountdownDone) return;
    if (questionsAnswered !== 0) return;

    // Evitar múltiplos intervals
    if (startCountdownIntervalRef.current) {
      clearInterval(startCountdownIntervalRef.current);
      startCountdownIntervalRef.current = null;
    }

    let value = 3;
    setStartCountdown(value);
    startCountdownIntervalRef.current = setInterval(() => {
      value -= 1;
      if (value <= 0) {
        if (startCountdownIntervalRef.current) {
          clearInterval(startCountdownIntervalRef.current);
          startCountdownIntervalRef.current = null;
        }
        setStartCountdown(null);
        setInitialCountdownDone(true);
      } else {
        setStartCountdown(value);
      }
    }, 1000);

    return () => {
      if (startCountdownIntervalRef.current) {
        clearInterval(startCountdownIntervalRef.current);
        startCountdownIntervalRef.current = null;
      }
    };
  }, [currentQuestion, loading, initialCountdownDone, questionsAnswered]);

  useEffect(() => {
    // Não rodar timer se já mostrou resultado ou está carregando
    if (!isFocusedRef.current) return;
    if (!showResult && !loading && !isSubmittingAnswer && initialCountdownDone && timeRemaining > 0) {
      // Som de aviso nos últimos 10 segundos
      if (timeRemaining === 10) {
        soundService.playWarning();
      }
      
      const timer = setTimeout(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !showResult && !loading && !isSubmittingAnswer && initialCountdownDone) {
      handleTimeout();
    }
  }, [timeRemaining, showResult, loading, isSubmittingAnswer, initialCountdownDone]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setIsSubmittingAnswer(false);
      
      // Limpar qualquer timer ativo antes de carregar nova pergunta
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (resultDelayTimerRef.current) clearTimeout(resultDelayTimerRef.current);
      
      const question = await quizService.getCurrentQuestion(sessionId);
      setCurrentQuestion(question);
      setTimeRemaining(Math.floor(question.timePerQuestion / 1000));
      setSelectedOption(null);
      setShowResult(false);
      setAnswerResult(null);
      setAutoSubmitCountdown(null);
    } catch (error) {
      console.error('Erro ao carregar pergunta:', error);
      Alert.alert('Erro', 'Não foi possível carregar a pergunta');
    } finally {
      setLoading(false);
    }
  };

  // Handler de seleção com auto-submit após 0.7s
  const handleAnswerSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (!isFocusedRef.current) return;
    if (showResult || isSubmittingAnswer || !initialCountdownDone) return;

    // Limpar timers anteriores
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Som de seleção
    soundService.playSelect();

    // Atualizar seleção
    setSelectedOption(option);
    setAutoSubmitCountdown(null);

    // Iniciar countdown visual (opcional)
    let countdown = 700;
    const startTime = Date.now();
    
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 700 - elapsed);
      setAutoSubmitCountdown(remaining);
      
      if (remaining === 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 50);

    // Timer de auto-submit
    submitTimerRef.current = setTimeout(() => {
      handleSubmitAnswer(option);
    }, 700);
  };

  const handleTimeout = async () => {
    if (!isFocusedRef.current) return;
    if (!currentQuestion || showResult || loading || isSubmittingAnswer) return;
    
    try {
      setIsSubmittingAnswer(true);

      const result = await quizService.submitAnswer(
        sessionId,
        selectedOption || 'A',
        currentQuestion.timePerQuestion,
        currentQuestion.question.id,
        true // isTimeout
      );

      setAnswerResult(result);
      setShowResult(true);
      setIsSubmittingAnswer(false);

      // Atualizar pontuação e streak localmente
      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);

      const newQuestionsAnswered = questionsAnswered + 1;
      setQuestionsAnswered(newQuestionsAnswered);

      soundService.playIncorrect();

      if (resultDelayTimerRef.current) clearTimeout(resultDelayTimerRef.current);
      resultDelayTimerRef.current = setTimeout(async () => {
        if (!isScreenActiveRef.current || !isFocusedRef.current) return;
        setShowResult(false);
        setAnswerResult(null);
        setSelectedOption(null);

        if (newQuestionsAnswered >= 10 || result.sessionStatus.isPhaseComplete) {
          navigation.navigate('QuizResult', { sessionId });
        } else {
          await loadNextQuestion();
        }
      }, RESULT_DISPLAY_MS);
    } catch (error) {
      console.error('Erro ao processar timeout:', error);
      setIsSubmittingAnswer(false);
    }
  };

  const handleSubmitAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;

    // Limpar timers
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setAutoSubmitCountdown(null);
    setIsSubmittingAnswer(true);
    
    try {
      const timeUsed = currentQuestion.timePerQuestion - (timeRemaining * 1000);
      const questionId = currentQuestion.question?.id;
      
      console.log('🔍 Debug - Question ID:', questionId);
      console.log('🔍 Debug - Current Question:', currentQuestion);
      
      const result = await quizService.submitAnswer(
        sessionId, 
        option, 
        timeUsed,
        questionId
      );
      
      console.log('📊 Resultado da resposta:', result);
      console.log(`💰 Pontos desta pergunta: ${result.scoreResult.totalPoints} (Base: ${result.scoreResult.basePoints}, Speed: ${result.scoreResult.speedBonus}x${result.scoreResult.speedMultiplier})`);
      console.log(`🔥 Streak atual: ${result.sessionStatus.streakCount}`);
      
      setAnswerResult(result);
      setShowResult(true);
      setIsSubmittingAnswer(false);

      // Atualizar pontuação e streak localmente
      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);
      
      // Incrementar contador de perguntas respondidas
      const newQuestionsAnswered = questionsAnswered + 1;
      setQuestionsAnswered(newQuestionsAnswered);

      // Som e feedback baseado no resultado
      if (result.answerRecord.isCorrect) {
        soundService.playCorrect();
        
        // Som especial para streak
        if (result.sessionStatus.streakCount >= 3) {
          soundService.playStreak(result.sessionStatus.streakCount);
        }
      } else {
        soundService.playIncorrect();
      }
      
      // Mostrar resultado por 3 segundos
      if (resultDelayTimerRef.current) clearTimeout(resultDelayTimerRef.current);
      resultDelayTimerRef.current = setTimeout(async () => {
        if (!isScreenActiveRef.current || !isFocusedRef.current) return;
        setShowResult(false);
        setAnswerResult(null);
        setSelectedOption(null);
        
        // Verificar se completou todas as 10 perguntas
        if (newQuestionsAnswered >= 10 || result.sessionStatus.isPhaseComplete) {
          console.log('🎉 Fase completada! Indo para resultados...');
          
          // Parar todos os timers antes de navegar
          if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          
          // Navegar para resultados
          navigation.navigate('QuizResult', { sessionId });
        } else {
          await loadNextQuestion();
        }
      }, RESULT_DISPLAY_MS);
    } catch (error) {
      console.error('Erro ao submeter resposta:', error);
      Alert.alert('Erro', 'Não foi possível enviar a resposta');
      setShowResult(false);
      setSelectedOption(null);
      setIsSubmittingAnswer(false);
    }
  };

  const loadNextQuestion = async () => {
    await loadQuestion();
  };

  const handleExit = () => {
    Alert.alert(
      'Sair do Quiz',
      'Tem certeza que deseja sair? Seu progresso será perdido.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  if (!currentQuestion) {
    return (
      <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
      {/* Botão de Voltar */}
      <TouchableOpacity style={styles.backButton} onPress={handleExit}>
        <Text style={styles.backButtonText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            Pergunta {questionsAnswered + 1}/10
          </Text>
        </View>
        <View style={styles.timer}>
          <Text style={[styles.timerText, timeRemaining < 10 && styles.timerDanger]}>
            ⏱️ {timeRemaining}s
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{currentScore} pts</Text>
          {currentStreak > 0 && (
            <Text style={styles.streakText}>🔥 {currentStreak}</Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <QuestionCard
          question={currentQuestion.question}
          selectedOption={selectedOption || undefined}
          correctOption={showResult && answerResult ? answerResult.answerRecord.correctOption : undefined}
          showResult={showResult}
          onSelectOption={handleAnswerSelect}
          disabled={showResult || isSubmittingAnswer || !initialCountdownDone}
        />

        {/* Auto-submit countdown indicator */}
        {initialCountdownDone && selectedOption && !showResult && autoSubmitCountdown !== null && (
          <View style={styles.autoSubmitIndicator}>
            <View style={styles.autoSubmitBar}>
              <View 
                style={[
                  styles.autoSubmitProgress,
                  { width: `${(autoSubmitCountdown / 700) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.autoSubmitText}>
              Auto-confirmando...
            </Text>
          </View>
        )}

        {/* Resultado e Pontos */}
        {showResult && answerResult && (
          <View style={styles.resultContainer}>
            {answerResult.answerRecord.isCorrect ? (
              <View style={styles.successBanner}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>Resposta Correta!</Text>
                <Text style={styles.pointsEarned}>+{answerResult.scoreResult.totalPoints} pontos</Text>
              </View>
            ) : answerResult.answerRecord.isTimeout ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorEmoji}>⏰</Text>
                <Text style={styles.errorTitle}>Tempo esgotado</Text>
                <Text style={styles.correctAnswerText}>
                  Resposta correta: {answerResult.answerRecord.correctOption}
                </Text>
              </View>
            ) : (
              <View style={styles.errorBanner}>
                <Text style={styles.errorEmoji}>😔</Text>
                <Text style={styles.errorTitle}>Resposta Incorreta</Text>
                <Text style={styles.correctAnswerText}>
                  Resposta correta: {answerResult.answerRecord.correctOption}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Countdown overlay */}
      {!initialCountdownDone && startCountdown !== null && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <View style={styles.countdownCard}>
            <Text style={styles.countdownTitle}>Prepare-se</Text>
            <Text style={styles.countdownNumber}>{startCountdown}</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  questionCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  questionCounterText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  timer: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  timerDanger: {
    color: '#DE2F24',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0FB57E',
    fontFamily: 'Poppins-Bold',
  },
  streakText: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  submitButton: {
    marginTop: 20,
  },
  autoSubmitIndicator: {
    marginTop: 16,
    alignItems: 'center',
  },
  autoSubmitBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  autoSubmitProgress: {
    height: '100%',
    backgroundColor: '#FFA726',
  },
  autoSubmitText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  resultContainer: {
    marginTop: 20,
  },
  successBanner: {
    backgroundColor: 'rgba(15, 181, 126, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0FB57E',
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0FB57E',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  pointsEarned: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    alignItems: 'center',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownCard: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  countdownTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-Medium',
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 64,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    lineHeight: 72,
  },
});


