/**
 * HomeScreen
 * Tela principal do app baseada no design do Figma
 */

import { Button, Card, LevelCard } from '@/components';
import { useApp } from '@/contexts/AppContext';
import { Images } from '@/assets';
import quizService from '@/services/quizService';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import React, { useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, locale } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [userLevel, setUserLevel] = useState(7);
  const [userXP, setUserXP] = useState(2450);
  const [streak, setStreak] = useState(12);

  const onRefresh = async () => {
    setRefreshing(true);
    // Carregar dados atualizados
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleStartQuiz = async (phaseNumber: number) => {
    try {
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
    }
  };

  return (
    <LinearGradient
      colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>
              Bem-vindo de volta, {user?.name || 'Astronauta'}!
            </Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak} dias seguidos</Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🚀</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{userLevel}</Text>
            </View>
          </View>
        </View>

        {/* Daily Challenge */}
        <TouchableOpacity style={styles.dailyChallenge}>
          <Card variant="daily-challenge">
            <View style={styles.dailyChallengeContent}>
              <View style={styles.dailyChallengeIcon}>
                <Image 
                  source={Images.target} 
                  style={styles.challengeImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.dailyChallengeInfo}>
                <Text style={styles.dailyChallengeTitle}>Desafio diário</Text>
                <Text style={styles.dailyChallengeSubtitle}>
                  Complete 20 perguntas
                </Text>
              </View>
              <View style={styles.dailyChallengeBadge}>
                <Text style={styles.dailyChallengeBadgeText}>+150 xp</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Main Level Card */}
        <Card style={styles.mainLevelCard}>
          <View style={styles.mainLevelHeader}>
            <View>
              <Text style={styles.mainLevelTitle}>Nível {userLevel} - Marés</Text>
              <Text style={styles.mainLevelSubtitle}>Explorador Intermediário</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>{userXP}xp</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]}>
                <LinearGradient
                  colors={['#FFA726', '#FFB74D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                >
                  <View style={styles.progressThumb} />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>60%</Text>
                <Text style={styles.statLabel}>Progresso</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>6/10</Text>
                <Text style={styles.statLabel}>Perguntas</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>20xp</Text>
                <Text style={styles.statLabel}>Para nível 8</Text>
              </View>
            </View>
          </View>

          <Button
            title="Continuar de onde parou"
            onPress={() => handleStartQuiz(userLevel)}
            size="large"
            style={styles.continueButton}
          />
        </Card>

        {/* Weekly Ranking */}
        <TouchableOpacity>
          <Card>
            <View style={styles.weeklyRanking}>
              <View style={styles.rankingBadge}>
                <Text style={styles.rankingBadgeText}>#20</Text>
              </View>
              <View style={styles.rankingContent}>
                <Text style={styles.rankingTitle}>Ranking Semanal</Text>
                <Text style={styles.rankingSubtitle}>
                  Você subiu 8 posições essa semana!
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Progress Section */}
        <View style={styles.progressLevelsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progresso nos níveis</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.levelCardsRow}>
            <LevelCard
              levelNumber={7}
              levelName="Marés"
              subtitle="Iniciante"
              progress={60}
              questionsCompleted={6}
              totalQuestions={10}
              xp={60}
              stars={2}
              isActive
              onPress={() => handleStartQuiz(7)}
            />
            <LevelCard
              levelNumber={8}
              levelName="Atmosfera"
              subtitle="Intermediário"
              progress={0}
              questionsCompleted={0}
              totalQuestions={10}
              xp={0}
              stars={0}
              isLocked
            />
          </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1A2E',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  dailyChallenge: {
    marginBottom: 20,
  },
  dailyChallengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyChallengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  challengeImage: {
    width: 32,
    height: 32,
  },
  dailyChallengeInfo: {
    flex: 1,
  },
  dailyChallengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  dailyChallengeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  dailyChallengeBadge: {
    backgroundColor: '#FFA726',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dailyChallengeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  mainLevelCard: {
    marginBottom: 20,
  },
  mainLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mainLevelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  mainLevelSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 2,
  },
  progressThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  continueButton: {
    width: '100%',
  },
  weeklyRanking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankingBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  rankingContent: {
    flex: 1,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  rankingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  progressLevelsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  sectionLink: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  levelCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomSpace: {
    height: 100,
  },
});

