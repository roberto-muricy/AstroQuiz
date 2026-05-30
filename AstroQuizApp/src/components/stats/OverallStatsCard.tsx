/**
 * OverallStatsCard - Resumo geral com badge de rank
 * Usa Card component para consistência visual
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { RankBadge } from '@/components/common/RankBadge';
import { StatDisplay } from '@/components/common/StatDisplay';
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/design-system';
import { RankData, getNextRank } from '@/constants/ranks';

interface OverallStatsCardProps {
  currentRank: RankData;
  totalXP: number;
  streak: number;
}

export const OverallStatsCard: React.FC<OverallStatsCardProps> = ({
  currentRank,
  totalXP,
  streak,
}) => {
  const { t } = useTranslation();
  const nextRank = getNextRank(currentRank);
  const xpToNext = nextRank
    ? nextRank.xpRequired - totalXP
    : 0;

  return (
    <Card>
      <Text style={styles.title}>{t('stats.overview')}</Text>

      {/* Badge Section */}
      <View style={styles.rankSection}>
        <RankBadge rank={currentRank} size="large" showLevel />

        <View style={styles.rankInfo}>
          <Text style={styles.rankName}>
            {t(`ranks.${currentRank.id}`)}
          </Text>
          <Text style={styles.rankLevel}>{t('profile.level')} {currentRank.level}</Text>
          <Text style={styles.rankSubtitle}>
            {nextRank
              ? t('stats.xpToRank', { xp: xpToNext, rank: t(`ranks.${nextRank.id}`) })
              : t('result.maxLevel')}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatDisplay value={`${totalXP}`} label={t('stats.totalXp')} />
        <StatDisplay value={`${currentRank.level}`} label={t('stats.currentLevel')} />
        <StatDisplay value={`${streak}`} label={t('stats.bestStreak')} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rankInfo: {
    flex: 1,
    gap: 2,
  },
  rankName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  rankLevel: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  rankSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
});
