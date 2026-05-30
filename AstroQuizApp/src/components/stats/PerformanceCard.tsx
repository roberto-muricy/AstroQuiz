/**
 * PerformanceCard - Estatísticas de desempenho
 * Usa Card component para consistência visual
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/design-system';

interface PerformanceCardProps {
  accuracy: number;
  avgTime: number;
  totalQuestions: number;
  correctAnswers: number;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  accuracy,
  avgTime,
  totalQuestions,
  correctAnswers,
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <Text style={styles.title}>{t('stats.performance')}</Text>

      {/* Grid 2x2 */}
      <View style={styles.grid}>
        {/* Primeira linha */}
        <View style={styles.row}>
          <View style={styles.statContainer}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {t('stats.accuracyRate')}
            </Text>
          </View>

          <View style={styles.statContainer}>
            <Text style={styles.statValue}>{avgTime > 0 ? `${avgTime}s` : '—'}</Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {t('stats.avgTime')}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Segunda linha */}
        <View style={styles.row}>
          <View style={styles.statContainer}>
            <Text style={styles.statValue}>{totalQuestions}</Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {t('stats.totalQuestions')}
            </Text>
          </View>

          <View style={styles.statContainer}>
            <Text style={styles.statValue}>{correctAnswers}</Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {t('stats.correctAnswers')}
            </Text>
          </View>
        </View>
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
  grid: {
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  statContainer: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    ...TYPOGRAPHY.statValue,
    color: COLORS.primary,
    textAlign: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 100,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
