/**
 * StatsScreen - Refatorada com componentes reutilizáveis
 * Carrega dados reais do progresso (ProgressStorage) e usa i18n.
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OverallStatsCard } from '@/components/stats/OverallStatsCard';
import { PhaseProgressCard } from '@/components/stats/PhaseProgressCard';
import { PerformanceCard } from '@/components/stats/PerformanceCard';
import { AchievementsCard } from '@/components/stats/AchievementsCard';
import { SPACING, TYPOGRAPHY, COLORS, SIZES } from '@/constants/design-system';
import { getRankByXP } from '@/constants/ranks';
import { ProgressStorage } from '@/utils/progressStorage';
import { RootStackParamList } from '@/types';

const TOTAL_PHASES = 50;
const TOTAL_ACHIEVEMENTS = 6;

interface StatsView {
  totalXP: number;
  streak: number;
  phasesCompleted: number;
  perfectPhases: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  achievementsUnlocked: number;
}

const EMPTY_STATS: StatsView = {
  totalXP: 0,
  streak: 0,
  phasesCompleted: 0,
  perfectPhases: 0,
  accuracy: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  achievementsUnlocked: 0,
};

export const StatsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<StatsView>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const progress = await ProgressStorage.getProgress();
        const s = progress.stats;
        const totalQuestions = s.totalQuestionsAnswered || 0;
        const correctAnswers = s.totalCorrectAnswers || 0;
        const accuracy = totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
        if (active) {
          setData({
            totalXP: s.totalXP || 0,
            streak: s.maxStreak || 0,
            phasesCompleted: s.phasesCompleted || 0,
            perfectPhases: s.perfectPhases || 0,
            accuracy,
            totalQuestions,
            correctAnswers,
            achievementsUnlocked: (s.achievements || []).length,
          });
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const currentRank = getRankByXP(data.totalXP);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>{t('stats.title')}</Text>

      <OverallStatsCard
        currentRank={currentRank}
        totalXP={data.totalXP}
        streak={data.streak}
      />

      <PhaseProgressCard
        completed={data.phasesCompleted}
        total={TOTAL_PHASES}
        perfect={data.perfectPhases}
      />

      <PerformanceCard
        accuracy={data.accuracy}
        avgTime={0}
        totalQuestions={data.totalQuestions}
        correctAnswers={data.correctAnswers}
      />

      <AchievementsCard
        unlockedCount={data.achievementsUnlocked}
        totalCount={TOTAL_ACHIEVEMENTS}
        onStartPress={() => navigation.navigate('Quiz' as never)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.screenPadding,
    gap: SPACING.md,
    paddingBottom: 100, // Espaço para bottom nav
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
});
