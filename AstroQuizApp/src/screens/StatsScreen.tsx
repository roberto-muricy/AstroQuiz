/**
 * StatsScreen
 * Tela de estatísticas do usuário
 */

import { Card, ProgressBar } from '@/components';
import { useApp } from '@/contexts/AppContext';
import { ProgressStorage } from '@/utils/progressStorage';
import { achievements, getPlayerLevel, getXPToNextLevel } from '@/utils/progressionSystem';
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

export const StatsScreen = () => {
  const { user } = useApp();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalXP: 0,
    phasesCompleted: 0,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    maxStreak: 0,
    perfectPhases: 0,
    achievements: [] as string[],
  });
  const [currentLevel, setCurrentLevel] = useState({ level: 1, title: 'Space Rookie', icon: '🌟' });
  const [xpToNext, setXpToNext] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const progress = await ProgressStorage.getProgress();
    setStats(progress.stats);
    
    const level = getPlayerLevel(progress.stats.totalXP);
    setCurrentLevel(level);
    setXpToNext(getXPToNextLevel(progress.stats.totalXP));
  };

  const accuracy = stats.totalQuestionsAnswered > 0
    ? Math.round((stats.totalCorrectAnswers / stats.totalQuestionsAnswered) * 100)
    : 0;

  const averageTimePerQuestion = 20; // Mock por enquanto (não estamos rastreando tempo por questão)
  const progressPct = stats.phasesCompleted / 50;

  return (
    <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('stats.title')}</Text>

        {/* Resumo Geral */}
        <Card>
          <Text style={styles.cardTitle}>{t('stats.overview')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalXP.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{t('stats.totalXp')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentLevel.level}</Text>
              <Text style={styles.statLabel}>{t('stats.currentLevel')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.maxStreak}</Text>
              <Text style={styles.statLabel}>{t('result.maxStreak')}</Text>
            </View>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>{currentLevel.icon} {currentLevel.title}</Text>
            <Text style={styles.levelSubtext}>
              {xpToNext > 0 ? t('result.xpToNext', { xp: xpToNext }) : t('result.maxLevel')}
            </Text>
          </View>
        </Card>

        {/* Progresso nas Fases */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('stats.progressPhases')}</Text>
          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t('stats.phasesCompleted')}</Text>
              <Text style={styles.progressValue}>{stats.phasesCompleted}/50</Text>
            </View>
            <ProgressBar progress={progressPct * 100} showLabel={false} />
            <Text style={styles.progressSubtext}>
              {t('stats.gameComplete', { percent: Math.round(progressPct * 100) })}
            </Text>
          </View>
          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t('stats.perfectPhases')}</Text>
              <Text style={styles.progressValue}>{stats.perfectPhases}</Text>
            </View>
            <Text style={styles.progressSubtext}>
              {stats.phasesCompleted > 0 
                ? t('stats.percentPerfect', { percent: Math.round((stats.perfectPhases / stats.phasesCompleted) * 100) })
                : t('stats.noneCompleted')}
            </Text>
          </View>
        </Card>

        {/* Desempenho */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('stats.performance')}</Text>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceValue, accuracy >= 80 && styles.performanceGood]}>
                {accuracy}%
              </Text>
              <Text style={styles.performanceLabel}>{t('stats.accuracyRate')}</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{averageTimePerQuestion}s</Text>
              <Text style={styles.performanceLabel}>{t('stats.avgTime')}</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statGridItem}>
              <Text style={styles.statGridValue}>{stats.totalQuestionsAnswered}</Text>
              <Text style={styles.statGridLabel}>{t('stats.totalQuestions')}</Text>
            </View>
            <View style={styles.statGridItem}>
              <Text style={styles.statGridValue}>{stats.totalCorrectAnswers}</Text>
              <Text style={styles.statGridLabel}>{t('result.correct_plural')}</Text>
            </View>
          </View>
        </Card>

        {/* Conquistas */}
        <Card style={styles.card}>
          <View style={styles.achievementHeader}>
            <Text style={styles.cardTitle}>🏆 {t('achievements.title')}</Text>
            <Text style={styles.achievementCount}>
              {stats.achievements.length}/{achievements.length}
            </Text>
          </View>
          
          <View style={styles.achievementsList}>
            {achievements.map(achievement => {
              const isUnlocked = stats.achievements.includes(achievement.id);
              
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementItem,
                    !isUnlocked && styles.achievementLocked,
                  ]}
                >
                  <View style={styles.achievementIconContainer}>
                    <Text style={styles.achievementEmoji}>
                      {isUnlocked ? achievement.icon : '🔒'}
                    </Text>
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text
                      style={[
                        styles.achievementTitle,
                        !isUnlocked && styles.achievementTextLocked,
                      ]}
                    >
                      {isUnlocked ? achievement.name : '???'}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDesc,
                        !isUnlocked && styles.achievementTextLocked,
                      ]}
                    >
                      {isUnlocked ? achievement.description : t('achievements.locked')}
                    </Text>
                  </View>
                  {isUnlocked && (
                    <View style={styles.achievementXP}>
                      <Text style={styles.achievementXPText}>+{achievement.xpReward}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 24,
  },
  card: {
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  levelInfo: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  levelSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  progressItem: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  progressSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  performanceGood: {
    color: '#0FB57E',
  },
  performanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statGridItem: {
    alignItems: 'center',
  },
  statGridValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  statGridLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementCount: {
    fontSize: 16,
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  achievementLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  achievementIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  achievementTextLocked: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  achievementXP: {
    backgroundColor: 'rgba(255, 167, 38, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  achievementXPText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  bottomSpace: {
    height: 100,
  },
});


