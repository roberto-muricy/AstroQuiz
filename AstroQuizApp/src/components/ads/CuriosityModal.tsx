/**
 * CuriosityModal - Modal para exibir explicação/curiosidade sobre a pergunta
 * Mostra após o usuário assistir um rewarded ad (ou direto se Pro)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/design-system';

interface CuriosityModalProps {
  visible: boolean;
  explanation: string | null;
  questionText?: string;
  onClose: () => void;
}

export const CuriosityModal: React.FC<CuriosityModalProps> = ({
  visible,
  explanation,
  questionText,
  onClose,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const displayText = explanation || t('ads.noExplanation');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modal,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <View style={styles.iconContainer}>
                    <Lightbulb size={24} color={COLORS.warning} fill={COLORS.warning} />
                  </View>
                  <Text style={styles.title}>{t('ads.curiosityModalTitle')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Question context (optional) */}
              {questionText && (
                <View style={styles.questionContext}>
                  <Text style={styles.questionLabel}>{t('quiz.question')}:</Text>
                  <Text style={styles.questionText} numberOfLines={2}>
                    {questionText}
                  </Text>
                </View>
              )}

              {/* Explanation content */}
              <ScrollView
                style={styles.contentScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.explanation}>{displayText}</Text>
              </ScrollView>

              {/* Close button */}
              <TouchableOpacity
                style={styles.gotItButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.gotItText}>{t('ads.curiosityModalClose')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionContext: {
    backgroundColor: COLORS.backgroundHighlight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  questionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
  },
  questionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  contentScroll: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  explanation: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  gotItButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  gotItText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
});

export default CuriosityModal;
