/**
 * QuizResultScreen
 * Tela de resultados após completar uma fase do quiz
 */

import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
import soundService from '@/services/soundService';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import quizService from '@/services/quizService';

export const QuizResultScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuizResult'>>();
  const { sessionId } = route.params;

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phaseUnlocked, setPhaseUnlocked] = useState(false);
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    loadResults();
    
    // Animação de entrada
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadResults = async () => {
    try {
      // Finalizar a sessão no backend
      const finishResponse = await quizService.finishQuiz(sessionId);
      console.log('🏁 Quiz finalizado:', finishResponse);
      
      const data = finishResponse;
      setSessionData(data);
      
      // Calcular accuracy
      const accuracy = data.accuracy || 
        (data.totalQuestions > 0 ? Math.round((data.correctAnswers / data.totalQuestions) * 100) : 0);
      
      const isPerfect = accuracy === 100;

      // Se passou na fase (60%+), desbloquear próxima
      if (data.passed && data.phaseNumber) {
        await ProgressStorage.unlockNextPhase(data.phaseNumber);
        setPhaseUnlocked(true);
        
        // Som de desbloqueio
        setTimeout(() => soundService.playUnlock(), 500);
      }
      
      // Som de fase completada
      soundService.playPhaseComplete(isPerfect);
      
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = async () => {
    try {
      if (sessionData?.phaseNumber) {
        const newSession = await quizService.startQuiz(sessionData.phaseNumber, 'pt');
        navigation.replace('QuizGame', {
          phaseNumber: sessionData.phaseNumber,
          sessionId: newSession.sessionId,
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar novo quiz:', error);
    }
  };

  const handleNextPhase = async () => {
    try {
      const nextPhase = (sessionData?.phaseNumber || 1) + 1;
      const newSession = await quizService.startQuiz(nextPhase, 'pt');
      navigation.replace('QuizGame', {
        phaseNumber: nextPhase,
        sessionId: newSession.sessionId,
      });
    } catch (error) {
      console.error('Erro ao iniciar próxima fase:', error);
    }
  };

  const handleBackToMenu = () => {
    // Voltar para a tela principal (tabs)
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  if (loading || !sessionData) {
    return (
      <LinearGradient
        colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']}
        style={styles.container}
      >
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Calculando resultados...</Text>
        </View>
      </LinearGradient>
    );
  }

  const accuracy = sessionData.accuracy || 
    (sessionData.totalQuestions > 0
      ? Math.round((sessionData.correctAnswers / sessionData.totalQuestions) * 100)
      : 0);

  const passed = sessionData.passed !== undefined ? sessionData.passed : accuracy >= 60;
  const isPerfect = accuracy === 100;
  const isGreat = accuracy >= 80;
  const isGood = accuracy >= 60;

  return (
    <LinearGradient
      colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* Header com Emoji de Performance */}
        <Animated.View style={[styles.header, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>
            {isPerfect ? '🏆' : isGreat ? '🌟' : isGood ? '👍' : '💪'}
          </Text>
          <Text style={styles.title}>
            {isPerfect ? 'Perfeito!' : isGreat ? 'Excelente!' : isGood ? 'Muito Bem!' : 'Continue Tentando!'}
          </Text>
          <Text style={styles.subtitle}>
            Fase {sessionData.phaseNumber} {passed ? 'Concluída' : 'Incompleta'}
          </Text>
          
          {/* Badge de Passou/Não Passou */}
          {passed ? (
            <View style={styles.passedBadge}>
              <Text style={styles.passedText}>✓ APROVADO</Text>
            </View>
          ) : (
            <View style={styles.failedBadge}>
              <Text style={styles.failedText}>Necessário: 60%</Text>
            </View>
          )}
        </Animated.View>

        {/* Card de Pontuação Principal */}
        <View style={styles.scoreCard}>
          <LinearGradient
            colors={['#5A5A9C', '#4A4A7C']}
            style={styles.scoreGradient}
          >
            <Text style={styles.scoreLabel}>Pontuação Final</Text>
            <Text style={styles.scoreValue}>{sessionData.finalScore || sessionData.score || 0}</Text>
            <Text style={styles.accuracyText}>{accuracy}% de acertos</Text>
          </LinearGradient>
        </View>

        {/* Estatísticas Detalhadas */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>✅</Text>
              <Text style={styles.statValue}>{sessionData.correctAnswers || 0}</Text>
              <Text style={styles.statLabel}>Acertos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>❌</Text>
              <Text style={styles.statValue}>{sessionData.incorrectAnswers || 0}</Text>
              <Text style={styles.statLabel}>Erros</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{sessionData.maxStreak || 0}</Text>
              <Text style={styles.statLabel}>Maior Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⏱️</Text>
              <Text style={styles.statValue}>
                {Math.round((sessionData.totalTime || 180000) / 1000)}s
              </Text>
              <Text style={styles.statLabel}>Tempo Total</Text>
            </View>
          </View>
        </View>

        {/* Performance Breakdown */}
        {isPerfect && (
          <View style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>👑</Text>
            <Text style={styles.achievementTitle}>Perfect Score!</Text>
            <Text style={styles.achievementText}>
              Você acertou todas as perguntas!
              {'\n'}+50% Bônus de Perfeição aplicado!
            </Text>
          </View>
        )}
        
        {sessionData.maxStreak >= 10 && (
          <View style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>🔥</Text>
            <Text style={styles.achievementTitle}>Streak Master!</Text>
            <Text style={styles.achievementText}>
              {sessionData.maxStreak} respostas corretas seguidas!
            </Text>
          </View>
        )}

        {phaseUnlocked && passed && (
          <View style={[styles.achievementCard, styles.achievementSuccess]}>
            <Text style={styles.achievementEmoji}>🎉</Text>
            <Text style={[styles.achievementTitle, styles.achievementTitleSuccess]}>
              Nova Fase Desbloqueada!
            </Text>
            <Text style={styles.achievementText}>
              Fase {sessionData.phaseNumber + 1} está disponível agora
            </Text>
          </View>
        )}

        {!passed && (
          <View style={[styles.achievementCard, styles.achievementWarning]}>
            <Text style={styles.achievementEmoji}>💪</Text>
            <Text style={[styles.achievementTitle, styles.achievementTitleWarning]}>
              Continue Praticando!
            </Text>
            <Text style={styles.achievementText}>
              Você precisa de 60% de acertos para passar.
              {'\n'}Tente novamente e conquiste esta fase!
            </Text>
          </View>
        )}

        {/* Botões de Ação */}
        <View style={styles.actions}>
          {passed && phaseUnlocked && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNextPhase}
            >
              <LinearGradient
                colors={['#FFA726', '#FF8A00']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>▶ Próxima Fase</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {!passed && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePlayAgain}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>🔄 Tentar Novamente</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePlayAgain}
          >
            <Text style={styles.secondaryButtonText}>🔄 Jogar Novamente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryButton}
            onPress={handleBackToMenu}
          >
            <Text style={styles.tertiaryButtonText}>← Voltar ao Menu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
  },
  passedBadge: {
    backgroundColor: 'rgba(15, 181, 126, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#0FB57E',
  },
  passedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0FB57E',
    fontFamily: 'Poppins-Bold',
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  failedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
    fontFamily: 'Poppins-Bold',
  },
  scoreCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scoreGradient: {
    padding: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Poppins-Medium',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  accuracyText: {
    fontSize: 18,
    color: '#0FB57E',
    fontFamily: 'Poppins-Bold',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
    alignItems: 'center',
  },
  achievementSuccess: {
    backgroundColor: 'rgba(15, 181, 126, 0.15)',
    borderLeftColor: '#0FB57E',
  },
  achievementWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftColor: '#EF4444',
  },
  achievementTitleSuccess: {
    color: '#0FB57E',
  },
  achievementTitleWarning: {
    color: '#EF4444',
  },
  achievementEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  tertiaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Medium',
  },
  bottomSpace: {
    height: 40,
  },
});

