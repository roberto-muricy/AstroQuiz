/**
 * LevelCard Component - Corrigido
 * Card de nível do quiz com layout compacto
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ProgressBar } from './ProgressBar';
import { StarsRating, PlayIcon, LockIcon, IconSizes } from './Icons';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '@/constants/design-system';

interface LevelCardProps {
  levelNumber: number;
  levelName: string;
  subtitle: string;
  progress: number;
  questionsCompleted: number;
  totalQuestions: number;
  xp: number;
  stars: number;
  isLocked?: boolean;
  isActive?: boolean;
  onPress?: () => void;
}

export const LevelCard: React.FC<LevelCardProps> = ({
  levelNumber,
  levelName,
  subtitle,
  progress,
  questionsCompleted,
  totalQuestions,
  xp,
  stars,
  isLocked = false,
  isActive = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLocked}
      activeOpacity={0.8}
      style={[styles.container, isLocked && styles.containerLocked]}
    >
      <View style={[styles.cardOuter, isActive && styles.cardActive]}>
        <LinearGradient
          colors={COLORS.cardGradient as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.cardContent}>
            {/* Badge */}
            <View
              style={[
                styles.levelBadge,
                isActive && styles.levelBadgeActive,
                isLocked && styles.levelBadgeLocked,
              ]}
            >
              <Text style={styles.levelNumber}>{levelNumber}</Text>
            </View>

            {/* Título e subtítulo */}
            <Text style={styles.levelName}>{levelName}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {!isLocked && (
              <>
                {/* Stats */}
                <View style={styles.stats}>
                  <Text style={styles.statText}>
                    {questionsCompleted}/{totalQuestions}
                  </Text>
                  <Text style={styles.statText}>{xp}xp</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <ProgressBar progress={progress} height={5} showLabel={false} />
                </View>

                {/* Stars */}
                <View style={styles.stars}>
                  <StarsRating stars={stars} size={IconSizes.sm} gap={2} />
                </View>
              </>
            )}

            {/* Botão */}
            <TouchableOpacity
              onPress={onPress}
              disabled={isLocked}
              style={[
                styles.button,
                isActive && styles.buttonActive,
                isLocked && styles.buttonLocked,
              ]}
            >
              <View style={styles.buttonIcon}>
                {isLocked ? <LockIcon size={14} /> : <PlayIcon size={12} />}
              </View>
              <Text style={styles.buttonText} numberOfLines={1}>
                {isLocked ? 'Bloqueado' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
  },
  containerLocked: {
    opacity: 0.6,
  },
  cardOuter: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  gradient: {
    padding: 1,
  },
  cardContent: {
    padding: 12,
    borderRadius: RADIUS.lg - 1,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  levelBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  levelBadgeLocked: {
    backgroundColor: COLORS.backgroundMuted,
  },
  levelNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontSize: 18,
  },
  levelName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 6,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  statText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 4,
  },
  stars: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: RADIUS.md,
    width: '100%',
    gap: 4,
  },
  buttonActive: {
    backgroundColor: COLORS.primary,
  },
  buttonLocked: {
    backgroundColor: COLORS.backgroundMuted,
  },
  buttonIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
  },
});
