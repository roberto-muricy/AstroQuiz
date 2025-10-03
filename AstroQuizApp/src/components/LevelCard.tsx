/**
 * LevelCard Component
 * Card de nível do quiz
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

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
      style={styles.container}
    >
      <Card style={isActive && styles.activeCard}>
        <View style={styles.header}>
          <View
            style={[
              styles.levelBadge,
              isActive && styles.levelBadgeActive,
              isLocked && styles.levelBadgeLocked,
            ]}
          >
            <Text style={styles.levelNumber}>{levelNumber}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.levelName}>{levelName}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {!isLocked && (
          <>
            <View style={styles.stats}>
              <Text style={styles.statText}>
                {questionsCompleted}/{totalQuestions}
              </Text>
              <Text style={styles.statText}>{xp}xp</Text>
            </View>

            <ProgressBar
              progress={progress}
              height={8}
              showLabel={false}
            />

            <View style={styles.stars}>
              {[1, 2, 3].map(star => (
                <Text key={star} style={styles.star}>
                  {star <= stars ? '⭐' : '☆'}
                </Text>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={onPress}
          disabled={isLocked}
          style={[
            styles.button,
            isActive && styles.buttonActive,
            isLocked && styles.buttonLocked,
          ]}
        >
          <Text style={styles.buttonText}>
            {isLocked ? '🔒 Bloqueado' : isActive ? '▶ Continuar' : '🎯 Começar'}
          </Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
  },
  activeCard: {
    borderColor: '#FFA726',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeActive: {
    backgroundColor: '#FFA726',
  },
  levelBadgeLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  headerInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  star: {
    fontSize: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonActive: {
    backgroundColor: '#FFA726',
  },
  buttonLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
});


