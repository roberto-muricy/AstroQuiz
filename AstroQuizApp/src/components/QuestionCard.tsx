/**
 * QuestionCard Component
 * Card de pergunta do quiz
 */

import { Question } from '@/types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from './Card';

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
  const renderOption = (
    option: 'A' | 'B' | 'C' | 'D',
    text: string,
  ) => {
    const isSelected = selectedOption === option;
    const isCorrect = showResult && correctOption === option;
    const isWrong = showResult && isSelected && selectedOption !== correctOption;

    return (
      <TouchableOpacity
        key={option}
        onPress={() => !disabled && onSelectOption?.(option)}
        disabled={disabled || showResult}
        style={[
          styles.option,
          isSelected && styles.optionSelected,
          isCorrect && styles.optionCorrect,
          isWrong && styles.optionWrong,
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.optionLetter,
            isSelected && styles.optionLetterSelected,
            isCorrect && styles.optionLetterCorrect,
            isWrong && styles.optionLetterWrong,
          ]}
        >
          <Text style={styles.optionLetterText}>{option}</Text>
        </View>
        <Text style={styles.optionText}>{text}</Text>
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

      <View style={styles.options}>
        {renderOption('A', question.optionA)}
        {renderOption('B', question.optionB)}
        {renderOption('C', question.optionC)}
        {renderOption('D', question.optionD)}
      </View>

      {showResult && question.explanation && (
        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>💡 Explicação</Text>
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
  explanation: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
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


