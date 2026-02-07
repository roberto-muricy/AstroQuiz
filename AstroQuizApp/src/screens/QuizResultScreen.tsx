/**
 * QuizResultScreen - Refatorada
 * Tela de resultados após completar uma fase do quiz
 *
 * Refatoração: Usa design-system para consistência
 */

import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
import { checkAchievements, getPlayerLevel, getXPToNextLevel, calculateStarRating, getUnlockRequirement, estimatePhaseXP } from '@/utils/progressionSystem';
import soundService from '@/services/soundService';
import { AchievementPopup } from '@/components';
import { useApp } from '@/contexts/AppContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import quizService from '@/services/quizService';
import { useTranslation } from 'react-i18next';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from '@/constants/design-system';
import {
  TrophyIcon,
  SparkleIcon,
  ThumbsUpIcon,
  StrengthIcon,
  StarsRating,
  CheckIcon,
  ErrorIcon,
  FireIcon,
  TimerIcon,
  AwardIcon,
  LockIcon,
  IconSizes,
  IconColors,
} from '@/components/Icons';

export const QuizResultScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuizResult'>>();
  const { sessionId, usedQuestionIds = [] } = route.params;
  const { locale } = useApp();
  const { t } = useTranslation();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phaseUnlocked, setPhaseUnlocked] = useState(false);
  const [startingNextPhase, setStartingNextPhase] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;
  const [levelUpInfo, setLevelUpInfo] = useState<{
    from: number;
    to: number;
    title: string;
    icon: string;
  } | null>(null);
  const [stars, setStars] = useState(0);
  const [unlockRequirement, setUnlockRequirement] = useState<{ requiredAccuracy: number; specialRequirement?: string } | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [levelTitle, setLevelTitle] = useState('');
  const [xpToNext, setXpToNext] = useState(0);

  useEffect(() => {
    loadResults();

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadResults = async () => {
    try {
      const finishResponse = await quizService.finishQuiz(sessionId);
      console.log('🏁 Quiz finalizado:', finishResponse);

      const data = finishResponse;
      setSessionData(data);

      const accuracy = data.accuracy ||
        (data.totalQuestions > 0 ? Math.round((data.correctAnswers / data.totalQuestions) * 100) : 0);
      const computedStars = calculateStarRating(data.correctAnswers || 0, data.totalQuestions || 10);
      setStars(computedStars);
      setUnlockRequirement(getUnlockRequirement((data.phaseNumber || 1) + 1));

      const isPerfect = accuracy === 100;

      if (data.passed && data.phaseNumber) {
        const prevProgress = await ProgressStorage.getProgress();
        const prevLevel = getPlayerLevel(prevProgress.stats.totalXP);

        const updated = await ProgressStorage.updateAfterPhase({
          phaseNumber: data.phaseNumber,
          correctAnswers: data.correctAnswers || 0,
          totalQuestions: data.totalQuestions || 10,
          maxStreak: data.maxStreak || 0,
          totalTimeMs: data.totalTime,
          score: data.finalScore || data.score,
          questionIds: usedQuestionIds,
        });

        const currentLevel = getPlayerLevel(updated.stats.totalXP);
        setTotalXP(updated.stats.totalXP);
        setLevelTitle(`${currentLevel.icon} ${currentLevel.title}`);
        setXpToNext(getXPToNextLevel(updated.stats.totalXP));
        setPhaseUnlocked(updated.unlockedPhases > data.phaseNumber);

        if (currentLevel.level > prevLevel.level) {
          triggerLevelUp(prevLevel.level, currentLevel);
        }

        const unlockedAchievementIds = updated.stats.achievements || [];
        const newlyUnlocked = checkAchievements(updated.stats, unlockedAchievementIds);

        if (newlyUnlocked.length > 0) {
          setNewAchievements(newlyUnlocked);
          const updatedStats = {
            ...updated.stats,
            achievements: [...unlockedAchievementIds, ...newlyUnlocked.map(a => a.id)],
          };
          await ProgressStorage.saveProgress({ ...updated, stats: updatedStats });

          setTimeout(() => {
            setCurrentAchievementIndex(0);
            setShowAchievementPopup(true);
          }, 1000);
        }

        setTimeout(() => soundService.playUnlock(), 500);
      }

      soundService.playPhaseComplete(isPerfect);

    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = async () => {
    try {
      if (startingNextPhase) return;
      setStartingNextPhase(true);
      if (sessionData?.phaseNumber) {
        const newSession = await quizService.startQuiz(sessionData.phaseNumber, locale);
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' },
            {
              name: 'QuizGame',
              params: { phaseNumber: sessionData.phaseNumber, sessionId: newSession.sessionId },
            },
          ],
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar novo quiz:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o quiz.');
    } finally {
      setStartingNextPhase(false);
    }
  };

  const handleNextPhase = async () => {
    try {
      if (startingNextPhase) return;
      setStartingNextPhase(true);
      const nextPhase = (sessionData?.phaseNumber || 1) + 1;
      const newSession = await quizService.startQuiz(nextPhase, locale);
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: 'QuizGame',
            params: { phaseNumber: nextPhase, sessionId: newSession.sessionId },
          },
        ],
      });
    } catch (error) {
      console.error('Erro ao iniciar próxima fase:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a próxima fase.');
    } finally {
      setStartingNextPhase(false);
    }
  };

  const handleBackToMenu = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const triggerLevelUp = (fromLevel: number, toLevel: { level: number; title: string; icon: string }) => {
    setLevelUpInfo({
      from: fromLevel,
      to: toLevel.level,
      title: toLevel.title,
      icon: toLevel.icon,
    });
    levelUpScale.setValue(0.4);
    levelUpOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(levelUpScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(levelUpOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLevelUp = () => {
    Animated.timing(levelUpOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setLevelUpInfo(null));
  };

  const handleAchievementClose = () => {
    setShowAchievementPopup(false);

    if (currentAchievementIndex < newAchievements.length - 1) {
      setTimeout(() => {
        setCurrentAchievementIndex(currentAchievementIndex + 1);
        setShowAchievementPopup(true);
      }, 500);
    }
  };

  if (loading || !sessionData) {
    return (
      <LinearGradient
        colors={COLORS.backgroundGradient}
        style={styles.container}
      >
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{t('result.calculatingResults')}</Text>
        </View>
      </LinearGradient>
    );
  }

  const accuracy = sessionData.accuracy ||
    (sessionData.totalQuestions > 0
      ? Math.round((sessionData.correctAnswers / sessionData.totalQuestions) * 100)
      : 0);

  const passed = sessionData.passed !== undefined ? sessionData.passed : accuracy >= 60;
  const isPerfect = accuracy === 100;
  const isGreat = accuracy >= 80;
  const isGood = accuracy >= 60;

  return (
    <LinearGradient
      colors={COLORS.backgroundGradient}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
        >
          {/* Header com Ícone de Performance */}
          <Animated.View style={[styles.header, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.performanceIcon}>
              {isPerfect ? <TrophyIcon size={64} color={IconColors.gold} /> :
               isGreat ? <SparkleIcon size={64} color={IconColors.gold} /> :
               isGood ? <ThumbsUpIcon size={64} color={IconColors.success} /> :
               <StrengthIcon size={64} color={IconColors.primary} />}
            </View>
            <Text style={styles.title}>
              {isPerfect ? t('result.perfect') : isGreat ? t('result.excellent') : isGood ? t('result.veryGood') : t('result.keepTrying')}
            </Text>
            <Text style={styles.subtitle}>
              {passed
                ? t('result.phaseCompleted', { phase: sessionData.phaseNumber })
                : t('result.phaseIncomplete', { phase: sessionData.phaseNumber })}
            </Text>
            <View style={styles.starRow}>
              <StarsRating stars={stars} size={IconSizes.lg} gap={8} />
            </View>
            {levelTitle ? (
              <View style={styles.levelRow}>
                <Text style={styles.levelText}>{levelTitle}</Text>
                <Text style={styles.levelSubText}>
                  {xpToNext > 0 ? t('result.xpToNext', { xp: xpToNext }) : t('result.maxLevel')}
                </Text>
              </View>
            ) : null}

            {/* Badge de Passou/Não Passou */}
            {passed ? (
              <View style={styles.passedBadge}>
                <Text style={styles.passedText}>{t('result.approved')}</Text>
              </View>
            ) : (
              <View style={styles.failedBadge}>
                <Text style={styles.failedText}>{t('result.required')}</Text>
              </View>
            )}
          </Animated.View>

          {/* Card de Pontuação Principal */}
          <View style={styles.scoreCard}>
            <LinearGradient
              colors={['#5A5A9C', '#4A4A7C']}
              style={styles.scoreGradient}
            >
              <Text style={styles.scoreLabel}>{t('result.finalScore')}</Text>
              <Text style={styles.scoreValue}>{sessionData.finalScore || sessionData.score || 0}</Text>
              <Text style={styles.accuracyText}>{t('result.accuracy', { percent: accuracy })}</Text>
            </LinearGradient>
          </View>

          {/* Estatísticas Detalhadas */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <CheckIcon size={IconSizes.lg} color={IconColors.success} />
                <Text style={styles.statValue}>{sessionData.correctAnswers || 0}</Text>
                <Text style={styles.statLabel}>{t('result.correct_plural')}</Text>
              </View>
              <View style={styles.statItem}>
                <ErrorIcon size={IconSizes.lg} color={IconColors.error} />
                <Text style={styles.statValue}>{sessionData.incorrectAnswers || 0}</Text>
                <Text style={styles.statLabel}>{t('result.incorrect_plural')}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <FireIcon size={IconSizes.lg} color={IconColors.primary} />
                <Text style={styles.statValue}>{sessionData.maxStreak || 0}</Text>
                <Text style={styles.statLabel}>{t('result.maxStreak')}</Text>
              </View>
              <View style={styles.statItem}>
                <TimerIcon size={IconSizes.lg} color={IconColors.white} />
                <Text style={styles.statValue}>
                  {Math.round((sessionData.totalTime || 180000) / 1000)}s
                </Text>
                <Text style={styles.statLabel}>{t('result.totalTime')}</Text>
              </View>
            </View>
          </View>

          {/* Performance Breakdown */}
          {isPerfect && (
            <View style={styles.achievementCard}>
              <AwardIcon size={IconSizes.xl} color={IconColors.gold} />
              <Text style={styles.achievementTitle}>{t('result.perfectScore')}</Text>
              <Text style={styles.achievementText}>
                {t('result.allCorrect')}
                {'\n'}{t('result.perfectBonus')}
              </Text>
            </View>
          )}

          {sessionData.maxStreak >= 10 && (
            <View style={styles.achievementCard}>
              <FireIcon size={IconSizes.xl} color={IconColors.primary} />
              <Text style={styles.achievementTitle}>{t('result.streakMaster')}</Text>
              <Text style={styles.achievementText}>
                {t('result.consecutiveCorrect', { count: sessionData.maxStreak })}
              </Text>
            </View>
          )}

          {phaseUnlocked && passed && (
            <View style={[styles.achievementCard, styles.achievementSuccess]}>
              <SparkleIcon size={IconSizes.xl} color={IconColors.success} />
              <Text style={[styles.achievementTitle, styles.achievementTitleSuccess]}>
                {t('result.newPhaseUnlocked')}
              </Text>
              <Text style={styles.achievementText}>
                {t('result.phaseAvailable', { phase: sessionData.phaseNumber + 1 })}
              </Text>
            </View>
          )}
          {!phaseUnlocked && unlockRequirement && (
            <View style={[styles.achievementCard, styles.achievementWarning]}>
              <LockIcon size={IconSizes.xl} color={IconColors.muted} />
              <Text style={[styles.achievementTitle, styles.achievementTitleWarning]}>
                {t('result.nextPhaseRequirement')}
              </Text>
              <Text style={styles.achievementText}>
                {t('result.minAccuracy', { percent: unlockRequirement.requiredAccuracy })} {unlockRequirement.specialRequirement ? `• ${unlockRequirement.specialRequirement}` : ''}
              </Text>
            </View>
          )}

          {!passed && (
            <View style={[styles.achievementCard, styles.achievementWarning]}>
              <StrengthIcon size={IconSizes.xl} color={IconColors.primary} />
              <Text style={[styles.achievementTitle, styles.achievementTitleWarning]}>
                {t('result.keepPracticing')}
              </Text>
              <Text style={styles.achievementText}>
                {t('result.need60')}
                {'\n'}{t('result.tryAgainConquer')}
              </Text>
            </View>
          )}

          {/* Botões de Ação */}
          <View style={styles.actions}>
            {passed && phaseUnlocked && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextPhase}
                disabled={startingNextPhase}
              >
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{t('result.nextPhase')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {!passed && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePlayAgain}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{t('result.tryAgain')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePlayAgain}
              disabled={startingNextPhase}
            >
              <Text style={styles.secondaryButtonText}>{t('result.playAgain')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleBackToMenu}
            >
              <Text style={styles.tertiaryButtonText}>{t('result.backToMenu')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      {levelUpInfo && (
        <Animated.View style={[styles.levelUpOverlay, { opacity: levelUpOpacity }]}>
          <Animated.View style={[styles.levelUpCard, { transform: [{ scale: levelUpScale }] }]}>
            <View style={styles.levelUpIcon}>
              <SparkleIcon size={64} color={IconColors.gold} />
            </View>
            <Text style={styles.levelUpTitle}>{t('result.levelUp')}</Text>
            <Text style={styles.levelUpSubtitle}>
              {t('result.levelUpFrom', { from: levelUpInfo.from, to: levelUpInfo.to })}
            </Text>
            <Text style={styles.levelUpBadge}>{levelUpInfo.icon} {levelUpInfo.title}</Text>
            <TouchableOpacity style={styles.levelUpButton} onPress={closeLevelUp} activeOpacity={0.85}>
              <Text style={styles.levelUpButtonText}>{t('common.continue')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Achievement Popup */}
      {newAchievements.length > 0 && (
        <AchievementPopup
          visible={showAchievementPopup}
          achievement={newAchievements[currentAchievementIndex]}
          onClose={handleAchievementClose}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  scrollContent: {
    padding: SIZES.screenPadding,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  performanceIcon: {
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.xs + 2,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  levelRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  levelText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
  },
  levelSubText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  passedBadge: {
    backgroundColor: 'rgba(15, 181, 126, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  passedText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: 'bold',
    color: COLORS.success,
    fontFamily: 'Poppins-Bold',
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  failedText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: 'bold',
    color: '#EF4444',
    fontFamily: 'Poppins-Bold',
  },
  scoreCard: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scoreGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  scoreLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
    marginBottom: SPACING.sm,
  },
  accuracyText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.success,
  },
  statsContainer: {
    marginBottom: SPACING.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  achievementSuccess: {
    backgroundColor: 'rgba(15, 181, 126, 0.15)',
    borderLeftColor: COLORS.success,
  },
  achievementWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftColor: '#EF4444',
  },
  achievementTitleSuccess: {
    color: COLORS.success,
  },
  achievementTitleWarning: {
    color: '#EF4444',
  },
  achievementTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  achievementText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    textAlign: 'center',
  },
  actions: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  primaryButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonGradient: {
    paddingVertical: SPACING.lg - 2,
    alignItems: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  secondaryButton: {
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg - 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.backgroundHighlight,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },
  tertiaryButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    fontFamily: 'Poppins-Medium',
  },
  bottomSpace: {
    height: 40,
  },
  levelUpOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  levelUpCard: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SIZES.screenPadding,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  levelUpIcon: {
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  levelUpTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  levelUpSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  levelUpBadge: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  levelUpButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  levelUpButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.body,
    fontFamily: 'Poppins-Bold',
  },
});
