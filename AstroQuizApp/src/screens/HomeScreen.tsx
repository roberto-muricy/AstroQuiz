/**
 * HomeScreen
 * Tela principal do app baseada no design do Figma
 */

import { Button, Card, LevelCard } from '@/components';
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
    <LinearGradient
      colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']}
      style={styles.container}
    >
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
              <Text style={styles.streakText}>🔥 {t('home.streakDays', { count: streak })}</Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🚀</Text>
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
                <Text style={styles.dailyChallengeTitle}>{t('home.dailyChallengeTitle')}</Text>
                <Text style={styles.dailyChallengeSubtitle}>
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
                  colors={['#FFA726', '#FFB74D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                >
                  <View style={styles.progressThumb} />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{Math.round(progressPct * 100)}%</Text>
                <Text style={styles.statLabel}>{t('home.inLevel')}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>{t('result.maxStreak')}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{xpToNext > 0 ? `${xpToNext}xp` : 'Max'}</Text>
                <Text style={styles.statLabel}>{t('home.nextLevel')}</Text>
              </View>
            </View>
          </View>

          <Button
            title={t('home.continueWhereLeftOff')}
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
                <Text style={styles.rankingTitle}>{t('home.weeklyRankingTitle')}</Text>
                <Text style={styles.rankingSubtitle}>
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1A2E',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  dailyChallenge: {
    marginBottom: 20,
  },
  dailyChallengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyChallengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  challengeImage: {
    width: 32,
    height: 32,
  },
  dailyChallengeInfo: {
    flex: 1,
  },
  dailyChallengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  dailyChallengeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  dailyChallengeBadge: {
    backgroundColor: '#FFA726',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dailyChallengeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  mainLevelCard: {
    marginBottom: 20,
  },
  mainLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mainLevelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  mainLevelSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 16,
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
    backgroundColor: '#FFFFFF',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  continueButton: {
    width: '100%',
    borderRadius: 20, // alinhar com o raio dos Cards (identidade mais arredondada)
  },
  weeklyRanking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankingBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  rankingContent: {
    flex: 1,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  rankingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  progressLevelsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  sectionLink: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  levelCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomSpace: {
    height: 100,
  },
});

