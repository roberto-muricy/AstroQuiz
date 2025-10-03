/**
 * StatsScreen
 * Tela de estatísticas do usuário
 */

import { Card, ProgressBar } from '@/components';
import { useApp } from '@/contexts/AppContext';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const StatsScreen = () => {
  const { user } = useApp();

  return (
    <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Minhas Estatísticas</Text>

        {/* Resumo Geral */}
        <Card>
          <Text style={styles.cardTitle}>Resumo Geral</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2.450</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>7</Text>
              <Text style={styles.statLabel}>Nível Atual</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Sequência</Text>
            </View>
          </View>
        </Card>

        {/* Progresso */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Progresso nos Níveis</Text>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Nível 7 - Marés</Text>
            <ProgressBar progress={60} />
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Total Completado</Text>
            <ProgressBar progress={35} />
          </View>
        </Card>

        {/* Desempenho */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Desempenho</Text>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>85%</Text>
              <Text style={styles.performanceLabel}>Taxa de Acerto</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>15s</Text>
              <Text style={styles.performanceLabel}>Tempo Médio</Text>
            </View>
          </View>
        </Card>

        {/* Conquistas */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Conquistas</Text>
          <View style={styles.achievementsList}>
            <View style={styles.achievementItem}>
              <Text style={styles.achievementEmoji}>🏆</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Primeira Vitória</Text>
                <Text style={styles.achievementDesc}>Complete seu primeiro nível</Text>
              </View>
            </View>
            <View style={styles.achievementItem}>
              <Text style={styles.achievementEmoji}>🔥</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Sequência Incrível</Text>
                <Text style={styles.achievementDesc}>10 dias consecutivos</Text>
              </View>
            </View>
            <View style={styles.achievementItem}>
              <Text style={styles.achievementEmoji}>⭐</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Perfeccionista</Text>
                <Text style={styles.achievementDesc}>Complete um nível sem erros</Text>
              </View>
            </View>
          </View>
        </Card>

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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 24,
  },
  card: {
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  progressItem: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    marginBottom: 8,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0FB57E',
    fontFamily: 'Poppins-Bold',
  },
  performanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  achievementsList: {
    gap: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementEmoji: {
    fontSize: 32,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  achievementDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  bottomSpace: {
    height: 100,
  },
});


