/**
 * StatsScreen - Refatorada com componentes reutilizáveis
 * Remove duplicações e melhora organização
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { OverallStatsCard } from '@/components/stats/OverallStatsCard';
import { PhaseProgressCard } from '@/components/stats/PhaseProgressCard';
import { PerformanceCard } from '@/components/stats/PerformanceCard';
import { AchievementsCard } from '@/components/stats/AchievementsCard';
import { SPACING, TYPOGRAPHY, COLORS, SIZES } from '@/constants/design-system';
import { getRankByXP } from '@/constants/ranks';

export const StatsScreen = () => {
  // TODO: Substituir por dados reais do backend/estado
  const userData = {
    totalXP: 0,
    streak: 0,
    phasesCompleted: 0,
    totalPhases: 50,
    perfectPhases: 0,
    accuracy: 0,
    avgTime: 20,
    totalQuestions: 0,
    correctAnswers: 0,
    achievements: {
      unlocked: 0,
      total: 5,
    },
  };

  const currentRank = getRankByXP(userData.totalXP);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Estatísticas</Text>

      {/* Resumo Geral com Badge */}
      <OverallStatsCard
        currentRank={currentRank}
        totalXP={userData.totalXP}
        streak={userData.streak}
      />

      {/* Progresso nas Fases */}
      <PhaseProgressCard
        completed={userData.phasesCompleted}
        total={userData.totalPhases}
        perfect={userData.perfectPhases}
      />

      {/* Desempenho */}
      <PerformanceCard
        accuracy={userData.accuracy}
        avgTime={userData.avgTime}
        totalQuestions={userData.totalQuestions}
        correctAnswers={userData.correctAnswers}
      />

      {/* Conquistas */}
      <AchievementsCard
        unlockedCount={userData.achievements.unlocked}
        totalCount={userData.achievements.total}
        onStartPress={() => {
          // TODO: Navegar para Quiz
          console.log('Iniciar quiz');
        }}
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
    paddingTop: 60, // Safe area para status bar
    gap: SPACING.md,
    paddingBottom: 100, // Espaço para bottom nav
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
});