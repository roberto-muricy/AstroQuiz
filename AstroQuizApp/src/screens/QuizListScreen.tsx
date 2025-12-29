/**
 * QuizListScreen
 * Tela para selecionar fase/nível do quiz
 */

import { useApp } from '@/contexts/AppContext';
import quizService from '@/services/quizService';
import soundService from '@/services/soundService';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
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

  // Carregar progresso ao entrar na tela
  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const progress = await ProgressStorage.getProgress();
    setUnlockedPhases(progress.unlockedPhases);
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
      
      const session = await quizService.startQuiz(phaseNumber, locale);
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

  const renderPhaseCard = (phaseNumber: number, title: string, description: string) => {
    const isLocked = phaseNumber > unlockedPhases;
    const isCompleted = phaseNumber < unlockedPhases;

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
                {title}
              </Text>
              {isCompleted && <Text style={styles.completedBadge}>✓</Text>}
            </View>
            <Text style={[styles.phaseDescription, isLocked && styles.lockedText]}>
              {isLocked ? 'Complete a fase anterior' : description}
            </Text>
            <Text style={[styles.phaseInfo, isLocked && styles.lockedText]}>
              10 perguntas • 30s cada
            </Text>
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
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              await ProgressStorage.unlockNextPhase(unlockedPhases);
              loadProgress();
            }}
          >
            <Text style={styles.debugText}>DEBUG: Completar Fase {unlockedPhases}</Text>
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
        {renderPhaseCard(1, 'Fase 1 - Iniciante', 'Perguntas básicas de astronomia')}
        {renderPhaseCard(2, 'Fase 2 - Aprendiz', 'Conceitos fundamentais')}
        {renderPhaseCard(3, 'Fase 3 - Intermediário', 'Desafios moderados')}
        {renderPhaseCard(4, 'Fase 4 - Avançado', 'Teste seus conhecimentos')}
        {renderPhaseCard(5, 'Fase 5 - Expert', 'Apenas para os melhores')}
        
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            Mais fases em breve... 🌟
          </Text>
        </View>
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
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  phaseCardLocked: {
    opacity: 0.6,
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
  playButton: {
    fontSize: 28,
    color: '#FFA726',
  },
  comingSoon: {
    padding: 20,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
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

