/**
 * QuizScreen
 * Tela de gameplay do quiz
 */

import { Button, QuestionCard } from '@/components';
import quizService from '@/services/quizService';
import { CurrentQuestion } from '@/types';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const QuizScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sessionId } = route.params as { sessionId: string; phaseNumber: number };

  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    loadQuestion();
  }, []);

  useEffect(() => {
    if (!showResult && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !showResult) {
      handleTimeout();
    }
  }, [timeRemaining, showResult]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const question = await quizService.getCurrentQuestion(sessionId);
      setCurrentQuestion(question);
      setTimeRemaining(Math.floor(question.timePerQuestion / 1000));
      setSelectedOption(null);
      setShowResult(false);
    } catch (error) {
      console.error('Erro ao carregar pergunta:', error);
      Alert.alert('Erro', 'Não foi possível carregar a pergunta');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeout = async () => {
    if (!currentQuestion || showResult) return;
    
    try {
      await quizService.submitAnswer(
        sessionId,
        selectedOption || 'A',
        currentQuestion.timePerQuestion,
      );
      Alert.alert('Tempo esgotado!', 'Você não respondeu a tempo.');
      await loadNextQuestion();
    } catch (error) {
      console.error('Erro ao processar timeout:', error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentQuestion) return;

    setShowResult(true);
    
    try {
      const timeUsed = currentQuestion.timePerQuestion - (timeRemaining * 1000);
      const result = await quizService.submitAnswer(sessionId, selectedOption, timeUsed);
      
      // Mostrar resultado por 2 segundos
      setTimeout(async () => {
        if (result.sessionStatus.isPhaseComplete) {
          navigation.navigate('QuizResult', { sessionId });
        } else {
          await loadNextQuestion();
        }
      }, 2000);
    } catch (error) {
      console.error('Erro ao submeter resposta:', error);
      Alert.alert('Erro', 'Não foi possível enviar a resposta');
      setShowResult(false);
    }
  };

  const loadNextQuestion = async () => {
    await loadQuestion();
  };

  if (!currentQuestion) {
    return (
      <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            Pergunta {currentQuestion.questionIndex}/{currentQuestion.totalQuestions}
          </Text>
        </View>
        <View style={styles.timer}>
          <Text style={[styles.timerText, timeRemaining < 10 && styles.timerDanger]}>
            ⏱️ {timeRemaining}s
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{currentQuestion.currentScore} pts</Text>
          {currentQuestion.currentStreak > 0 && (
            <Text style={styles.streakText}>🔥 {currentQuestion.currentStreak}</Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <QuestionCard
          question={currentQuestion.question}
          selectedOption={selectedOption || undefined}
          correctOption={showResult ? currentQuestion.question.correctOption : undefined}
          showResult={showResult}
          onSelectOption={setSelectedOption}
          disabled={showResult}
        />

        {!showResult && (
          <Button
            title="Confirmar Resposta"
            onPress={handleSubmitAnswer}
            disabled={!selectedOption || loading}
            loading={loading}
            size="large"
            style={styles.submitButton}
          />
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  questionCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  questionCounterText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  timer: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  timerDanger: {
    color: '#DE2F24',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0FB57E',
    fontFamily: 'Poppins-Bold',
  },
  streakText: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  submitButton: {
    marginTop: 20,
  },
});


