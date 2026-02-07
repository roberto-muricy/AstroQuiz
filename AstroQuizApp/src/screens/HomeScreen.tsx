/**
 * HomeScreen - Refatorada
 * Tela principal do app baseada no design do Figma
 *
 * Refatoração: Usa design-system para consistência
 * Visual: IDÊNTICO ao original
 */

import { Button, Card, LevelCard } from '@/components';
import { StatDisplay } from '@/components/common';
import { useApp } from '@/contexts/AppContext';
import { Images } from '@/assets';
import quizService from '@/services/quizService';
import { ProgressStorage } from '@/utils/progressStorage';
import { getPlayerLevel, getXPToNextLevel } from '@/utils/progressionSystem';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from '@/constants/design-system';
import { FireIcon, RocketIcon, IconSizes, IconColors } from '@/components/Icons';

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, locale } = useApp();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [levelTitle, setLevelTitle] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xpToNext, setXpToNext] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [unlockedPhase, setUnlockedPhase] = useState(1);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const progress = await ProgressStorage.getProgress();
      const stats = progress.stats;
      const xp = stats.totalXP || 0;
      setTotalXP(xp);
      setUnlockedPhase(progress.unlockedPhases || 1);
      setStreak(stats.maxStreak || 0);

      const level = getPlayerLevel(xp);
      const xpNext = getXPToNextLevel(xp);
      setCurrentLevel(level.level);
      setLevelTitle(`${level.icon} ${level.title}`);
      setXpToNext(xpNext);

      if (xpNext === 0) {
        setProgressPct(1);
      } else {
        const prevLevel = getPlayerLevel(Math.max(0, level.xpRequired - 1));
        const prevReq = prevLevel.xpRequired;
        const span = (level.xpRequired || 1) - prevReq;
        const progressInLevel = xp - prevReq;
        setProgressPct(Math.min(1, Math.max(0, span > 0 ? progressInLevel / span : 0)));
      }
    } catch (error) {
      console.error('Erro ao carregar progresso', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  };

  const handleStartQuiz = async (phaseNumber: number) => {
    try {
      console.log('🎮 Iniciando quiz - Fase:', phaseNumber, 'Locale:', locale);
      const progress = await ProgressStorage.getProgress();
      const excludeQuestions = progress.answeredQuestionIds || [];

      const session = await quizService.startQuiz(phaseNumber, locale, undefined, excludeQuestions);
      console.log('✅ Sessão criada:', session);

      navigation.navigate('QuizGame', {
        phaseNumber,
        sessionId: session.sessionId,
      });
    } catch (error) {
      console.error('❌ Erro ao iniciar quiz:', error);
      Alert.alert(t('common.error'), t('errors.quizStartError'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>
              {t('home.welcomeBack', { name: user?.name || t('home.astronaut') })}
            </Text>
            <View style={styles.streakBadge}>
              <FireIcon size={IconSizes.sm} color={IconColors.primary} />
              <Text style={styles.streakText}>{t('home.streakDays', { count: streak })}</Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <RocketIcon size={IconSizes.xl} color={IconColors.primary} />
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{currentLevel}</Text>
            </View>
          </View>
        </View>

        {/* Daily Challenge */}
        <TouchableOpacity style={styles.dailyChallenge}>
          <Card variant="daily-challenge">
            <View style={styles.dailyChallengeContent}>
              <View style={styles.dailyChallengeIcon}>
                <Image
                  source={Images.target}
                  style={styles.challengeImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.dailyChallengeInfo}>
                <Text style={styles.dailyChallengeTitle} numberOfLines={1}>
                  {t('home.dailyChallengeTitle')}
                </Text>
                <Text
                  style={styles.dailyChallengeSubtitle}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {t('home.dailyChallengeSubtitle')}
                </Text>
              </View>
              <View style={styles.dailyChallengeBadge}>
                <Text style={styles.dailyChallengeBadgeText}>{t('home.dailyChallengeReward')}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Main Level Card */}
        <Card style={styles.mainLevelCard}>
          <View style={styles.mainLevelHeader}>
            <View>
              <Text style={styles.mainLevelTitle}>{levelTitle || t('home.levelNumber', { level: currentLevel })}</Text>
              <Text style={styles.mainLevelSubtitle}>
                {xpToNext > 0 ? t('result.xpToNext', { xp: xpToNext }) : t('result.maxLevel')}
              </Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>{totalXP}xp</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]}>
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                >
                  <View style={styles.progressThumb} />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.stats}>
              <StatDisplay
                value={`${Math.round(progressPct * 100)}%`}
                label={t('home.inLevel')}
              />
              <StatDisplay
                value={`${streak}`}
                label={t('result.maxStreak')}
              />
              <StatDisplay
                value={xpToNext > 0 ? `${xpToNext}xp` : 'Max'}
                label={t('home.nextLevel')}
              />
            </View>
          </View>

          {/* CTA Button - Texto encurtado para evitar overflow */}
          <Button
            title={t('common.continue')}
            onPress={() => handleStartQuiz(unlockedPhase)}
            size="large"
            style={styles.continueButton}
          />
        </Card>

        {/* Weekly Ranking */}
        <TouchableOpacity>
          <Card>
            <View style={styles.weeklyRanking}>
              <View style={styles.rankingBadge}>
                <Text style={styles.rankingBadgeText}>#20</Text>
              </View>
              <View style={styles.rankingContent}>
                <Text style={styles.rankingTitle} numberOfLines={1}>
                  {t('home.weeklyRankingTitle')}
                </Text>
                <Text
                  style={styles.rankingSubtitle}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {t('home.weeklyRankingSubtitle')}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Progress Section */}
        <View style={styles.progressLevelsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.progressLevelsTitle')}</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.levelCardsRow}>
            <LevelCard
              levelNumber={unlockedPhase}
              levelName={t('home.phaseName', { phase: unlockedPhase })}
              subtitle={t('home.available')}
              progress={Math.round(progressPct * 100)}
              questionsCompleted={0}
              totalQuestions={10}
              xp={totalXP}
              stars={0}
              isActive
              onPress={() => handleStartQuiz(unlockedPhase)}
            />
            <LevelCard
              levelNumber={unlockedPhase + 1}
              levelName={t('home.phaseName', { phase: unlockedPhase + 1 })}
              subtitle={t('home.locked')}
              progress={0}
              questionsCompleted={0}
              totalQuestions={10}
              xp={0}
              stars={0}
              isLocked
            />
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.screenPadding,
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  streakBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: RADIUS.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Poppins-Medium',
  },

  // Avatar
  avatar: {
    width: SIZES.avatarLarge,
    height: SIZES.avatarLarge,
    borderRadius: SIZES.avatarLarge / 2,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: SIZES.levelBadgeSmall,
    height: SIZES.levelBadgeSmall,
    borderRadius: SIZES.levelBadgeSmall / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  levelBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },

  // Daily Challenge
  dailyChallenge: {
    marginBottom: SIZES.screenPadding,
  },
  dailyChallengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.cardGap,
  },
  dailyChallengeIcon: {
    width: SIZES.iconBadge,
    height: SIZES.iconBadge,
    borderRadius: SIZES.iconBadge / 2,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  challengeImage: {
    width: SIZES.iconSmall,
    height: SIZES.iconSmall,
  },
  dailyChallengeInfo: {
    flex: 1,
  },
  dailyChallengeTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },
  dailyChallengeSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  dailyChallengeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: RADIUS.sm,
  },
  dailyChallengeBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },

  // Main Level Card
  mainLevelCard: {
    marginBottom: SIZES.screenPadding,
  },
  mainLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.screenPadding,
  },
  mainLevelTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  mainLevelSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
  },
  xpBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: RADIUS.sm,
  },
  xpBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },

  // Progress
  progressSection: {
    marginBottom: SIZES.screenPadding,
  },
  progressBar: {
    height: SIZES.progressBarHeight,
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 2,
  },
  progressThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.text,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.sm,
  },

  // Continue Button
  continueButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
  },

  // Weekly Ranking
  weeklyRanking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.cardGap,
  },
  rankingBadge: {
    width: SIZES.iconBadge,
    height: SIZES.iconBadge,
    borderRadius: SIZES.iconBadge / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingBadgeText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  rankingContent: {
    flex: 1,
  },
  rankingTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },
  rankingSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Progress Levels Section
  progressLevelsSection: {
    marginTop: SIZES.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  sectionLink: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Poppins-Medium',
  },
  levelCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SIZES.cardGap,
  },

  // Bottom
  bottomSpace: {
    height: 100,
  },
});
