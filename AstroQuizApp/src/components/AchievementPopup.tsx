/**
 * AchievementPopup
 * Modal animado para mostrar conquistas desbloqueadas
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import soundService from '@/services/soundService';

interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
}

interface AchievementPopupProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({
  visible,
  achievement,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Som e vibração
      soundService.playUnlock();
      
      // Animação de entrada
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible, achievement]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!achievement) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFA726', '#FF8A00', '#F57C00']}
            style={styles.gradient}
          >
            {/* Icon animado */}
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ rotate }] },
              ]}
            >
              <Text style={styles.icon}>{achievement.icon}</Text>
            </Animated.View>

            {/* Título */}
            <View style={styles.shine} />
            <Text style={styles.title}>Conquista Desbloqueada!</Text>
            
            {/* Nome da achievement */}
            <Text style={styles.achievementName}>{achievement.name}</Text>
            
            {/* Descrição */}
            <Text style={styles.description}>{achievement.description}</Text>
            
            {/* XP Reward */}
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+{achievement.xpReward} XP</Text>
            </View>

            {/* Botão fechar */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Continuar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  icon: {
    fontSize: 56,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewY: '-15deg' }],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  achievementName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  rewardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  rewardText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
});
