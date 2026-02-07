/**
 * QuizScreen - Refatorada
 * Tela de gameplay do quiz
 *
 * Refatoração: Usa design-system para consistência com StatsScreen
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from '@/constants/design-system';
import { Flame, CheckCircle, XCircle } from 'lucide-react-native';

// Função para calcular a cor do timer baseada no tempo restante
const getTimerColor = (timeRemaining: number, totalTime: number): string => {
  const percentage = timeRemaining / totalTime;

  if (percentage > 0.6) {
    // Verde
    return '#22C55E';
  } else if (percentage > 0.4) {
    // Amarelo
    return '#EAB308';
  } else if (percentage > 0.2) {
    // Laranja
    return '#F97316';
  } else {
    // Vermelho
    return '#EF4444';
  }
};

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
    setCurrentScore(0);
    setCurrentStreak(0);
    loadQuestion();

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

  const handleAnswerSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (showResult) return;

    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    Vibration.vibrate(30);

    setSelectedOption(option);
    setAutoSubmitCountdown(null);

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

      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);

      if (result.answerRecord.isCorrect) {
        Vibration.vibrate(100);
      } else {
        Vibration.vibrate([0, 100, 50, 100]);
      }

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

  const totalTime = currentQuestion?.timePerQuestion ? Math.floor(currentQuestion.timePerQuestion / 1000) : 30;
  const timerColor = getTimerColor(timeRemaining, totalTime);
  const timerWidth = (timeRemaining / totalTime) * 100;

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com botão X, contador e pontos */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleExit}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            {t('quiz.questionCounter', { current: currentQuestion.questionIndex, total: currentQuestion.totalQuestions })}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{currentScore} {t('quiz.pointsAbbr')}</Text>
          {currentStreak > 0 && (
            <View style={styles.streakContainer}>
              <Flame size={16} color={COLORS.primary} fill={COLORS.primary} />
              <Text style={styles.streakText}>{currentStreak}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Barra de tempo horizontal */}
      <View style={styles.timerBarContainer}>
        <View
          style={[
            styles.timerBar,
            {
              width: `${timerWidth}%`,
              backgroundColor: timerColor,
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
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
                <View style={styles.resultIconContainer}>
                  <CheckCircle size={48} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>{t('quiz.correctTitle')}</Text>
                <Text style={styles.pointsEarned}>
                  +{answerResult.scoreResult.totalPoints} {t('quiz.pointsEarned')}
                </Text>
              </View>
            ) : (
              <View style={styles.errorBanner}>
                <View style={styles.resultIconContainer}>
                  <XCircle size={48} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>{t('quiz.incorrectTitle')}</Text>
                <Text style={styles.correctAnswerText}>
                  {t('quiz.correctAnswerLabel', { option: answerResult.answerRecord.correctOption })}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backButtonText: {
    fontSize: 18,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
  questionCounter: {
    flex: 1,
    alignItems: 'center',
  },
  questionCounterText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  scoreText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.success,
    fontFamily: 'Poppins-Bold',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },
  timerBarContainer: {
    height: 6,
    backgroundColor: COLORS.backgroundElevated,
    marginHorizontal: SIZES.screenPadding,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
  },
  autoSubmitIndicator: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  autoSubmitBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  autoSubmitProgress: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  autoSubmitText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  resultContainer: {
    marginTop: SPACING.lg,
  },
  successBanner: {
    backgroundColor: 'rgba(15, 181, 126, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    alignItems: 'center',
  },
  resultIconContainer: {
    marginBottom: SPACING.sm,
  },
  successTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  pointsEarned: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    alignItems: 'center',
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: '#EF4444',
    marginBottom: SPACING.sm,
  },
  correctAnswerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
});
