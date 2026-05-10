/**
 * QuestionCard Component
 * Card de pergunta do quiz
 */

import { Question } from '@/types';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Star, X } from 'lucide-react-native';
import { Card } from './Card';
import api from '@/services/api';

// Mapa de cor por nível (verde → vermelho conforme dificuldade aumenta)
const DIFFICULTY_COLORS: Record<number, { fg: string; bg: string }> = {
  1: { fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },   // Iniciante - verde
  2: { fg: '#84CC16', bg: 'rgba(132, 204, 22, 0.15)' },  // Fácil - lime
  3: { fg: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)' },   // Médio - amarelo
  4: { fg: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },  // Difícil - laranja
  5: { fg: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },   // Expert - vermelho
};

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
  const { t } = useTranslation();
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
    // Atenua opções "não-suas e não-corretas" quando o resultado é mostrado (estilo Duolingo)
    const isDimmed = showResult && hasCorrect && !isCorrect && !isWrong;

    // Ícone de resultado (Lucide, não unicode)
    let icon = null;
    if (showResult) {
      if (isCorrect) {
        icon = <Check size={22} color="#0FB57E" strokeWidth={3} />;
      } else if (isWrong) {
        icon = <X size={22} color="#DE2F24" strokeWidth={3} />;
      }
    }

    return (
      <Pressable
        key={option}
        onPress={() => !disabled && onSelectOption?.(option)}
        disabled={disabled || showResult}
        android_ripple={
          disabled || showResult
            ? null
            : { color: 'rgba(255, 167, 38, 0.2)', borderless: false }
        }
        style={({ pressed }) => [
          styles.option,
          isSelected && !showResult && styles.optionSelected,
          isCorrect && styles.optionCorrect,
          isWrong && styles.optionWrong,
          isDimmed && styles.optionDimmed,
          pressed && Platform.OS === 'ios' && !disabled && !showResult && styles.optionPressed,
        ]}
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
        <Text
          style={[
            styles.optionText,
            (isCorrect || isWrong) && styles.optionTextBold,
          ]}
        >
          {text}
        </Text>
        {icon}
      </Pressable>
    );
  };

  // Clamp level entre 1 e 5 para evitar erros se vier algo fora do range
  const level = Math.min(5, Math.max(1, question.level || 1));
  const difficultyColor = DIFFICULTY_COLORS[level];
  const difficultyLabel = t(`quiz.difficulty.${level}`);

  return (
    <Card>
      <View style={styles.header}>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: difficultyColor.bg, borderColor: difficultyColor.fg },
          ]}
        >
          <View style={styles.difficultyStars}>
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                size={10}
                color={difficultyColor.fg}
                fill={i <= level ? difficultyColor.fg : 'transparent'}
                strokeWidth={2}
              />
            ))}
          </View>
          <Text style={[styles.difficultyLabel, { color: difficultyColor.fg }]}>
            {difficultyLabel}
          </Text>
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
            {selectedOption === correctOption ? t('quiz.correct') : t('quiz.explanation')}
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
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  difficultyStars: {
    flexDirection: 'row',
    gap: 1,
  },
  difficultyLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
    flexShrink: 1,
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
    gap: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  optionSelected: {
    borderColor: '#FFA726',
    backgroundColor: 'rgba(255, 167, 38, 0.12)',
  },
  optionCorrect: {
    borderColor: '#0FB57E',
    backgroundColor: 'rgba(15, 181, 126, 0.12)',
  },
  optionWrong: {
    borderColor: '#DE2F24',
    backgroundColor: 'rgba(222, 47, 36, 0.12)',
  },
  // Outras opções (não a sua, não a correta) atenuadas quando o resultado é mostrado
  optionDimmed: {
    opacity: 0.4,
  },
  // Feedback de pressionado no iOS (Android usa android_ripple)
  optionPressed: {
    backgroundColor: 'rgba(255, 167, 38, 0.08)',
    transform: [{ scale: 0.98 }],
  },
  optionLetter: {
    width: 36,
    height: 36,
    minWidth: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  // FIX: em RN com fonte customizada, fontWeight é ignorado.
  // Para deixar bold tem que trocar a fontFamily.
  optionTextBold: {
    fontFamily: 'Poppins-Bold',
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
    flexShrink: 1,
  },
});


