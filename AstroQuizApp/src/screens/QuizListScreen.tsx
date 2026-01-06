/**
 * QuizListScreen
 * Tela para selecionar fase/nível do quiz
 * Updated: stars display
 */

import { useApp } from '@/contexts/AppContext';
import quizService from '@/services/quizService';
import soundService from '@/services/soundService';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
import { calculateStarRating, getUnlockRequirement, isPhaseUnlocked, getDifficultyDistribution } from '@/utils/progressionSystem';
import React, { useState, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const QuizListScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { locale } = useApp();
  const [loading, setLoading] = useState(false);
  const [unlockedPhases, setUnlockedPhases] = useState(1); // Começar com fase 1 desbloqueada
  const [phaseStats, setPhaseStats] = useState<Record<number, any>>({});
  const SHOW_DEBUG_UI = false;

  // Carregar progresso ao entrar na tela
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

  const handleStartQuiz = async (phaseNumber: number) => {
    // Verificar se a fase está desbloqueada
    if (phaseNumber > unlockedPhases) {
      soundService.playIncorrect();
      Alert.alert(
        'Fase Bloqueada 🔒',
        `Complete a Fase ${phaseNumber - 1} para desbloquear esta fase!`
      );
      return;
    }

    try {
      soundService.playTap();
      setLoading(true);
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
      Alert.alert('Erro', 'Não foi possível iniciar o quiz. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const getPhaseTitle = (phase: number): string => {
    if (phase <= 10) return `Fase ${phase} - Iniciante`;
    if (phase <= 20) return `Fase ${phase} - Novato`;
    if (phase <= 30) return `Fase ${phase} - Intermediário`;
    if (phase <= 40) return `Fase ${phase} - Avançado`;
    return `Fase ${phase} - Elite`;
  };

  const getPhaseDescription = (phase: number): string => {
    const dist = getDifficultyDistribution(phase);
    const levels = [...new Set(dist.map(d => d.level))].sort();
    if (levels.length === 1) return `Nível ${levels[0]} de dificuldade`;
    return `Níveis ${levels[0]}-${levels[levels.length - 1]} de dificuldade`;
  };

  const renderPhaseCard = (phaseNumber: number, title?: string, description?: string) => {
    const finalTitle = title || getPhaseTitle(phaseNumber);
    const finalDescription = description || getPhaseDescription(phaseNumber);
    const stats = phaseStats[phaseNumber];
    const stars = stats ? stats.stars : 0;
    const accuracy = stats ? stats.accuracy : 0;
    const isCompleted = !!(stats && stats.completed);

    // Requisito da fase anterior
    const prevStats = phaseStats[phaseNumber - 1] || { accuracy: 0, correctAnswers: 0 };
    const lockedByRequirement = !isPhaseUnlocked(phaseNumber, prevStats);
    const isLocked = lockedByRequirement || phaseNumber > unlockedPhases;

    return (
      <TouchableOpacity
        key={phaseNumber}
        onPress={() => handleStartQuiz(phaseNumber)}
        disabled={loading || isLocked}
        style={[styles.phaseCard, isLocked && styles.phaseCardLocked]}
      >
        <LinearGradient
          colors={isLocked 
            ? ['#2A2A3E', '#35354F', '#404060']
            : ['#3D3D6B', '#4A4A7C', '#5A5A9C']
          }
          style={styles.phaseGradient}
        >
          <View style={[styles.phaseNumber, isLocked && styles.phaseNumberLocked]}>
            <Text style={styles.phaseNumberText}>
              {isLocked ? '🔒' : phaseNumber}
            </Text>
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
                ? `Requer ${getUnlockRequirement(phaseNumber).requiredAccuracy}% de acurácia na fase anterior`
                : finalDescription}
            </Text>
            <Text style={[styles.phaseInfo, isLocked && styles.lockedText]}>
              10 perguntas • 30s cada {isCompleted ? `• ${accuracy}%` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {[1, 2, 3].map(s => (
                <Text key={s} style={{ fontSize: 20, color: s <= stars ? '#FFD700' : 'rgba(255,255,255,0.25)' }}>
                  {s <= stars ? '⭐' : '☆'}
                </Text>
              ))}
            </View>
          </View>
          <Text style={[styles.playButton, isLocked && styles.lockedText]}>
            {isLocked ? '' : '▶'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🚀 AstroQuiz</Text>
        <Text style={styles.subtitle}>Escolha uma fase para começar</Text>
        
        {/* Botão DEBUG - Remover depois */}
        {__DEV__ && SHOW_DEBUG_UI && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              // Force unlock next phase for testing
              const progress = await ProgressStorage.getProgress();
              await ProgressStorage.saveProgress({ ...progress, unlockedPhases: progress.unlockedPhases + 1 });
              loadProgress();
            }}
          >
            <Text style={styles.debugText}>DEBUG: Desbloquear Fase {unlockedPhases + 1}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Iniciante (Fases 1-10) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🌟 Iniciante</Text>
          <Text style={styles.sectionSubtitle}>Fases 1-10 • Níveis 1-2</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(phase => renderPhaseCard(phase))}

        {/* Novato (Fases 11-20) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔭 Novato</Text>
          <Text style={styles.sectionSubtitle}>Fases 11-20 • Níveis 1-3</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 11).map(phase => renderPhaseCard(phase))}

        {/* Intermediário (Fases 21-30) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚀 Intermediário</Text>
          <Text style={styles.sectionSubtitle}>Fases 21-30 • Níveis 2-4</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 21).map(phase => renderPhaseCard(phase))}

        {/* Avançado (Fases 31-40) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⭐ Avançado</Text>
          <Text style={styles.sectionSubtitle}>Fases 31-40 • Níveis 3-5</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 31).map(phase => renderPhaseCard(phase))}

        {/* Elite (Fases 41-50) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👑 Elite</Text>
          <Text style={styles.sectionSubtitle}>Fases 41-50 • Níveis 4-5</Text>
        </View>
        {Array.from({ length: 10 }, (_, i) => i + 41).map(phase => renderPhaseCard(phase))}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFA726" />
          <Text style={styles.loadingText}>Preparando quiz...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100, // Extra espaço no final
  },
  phaseCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  phaseCardLocked: {
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  phaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  phaseNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  phaseNumberLocked: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  phaseNumberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA726',
  },
  phaseContent: {
    flex: 1,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  completedBadge: {
    marginLeft: 8,
    fontSize: 18,
    color: '#4CAF50',
  },
  lockedText: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  phaseDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  phaseInfo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  starRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  star: {
    fontSize: 18,
    color: '#FFD700', // amarelo vivo
  },
  starOff: {
    color: '#4D4D5D', // cinza mais visível no fundo
  },
  playButton: {
    fontSize: 28,
    color: '#FFA726',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
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
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  debugButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.5)',
  },
  debugText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

