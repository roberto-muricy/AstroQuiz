/**
 * QuestionCard Component
 * Card de pergunta do quiz
 */

import { Question } from '@/types';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Card } from './Card';
import api from '@/services/api';

interface QuestionCardProps {
  question: Question;
  selectedOption?: 'A' | 'B' | 'C' | 'D';
  correctOption?: 'A' | 'B' | 'C' | 'D';
  showResult?: boolean;
  onSelectOption?: (option: 'A' | 'B' | 'C' | 'D') => void;
  disabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOption,
  correctOption,
  showResult = false,
  onSelectOption,
  disabled = false,
}) => {
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUri = useMemo(() => {
    if (!question.imageUrl) return null;
    const raw = question.imageUrl.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw; // already absolute
    const base = api.getPublicBaseUrl();
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${base}${path}`;
  }, [question.imageUrl]);

  const renderOption = (
    option: 'A' | 'B' | 'C' | 'D',
    text: string,
  ) => {
    const isSelected = selectedOption === option;
    const hasCorrect = typeof correctOption !== 'undefined';
    const isCorrect = showResult && hasCorrect && correctOption === option;
    const isWrong = showResult && hasCorrect && isSelected && selectedOption !== correctOption;

    // Determinar o ícone a mostrar
    let icon = null;
    if (showResult) {
      if (isCorrect) {
        icon = <Text style={styles.resultIcon}>✓</Text>;
      } else if (isWrong) {
        icon = <Text style={styles.resultIconWrong}>✗</Text>;
      }
    }

    return (
      <TouchableOpacity
        key={option}
        onPress={() => !disabled && onSelectOption?.(option)}
        disabled={disabled || showResult}
        style={[
          styles.option,
          isSelected && !showResult && styles.optionSelected,
          isCorrect && styles.optionCorrect,
          isWrong && styles.optionWrong,
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.optionLetter,
            isSelected && !showResult && styles.optionLetterSelected,
            isCorrect && styles.optionLetterCorrect,
            isWrong && styles.optionLetterWrong,
          ]}
        >
          <Text style={styles.optionLetterText}>{option}</Text>
        </View>
        <Text style={[styles.optionText, (isCorrect || isWrong) && styles.optionTextBold]}>
          {text}
        </Text>
        {icon}
      </TouchableOpacity>
    );
  };

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.difficulty}>
          {[1, 2, 3, 4, 5].map(level => (
            <View
              key={level}
              style={[
                styles.star,
                level <= question.level && styles.starActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.topic}>{question.topic}</Text>
      </View>

      <Text style={styles.question}>{question.question}</Text>

      {/* Imagem da pergunta (se questionType === 'image') */}
      {imageUri && !imageError && (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: imageUri }}
            style={styles.questionImage}
            resizeMode="contain"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
          {imageLoading && (
            <View style={styles.imageOverlay}>
              <ActivityIndicator color="#FFA726" />
            </View>
          )}
        </View>
      )}

      <View style={styles.options}>
        {renderOption('A', question.optionA)}
        {renderOption('B', question.optionB)}
        {renderOption('C', question.optionC)}
        {renderOption('D', question.optionD)}
      </View>

      {/* Sempre mostrar explicação quando há resultado */}
      {showResult && typeof correctOption !== 'undefined' && question.explanation && (
        <View style={[
          styles.explanation,
          selectedOption === correctOption && styles.explanationSuccess
        ]}>
          <Text style={styles.explanationTitle}>
            {selectedOption === correctOption ? '✨ Ótimo trabalho!' : '💡 Explicação'}
          </Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficulty: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  starActive: {
    backgroundColor: '#FBF024',
  },
  topic: {
    fontSize: 12,
    color: '#FFA726',
    fontFamily: 'Poppins-Medium',
  },
  question: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 24,
    lineHeight: 26,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  imageWrap: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#FFA726',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
  },
  optionCorrect: {
    borderColor: '#0FB57E',
    backgroundColor: 'rgba(15, 181, 126, 0.1)',
  },
  optionWrong: {
    borderColor: '#DE2F24',
    backgroundColor: 'rgba(222, 47, 36, 0.1)',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterSelected: {
    backgroundColor: '#FFA726',
  },
  optionLetterCorrect: {
    backgroundColor: '#0FB57E',
  },
  optionLetterWrong: {
    backgroundColor: '#DE2F24',
  },
  optionLetterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    flex: 1,
  },
  optionTextBold: {
    fontWeight: 'bold',
  },
  resultIcon: {
    fontSize: 24,
    color: '#0FB57E',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultIconWrong: {
    fontSize: 24,
    color: '#DE2F24',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  explanation: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  explanationSuccess: {
    backgroundColor: 'rgba(15, 181, 126, 0.1)',
    borderLeftColor: '#0FB57E',
  },
  explanationTitle: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
});


