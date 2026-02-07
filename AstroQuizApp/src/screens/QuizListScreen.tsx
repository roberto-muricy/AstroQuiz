/**
 * QuizListScreen - Refatorada
 * Tela para selecionar fase/nível do quiz
 *
 * Refatoração: Usa design-system para consistência com StatsScreen
 */

import { useApp } from '@/contexts/AppContext';
import api from '@/services/api';
import quizService from '@/services/quizService';
import soundService from '@/services/soundService';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
import { calculateStarRating, getUnlockRequirement, isPhaseUnlocked, getDifficultyDistribution } from '@/utils/progressionSystem';
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from '@/constants/design-system';
import { StarsRating, LockIcon, PlayIcon, IconSizes, IconColors } from '@/components/Icons';

export const QuizListScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { locale } = useApp();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [unlockedPhases, setUnlockedPhases] = useState(1);
  const [phaseStats, setPhaseStats] = useState<Record<number, any>>({});

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const progress = await ProgressStorage.getProgress();
    setUnlockedPhases(progress.unlockedPhases);
    setPhaseStats(progress.stats?.phaseStats || {});
  };

  const openApiConfig = () => {
    const current = api.getBaseUrl();

    const setOverride = async (value: string | null) => {
      const trimmed = (value || '').trim();
      await api.setApiBaseUrlOverride(trimmed ? trimmed : null);
      Alert.alert(
        'API',
        `Base URL atualizada para:\n${api.getBaseUrl()}\n\n(Tente iniciar o quiz novamente)`,
      );
    };

    if (Platform.OS === 'ios' && typeof (Alert as any).prompt === 'function') {
      (Alert as any).prompt(
        'Configurar API (DEV)',
        `Base atual:\n${current}\n\nDica (iPhone físico): use http://SEU_IP_DO_MAC:1337/api`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Limpar', style: 'destructive', onPress: () => setOverride(null) },
          { text: 'Salvar', onPress: (value: string) => setOverride(value) },
        ],
        'plain-text',
        current,
      );
      return;
    }

    Alert.alert(
      'Configurar API (DEV)',
      `Base atual:\n${current}\n\nSem prompt nessa plataforma.\nUse o override via AsyncStorage (@api_base_url_override) ou ajuste o fallback no código.`,
    );
  };

  const handleStartQuiz = async (phaseNumber: number) => {
    if (phaseNumber > unlockedPhases) {
      soundService.playIncorrect();
      Alert.alert(
        t('quizList.lockedTitle'),
        t('quizList.lockedMessage', { prev: phaseNumber - 1 })
      );
      return;
    }

    try {
      soundService.playTap();
      setLoading(true);
      console.log('🌐 API baseURL (current):', api.getBaseUrl());
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
      const msg = error instanceof Error ? error.message : String(error);
      const maybeTimeout =
        /timeout/i.test(msg) ||
        /ECONNABORTED/i.test(msg) ||
        /Network Error/i.test(msg);

      if (maybeTimeout) {
        Alert.alert(
          t('common.error'),
          `${t('errors.quizStartError')}\n\nSem conexão com o servidor.\nBase atual: ${api.getBaseUrl()}\n\nDica: toque e segure no título para configurar a API.`,
        );
      } else {
        Alert.alert(t('common.error'), t('errors.quizStartError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const getTierKey = (phase: number): 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite' => {
    if (phase <= 10) return 'beginner';
    if (phase <= 20) return 'novice';
    if (phase <= 30) return 'intermediate';
    if (phase <= 40) return 'advanced';
    return 'elite';
  };

  const getPhaseTitle = (phase: number): string => {
    const tierKey = getTierKey(phase);
    const tier = t(`quizList.tierNames.${tierKey}`);
    return t('quizList.phaseTitle', { phase, tier });
  };

  const getPhaseDescription = (phase: number): string => {
    const dist = getDifficultyDistribution(phase);
    const levels = [...new Set(dist.map(d => d.level))].sort();
    if (levels.length === 1) return t('quizList.difficultySingle', { level: levels[0] });
    return t('quizList.difficultyRange', { min: levels[0], max: levels[levels.length - 1] });
  };

  const renderPhaseCard = (phaseNumber: number, title?: string, description?: string) => {
    const finalTitle = title || getPhaseTitle(phaseNumber);
    const finalDescription = description || getPhaseDescription(phaseNumber);
    const stats = phaseStats[phaseNumber];
    const stars = stats ? stats.stars : 0;
    const accuracy = stats ? stats.accuracy : 0;
    const isCompleted = !!(stats && stats.completed);

    const prevStats = phaseStats[phaseNumber - 1] || { accuracy: 0, correctAnswers: 0 };
    const lockedByRequirement = !isPhaseUnlocked(phaseNumber, prevStats);
    const isLocked = lockedByRequirement || phaseNumber > unlockedPhases;

    const isCurrentPhase = phaseNumber === unlockedPhases && !isLocked;

    return (
      <TouchableOpacity
        key={phaseNumber}
        onPress={() => handleStartQuiz(phaseNumber)}
        disabled={loading || isLocked}
        style={[
          styles.phaseCard,
          isLocked && styles.phaseCardLocked,
          isCurrentPhase && styles.phaseCardActive,
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.phaseNumber, isLocked && styles.phaseNumberLocked]}>
          {isLocked ? (
            <LockIcon size={IconSizes.lg} color={IconColors.muted} />
          ) : (
            <Text style={styles.phaseNumberText}>{phaseNumber}</Text>
          )}
        </View>
        <View style={styles.phaseContent}>
          <View style={styles.phaseTitleRow}>
            <Text style={[styles.phaseTitle, isLocked && styles.lockedText]}>
              {finalTitle}
            </Text>
            {isCompleted && <Text style={styles.completedBadge}>✓</Text>}
          </View>
          <Text style={[styles.phaseDescription, isLocked && styles.lockedText]}>
            {isLocked
              ? t('quizList.requiresAccuracy', { accuracy: getUnlockRequirement(phaseNumber).requiredAccuracy })
              : finalDescription}
          </Text>
          <Text style={[styles.phaseInfo, isLocked && styles.lockedText]}>
            {t('quizList.phaseInfo', { seconds: 30 })} {isCompleted ? `• ${accuracy}%` : ''}
          </Text>
          <View style={styles.starRow}>
            <StarsRating stars={stars} size={IconSizes.md} gap={6} />
          </View>
        </View>
        <View style={styles.playButton}>
          {!isLocked && <PlayIcon size={IconSizes.lg} color={IconColors.primary} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <TouchableOpacity activeOpacity={0.9} onLongPress={openApiConfig} delayLongPress={600}>
          <Text style={styles.pageTitle}>{t('quizList.headerTitle')}</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>{t('quizList.headerSubtitle')}</Text>

        {/* Iniciante (Fases 1-10) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quizList.tiers.beginner')}</Text>
          <Text style={styles.sectionSubtitle}>{t('quizList.tierSubtitle', { from: 1, to: 10, min: 1, max: 2 })}</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(phase => renderPhaseCard(phase))}

        {/* Novato (Fases 11-20) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quizList.tiers.novice')}</Text>
          <Text style={styles.sectionSubtitle}>{t('quizList.tierSubtitle', { from: 11, to: 20, min: 1, max: 3 })}</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 11).map(phase => renderPhaseCard(phase))}

        {/* Intermediário (Fases 21-30) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quizList.tiers.intermediate')}</Text>
          <Text style={styles.sectionSubtitle}>{t('quizList.tierSubtitle', { from: 21, to: 30, min: 2, max: 4 })}</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 21).map(phase => renderPhaseCard(phase))}

        {/* Avançado (Fases 31-40) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quizList.tiers.advanced')}</Text>
          <Text style={styles.sectionSubtitle}>{t('quizList.tierSubtitle', { from: 31, to: 40, min: 3, max: 5 })}</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 31).map(phase => renderPhaseCard(phase))}

        {/* Elite (Fases 41-50) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quizList.tiers.elite')}</Text>
          <Text style={styles.sectionSubtitle}>{t('quizList.tierSubtitle', { from: 41, to: 50, min: 4, max: 5 })}</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 41).map(phase => renderPhaseCard(phase))}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('quizList.preparing')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.screenPadding,
    paddingTop: 60,
    gap: SPACING.md,
    paddingBottom: 100,
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  phaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.cardPadding,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  phaseCardLocked: {
    opacity: 0.6,
  },
  phaseCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  phaseNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  phaseNumberLocked: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  phaseNumberText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  phaseContent: {
    flex: 1,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  phaseTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  completedBadge: {
    marginLeft: SPACING.sm,
    fontSize: 18,
    color: COLORS.success,
  },
  lockedText: {
    color: COLORS.textTertiary,
  },
  phaseDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  phaseInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  starRow: {
    marginTop: SPACING.sm,
  },
  playButton: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  bottomSpace: {
    height: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
