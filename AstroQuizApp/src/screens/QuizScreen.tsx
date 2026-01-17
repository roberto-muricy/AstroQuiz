/**
 * QuizScreen
 * Tela de gameplay do quiz
 */

import { Button, QuestionCard } from '@/components';
import quizService from '@/services/quizService';
import { CurrentQuestion, RootStackParamList } from '@/types';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { sessionId } = route.params as { sessionId: string; phaseNumber: number };
  const { t } = useTranslation();

  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const submitTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Resetar pontuação ao iniciar nova sessão
    setCurrentScore(0);
    setCurrentStreak(0);
    loadQuestion();
    
    // Limpar timers ao desmontar
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!showResult && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !showResult) {
      handleTimeout();
    }
  }, [timeRemaining, showResult]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const question = await quizService.getCurrentQuestion(sessionId);
      setCurrentQuestion(question);
      setTimeRemaining(Math.floor(question.timePerQuestion / 1000));
      setSelectedOption(null);
      setShowResult(false);
      setAnswerResult(null);
      setAutoSubmitCountdown(null);
    } catch (error) {
      console.error('Erro ao carregar pergunta:', error);
      Alert.alert(t('common.error'), t('errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handler de seleção com auto-submit após 0.7s
  const handleAnswerSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (showResult) return;

    // Limpar timers anteriores
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Haptic feedback leve
    Vibration.vibrate(30);

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
    if (!currentQuestion || showResult) return;
    
    try {
      await quizService.submitAnswer(
        sessionId,
        selectedOption || 'A',
        currentQuestion.timePerQuestion,
        currentQuestion.question.id
      );
      Alert.alert(t('quiz.timeUp'), t('quiz.timeUpMessage'));
      await loadNextQuestion();
    } catch (error) {
      console.error('Erro ao processar timeout:', error);
    }
  };

  const handleSubmitAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;

    // Limpar timers
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setAutoSubmitCountdown(null);
    setShowResult(true);
    
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
      setAnswerResult(result);

      // Atualizar pontuação e streak localmente
      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);

      // Haptic feedback diferenciado
      if (result.answerRecord.isCorrect) {
        Vibration.vibrate(100); // Vibração longa para acerto
      } else {
        Vibration.vibrate([0, 100, 50, 100]); // Padrão de erro
      }
      
      // Mostrar resultado por 3 segundos
      setTimeout(async () => {
        setShowResult(false);
        setAnswerResult(null);
        setSelectedOption(null);
        
        if (result.sessionStatus.isPhaseComplete) {
          navigation.navigate('QuizResult', { sessionId });
        } else {
          await loadNextQuestion();
        }
      }, 3000);
    } catch (error) {
      console.error('Erro ao submeter resposta:', error);
      Alert.alert(t('common.error'), t('errors.tryAgainLater'));
      setShowResult(false);
      setSelectedOption(null);
    }
  };

  const loadNextQuestion = async () => {
    await loadQuestion();
  };

  const handleExit = () => {
    Alert.alert(
      t('quiz.exitTitle'),
      t('quiz.exitMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.logout'),
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
            {t('quiz.questionCounter', { current: currentQuestion.questionIndex, total: currentQuestion.totalQuestions })}
          </Text>
        </View>
        <View style={styles.timer}>
          <Text style={[styles.timerText, timeRemaining < 10 && styles.timerDanger]}>
            ⏱️ {timeRemaining}s
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{currentScore} {t('quiz.pointsAbbr')}</Text>
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
          disabled={showResult}
        />

        {/* Auto-submit countdown indicator */}
        {selectedOption && !showResult && autoSubmitCountdown !== null && (
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
              {t('quiz.autoConfirming')}
            </Text>
          </View>
        )}

        {/* Resultado e Pontos */}
        {showResult && answerResult && (
          <View style={styles.resultContainer}>
            {answerResult.answerRecord.isCorrect ? (
              <View style={styles.successBanner}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>{t('quiz.correctTitle')}</Text>
                <Text style={styles.pointsEarned}>
                  +{answerResult.scoreResult.totalPoints} {t('quiz.pointsEarned')}
                </Text>
              </View>
            ) : (
              <View style={styles.errorBanner}>
                <Text style={styles.errorEmoji}>😔</Text>
                <Text style={styles.errorTitle}>{t('quiz.incorrectTitle')}</Text>
                <Text style={styles.correctAnswerText}>
                  {t('quiz.correctAnswerLabel', { option: answerResult.answerRecord.correctOption })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
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
});


