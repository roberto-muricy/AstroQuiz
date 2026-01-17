/**
 * QuizResultScreen
 * Tela de resultados após completar uma fase do quiz
 */

import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
import { checkAchievements, getPlayerLevel, getXPToNextLevel, calculateStarRating, getUnlockRequirement, estimatePhaseXP } from '@/utils/progressionSystem';
import soundService from '@/services/soundService';
import { AchievementPopup } from '@/components';
import { useApp } from '@/contexts/AppContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import quizService from '@/services/quizService';
import { useTranslation } from 'react-i18next';

export const QuizResultScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuizResult'>>();
  const { sessionId, usedQuestionIds = [] } = route.params;
  const { locale } = useApp();
  const { t } = useTranslation();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phaseUnlocked, setPhaseUnlocked] = useState(false);
  const [startingNextPhase, setStartingNextPhase] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;
  const [levelUpInfo, setLevelUpInfo] = useState<{
    from: number;
    to: number;
    title: string;
    icon: string;
  } | null>(null);
  const [stars, setStars] = useState(0);
  const [unlockRequirement, setUnlockRequirement] = useState<{ requiredAccuracy: number; specialRequirement?: string } | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [levelTitle, setLevelTitle] = useState('');
  const [xpToNext, setXpToNext] = useState(0);

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
      const computedStars = calculateStarRating(data.correctAnswers || 0, data.totalQuestions || 10);
      setStars(computedStars);
      setUnlockRequirement(getUnlockRequirement((data.phaseNumber || 1) + 1));
      
      const isPerfect = accuracy === 100;

      // Se passou na fase (60%+), desbloquear próxima
      if (data.passed && data.phaseNumber) {
        const prevProgress = await ProgressStorage.getProgress();
        const prevLevel = getPlayerLevel(prevProgress.stats.totalXP);

        const updated = await ProgressStorage.updateAfterPhase({
          phaseNumber: data.phaseNumber,
          correctAnswers: data.correctAnswers || 0,
          totalQuestions: data.totalQuestions || 10,
          maxStreak: data.maxStreak || 0,
          totalTimeMs: data.totalTime,
          score: data.finalScore || data.score,
          questionIds: usedQuestionIds,
        });
        
        const currentLevel = getPlayerLevel(updated.stats.totalXP);
        setTotalXP(updated.stats.totalXP);
        setLevelTitle(`${currentLevel.icon} ${currentLevel.title}`);
        setXpToNext(getXPToNextLevel(updated.stats.totalXP));
        setPhaseUnlocked(updated.unlockedPhases > data.phaseNumber);

        if (currentLevel.level > prevLevel.level) {
          triggerLevelUp(prevLevel.level, currentLevel);
        }
        
        // Verificar achievements desbloqueados
        const unlockedAchievementIds = updated.stats.achievements || [];
        const newlyUnlocked = checkAchievements(updated.stats, unlockedAchievementIds);
        
        if (newlyUnlocked.length > 0) {
          setNewAchievements(newlyUnlocked);
          // Salvar achievements desbloqueados
          const updatedStats = {
            ...updated.stats,
            achievements: [...unlockedAchievementIds, ...newlyUnlocked.map(a => a.id)],
          };
          await ProgressStorage.saveProgress({ ...updated, stats: updatedStats });
          
          // Mostrar primeiro achievement após 1s
          setTimeout(() => {
            setCurrentAchievementIndex(0);
            setShowAchievementPopup(true);
          }, 1000);
        }
        
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
      if (startingNextPhase) return;
      setStartingNextPhase(true);
      if (sessionData?.phaseNumber) {
        const newSession = await quizService.startQuiz(sessionData.phaseNumber, locale);
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' },
            {
              name: 'QuizGame',
              params: { phaseNumber: sessionData.phaseNumber, sessionId: newSession.sessionId },
            },
          ],
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar novo quiz:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o quiz.');
    } finally {
      setStartingNextPhase(false);
    }
  };

  const handleNextPhase = async () => {
    try {
      if (startingNextPhase) return;
      setStartingNextPhase(true);
      const nextPhase = (sessionData?.phaseNumber || 1) + 1;
      const newSession = await quizService.startQuiz(nextPhase, locale);
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: 'QuizGame',
            params: { phaseNumber: nextPhase, sessionId: newSession.sessionId },
          },
        ],
      });
    } catch (error) {
      console.error('Erro ao iniciar próxima fase:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a próxima fase.');
    } finally {
      setStartingNextPhase(false);
    }
  };

  const handleBackToMenu = () => {
    // Voltar para a tela principal (tabs)
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const triggerLevelUp = (fromLevel: number, toLevel: { level: number; title: string; icon: string }) => {
    setLevelUpInfo({
      from: fromLevel,
      to: toLevel.level,
      title: toLevel.title,
      icon: toLevel.icon,
    });
    levelUpScale.setValue(0.4);
    levelUpOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(levelUpScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(levelUpOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLevelUp = () => {
    Animated.timing(levelUpOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setLevelUpInfo(null));
  };

  const handleAchievementClose = () => {
    setShowAchievementPopup(false);
    
    // Se houver mais achievements, mostrar o próximo após 500ms
    if (currentAchievementIndex < newAchievements.length - 1) {
      setTimeout(() => {
        setCurrentAchievementIndex(currentAchievementIndex + 1);
        setShowAchievementPopup(true);
      }, 500);
    }
  };

  if (loading || !sessionData) {
    return (
      <LinearGradient
        colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']}
        style={styles.container}
      >
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{t('result.calculatingResults')}</Text>
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
      <SafeAreaView style={styles.safeArea}>
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
              {isPerfect ? t('result.perfect') : isGreat ? t('result.excellent') : isGood ? t('result.veryGood') : t('result.keepTrying')}
            </Text>
            <Text style={styles.subtitle}>
              {passed
                ? t('result.phaseCompleted', { phase: sessionData.phaseNumber })
                : t('result.phaseIncomplete', { phase: sessionData.phaseNumber })}
            </Text>
          <View style={styles.starRow}>
            {[1,2,3].map((s)=>(
              <Text key={s} style={styles.star}>{s <= stars ? '⭐' : '☆'}</Text>
            ))}
          </View>
          {levelTitle ? (
            <View style={styles.levelRow}>
              <Text style={styles.levelText}>{levelTitle}</Text>
              <Text style={styles.levelSubText}>
                {xpToNext > 0 ? t('result.xpToNext', { xp: xpToNext }) : t('result.maxLevel')}
              </Text>
            </View>
          ) : null}
            
            {/* Badge de Passou/Não Passou */}
            {passed ? (
              <View style={styles.passedBadge}>
                <Text style={styles.passedText}>{t('result.approved')}</Text>
              </View>
            ) : (
              <View style={styles.failedBadge}>
                <Text style={styles.failedText}>{t('result.required')}</Text>
              </View>
            )}
          </Animated.View>

        {/* Card de Pontuação Principal */}
        <View style={styles.scoreCard}>
          <LinearGradient
            colors={['#5A5A9C', '#4A4A7C']}
            style={styles.scoreGradient}
          >
            <Text style={styles.scoreLabel}>{t('result.finalScore')}</Text>
            <Text style={styles.scoreValue}>{sessionData.finalScore || sessionData.score || 0}</Text>
            <Text style={styles.accuracyText}>{t('result.accuracy', { percent: accuracy })}</Text>
          </LinearGradient>
        </View>

        {/* Estatísticas Detalhadas */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>✅</Text>
              <Text style={styles.statValue}>{sessionData.correctAnswers || 0}</Text>
              <Text style={styles.statLabel}>{t('result.correct_plural')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>❌</Text>
              <Text style={styles.statValue}>{sessionData.incorrectAnswers || 0}</Text>
              <Text style={styles.statLabel}>{t('result.incorrect_plural')}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{sessionData.maxStreak || 0}</Text>
              <Text style={styles.statLabel}>{t('result.maxStreak')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⏱️</Text>
              <Text style={styles.statValue}>
                {Math.round((sessionData.totalTime || 180000) / 1000)}s
              </Text>
              <Text style={styles.statLabel}>{t('result.totalTime')}</Text>
            </View>
          </View>
        </View>

        {/* Performance Breakdown */}
        {isPerfect && (
          <View style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>👑</Text>
            <Text style={styles.achievementTitle}>{t('result.perfectScore')}</Text>
            <Text style={styles.achievementText}>
              {t('result.allCorrect')}
              {'\n'}{t('result.perfectBonus')}
            </Text>
          </View>
        )}
        
        {sessionData.maxStreak >= 10 && (
          <View style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>🔥</Text>
            <Text style={styles.achievementTitle}>{t('result.streakMaster')}</Text>
            <Text style={styles.achievementText}>
              {t('result.consecutiveCorrect', { count: sessionData.maxStreak })}
            </Text>
          </View>
        )}

        {phaseUnlocked && passed && (
          <View style={[styles.achievementCard, styles.achievementSuccess]}>
            <Text style={styles.achievementEmoji}>🎉</Text>
            <Text style={[styles.achievementTitle, styles.achievementTitleSuccess]}>
              {t('result.newPhaseUnlocked')}
            </Text>
            <Text style={styles.achievementText}>
              {t('result.phaseAvailable', { phase: sessionData.phaseNumber + 1 })}
            </Text>
          </View>
        )}
        {!phaseUnlocked && unlockRequirement && (
          <View style={[styles.achievementCard, styles.achievementWarning]}>
            <Text style={styles.achievementEmoji}>🔒</Text>
            <Text style={[styles.achievementTitle, styles.achievementTitleWarning]}>
              {t('result.nextPhaseRequirement')}
            </Text>
            <Text style={styles.achievementText}>
              {t('result.minAccuracy', { percent: unlockRequirement.requiredAccuracy })} {unlockRequirement.specialRequirement ? `• ${unlockRequirement.specialRequirement}` : ''}
            </Text>
          </View>
        )}

        {!passed && (
          <View style={[styles.achievementCard, styles.achievementWarning]}>
            <Text style={styles.achievementEmoji}>💪</Text>
            <Text style={[styles.achievementTitle, styles.achievementTitleWarning]}>
              {t('result.keepPracticing')}
            </Text>
            <Text style={styles.achievementText}>
              {t('result.need60')}
              {'\n'}{t('result.tryAgainConquer')}
            </Text>
          </View>
        )}

        {/* Botões de Ação */}
        <View style={styles.actions}>
          {passed && phaseUnlocked && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNextPhase}
              disabled={startingNextPhase}
            >
              <LinearGradient
                colors={['#FFA726', '#FF8A00']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{t('result.nextPhase')}</Text>
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
                <Text style={styles.buttonText}>{t('result.tryAgain')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePlayAgain}
            disabled={startingNextPhase}
          >
            <Text style={styles.secondaryButtonText}>{t('result.playAgain')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryButton}
            onPress={handleBackToMenu}
          >
            <Text style={styles.tertiaryButtonText}>{t('result.backToMenu')}</Text>
          </TouchableOpacity>
        </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      {levelUpInfo && (
        <Animated.View style={[styles.levelUpOverlay, { opacity: levelUpOpacity }]}>
          <Animated.View style={[styles.levelUpCard, { transform: [{ scale: levelUpScale }] }]}>
            <Text style={styles.levelUpIcon}>🎉</Text>
            <Text style={styles.levelUpTitle}>{t('result.levelUp')}</Text>
            <Text style={styles.levelUpSubtitle}>
              {t('result.levelUpFrom', { from: levelUpInfo.from, to: levelUpInfo.to })}
            </Text>
            <Text style={styles.levelUpBadge}>{levelUpInfo.icon} {levelUpInfo.title}</Text>
            <TouchableOpacity style={styles.levelUpButton} onPress={closeLevelUp} activeOpacity={0.85}>
              <Text style={styles.levelUpButtonText}>{t('common.continue')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Achievement Popup */}
      {newAchievements.length > 0 && (
        <AchievementPopup
          visible={showAchievementPopup}
          achievement={newAchievements[currentAchievementIndex]}
          onClose={handleAchievementClose}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
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
    // Extra breathing room so the trophy/emoji doesn't hug the notch even on devices with smaller safe areas.
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  star: {
    fontSize: 22,
    color: '#FFD700',
    marginHorizontal: 4,
  },
  levelRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  levelSubText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
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
  levelUpOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  levelUpCard: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: '#1F2539',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  levelUpIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  levelUpTitle: {
    fontSize: 28,
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  levelUpSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginBottom: 10,
  },
  levelUpBadge: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 20,
  },
  levelUpButton: {
    backgroundColor: '#FFA726',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  levelUpButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
});

