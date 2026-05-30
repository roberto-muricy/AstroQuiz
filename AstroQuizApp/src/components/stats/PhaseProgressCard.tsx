/**
 * PhaseProgressCard - Progresso nas fases
 * Usa Card component para consistência visual
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/design-system';

interface PhaseProgressCardProps {
  completed: number;
  total: number;
  perfect: number;
}

export const PhaseProgressCard: React.FC<PhaseProgressCardProps> = ({
  completed,
  total,
  perfect,
}) => {
  const { t } = useTranslation();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <Text style={styles.title}>{t('stats.progressPhases')}</Text>

      {/* Fases Completadas */}
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.label}>{t('stats.phasesCompleted')}</Text>
          <Text style={styles.value}>{completed}/{total}</Text>
        </View>

        <ProgressBar progress={percentage} showLabel={false} showThumb={false} />

        <Text style={styles.subtitle}>
          {t('stats.gameComplete', { percent: percentage })}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Fases Perfeitas */}
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.label}>{t('stats.perfectPhases')}</Text>
          <Text style={styles.value}>{perfect}</Text>
        </View>

        <Text style={styles.subtitle}>
          {perfect === 0
            ? t('stats.noneCompleted')
            : t('stats.phasesWithPerfect', { count: perfect })}
        </Text>
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
  section: {
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  value: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
});
