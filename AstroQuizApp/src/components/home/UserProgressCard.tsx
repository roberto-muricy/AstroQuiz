/**
 * UserProgressCard Component
 * Card principal de progresso do usuário na Home
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { RankBadge } from '@/components/common/RankBadge';
import { StatDisplay } from '@/components/common/StatDisplay';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { SPACING, TYPOGRAPHY, COLORS, RADIUS, SIZES } from '@/constants/design-system';
import { RankData } from '@/constants/ranks';

interface UserProgressCardProps {
  currentRank: RankData;
  totalXP: number;
  xpToNext: number;
  progress: number;
  streak: number;
  onContinue: () => void;
}

export const UserProgressCard: React.FC<UserProgressCardProps> = ({
  currentRank,
  totalXP,
  xpToNext,
  progress,
  streak,
  onContinue,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      {/* Header com badge */}
      <View style={styles.header}>
        <RankBadge rank={currentRank} size="large" showLevel />

        <View style={styles.rankInfo}>
          <Text style={styles.rankTitle} numberOfLines={1}>
            {currentRank.displayName}
          </Text>
          <Text style={styles.rankSubtitle}>Nível {currentRank.level}</Text>
        </View>

        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>{totalXP} XP</Text>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {xpToNext > 0 ? `${xpToNext} XP para o próximo nível` : 'Nível máximo alcançado!'}
      </Text>

      {/* Progress bar */}
      <ProgressBar progress={progress} height={SIZES.progressBarHeight} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatDisplay value={`${progress}%`} label="No nível" />
        <StatDisplay value={`${streak}`} label="Maior Streak" />
        <StatDisplay value={xpToNext > 0 ? `${xpToNext} XP` : 'Max'} label="Próximo nível" />
      </View>

      {/* Button */}
      <Button title={t('common.continue')} onPress={onContinue} size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SIZES.cardPadding,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rankInfo: {
    flex: 1,
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  rankTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  rankSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  xpBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 70,
    alignItems: 'center',
  },
  xpText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
    fontSize: 14,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
  },
});
