/**
 * QuizScreen - Refatorada
 * Tela de gameplay do quiz
 *
 * Melhorias UX:
 * - Safe area insets para padding do header
 * - Botão "Próxima" após mostrar resultado (sem avanço forçado aos 3s)
 * - Auto-advance suave em 6s se o usuário não tocar
 * - Timeout mostra banner de resultado inline (sem Alert)
 * - Indicadores de progresso (dots) para as 10 perguntas
 * - Timer exibe número de segundos restantes
 * - i18n para strings hardcoded do QuestionCard
 */

import { QuestionCard } from '@/components';
import { RewardedAdButton } from '@/components/ads';
import { useAds } from '@/contexts/AdsContext';
import quizService from '@/services/quizService';
import soundService from '@/services/soundService';
import { CurrentQuestion, RootStackParamList } from '@/types';
import { useNavigation, useRoute, NavigationProp, RouteProp, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from '@/constants/design-system';
import { Flame, CheckCircle, XCircle, Clock, SkipForward } from 'lucide-react-native';

// Cor do timer baseada no tempo restante
const getTimerColor = (timeRemaining: number, totalTime: number): string => {
  const percentage = timeRemaining / totalTime;
  if (percentage > 0.6) return '#22C55E';
  if (percentage > 0.4) return '#EAB308';
  if (percentage > 0.2) return '#F97316';
  return '#EF4444';
};

// Segundo a partir do qual a contagem regressiva fica audível (a barra do
// tempo já está vermelha nos últimos 20% = 6 s de 30 s).
const COUNTDOWN_FROM = 6;

type QuestionResult = 'correct' | 'wrong' | 'timeout' | 'skipped';

export const QuizScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuizGame'>>();
  const { sessionId } = route.params as { sessionId: string; phaseNumber: number };
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { resetPhaseCounters } = useAds();

  // Oculta a barra de status (relógio/wifi/bateria) durante o jogo para maior imersão.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setHidden(true, 'fade');
      return () => StatusBar.setHidden(false, 'fade');
    }, [])
  );

  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  // Verdadeiro enquanto o anúncio do pulo está na tela. Congela o cronômetro:
  // um vídeo premiado dura até 30 s e a pergunta expiraria por baixo dele.
  const [skipEmCurso, setSkipEmCurso] = useState(false);
  // O envio da pergunta ao servidor falhou. O banner fica, e no lugar de
  // "Próxima" aparece "Tentar novamente".
  const [falhaEnvio, setFalhaEnvio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [canAdvance, setCanAdvance] = useState(false);
  // Contagem visível do auto-avanço (apenas em acertos); null = sem auto-avanço
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);

  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref para o resultado mais recente (evita closure stale no timer de auto-advance)
  const latestResultRef = useRef<any>(null);
  // IDs das perguntas servidas nesta fase, para registrar e evitar repetição depois.
  const usedQuestionIdsRef = useRef<number[]>([]);
  // Ref para auto-scroll até a explicação quando o resultado chega
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setCurrentScore(0);
    setCurrentStreak(0);
    setQuestionResults([]);
    // Fase nova, cota de pulos do Pro zerada.
    resetPhaseCounters();
    loadQuestion();

    return () => {
      clearAllTimers();
    };
  }, [sessionId]);

  // Auto-scroll suave até a explicação/resultado quando a resposta chega do servidor.
  // Garante que a explicação não fique abaixo da dobra em perguntas longas.
  useEffect(() => {
    if (showResult && answerResult) {
      const id = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 250);
      return () => clearTimeout(id);
    }
  }, [showResult, answerResult]);

  useEffect(() => {
    if (skipEmCurso) return;

    if (!showResult && timeRemaining > 0) {
      // Contagem regressiva audível nos 6 s finais — a faixa em que a barra
      // do tempo já está vermelha. Toca em 6, 5, 4, 3, 2 e 1.
      if (timeRemaining <= COUNTDOWN_FROM) {
        soundService.playTick();
      }
      const timer = setTimeout(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !showResult) {
      handleTimeout();
    }
  }, [timeRemaining, showResult, skipEmCurso]);

  const clearAllTimers = () => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
  };

  // Auto-avanço com contagem visível — usado APENAS em respostas corretas.
  // Em erros/timeout a tela fica parada até o usuário tocar em "Próxima".
  const AUTO_ADVANCE_SECONDS = 4;
  const startAutoAdvance = (result: any) => {
    setAutoAdvanceCountdown(AUTO_ADVANCE_SECONDS);
    autoAdvanceIntervalRef.current = setInterval(() => {
      setAutoAdvanceCountdown(prev => (prev && prev > 1 ? prev - 1 : prev));
    }, 1000);
    autoAdvanceTimerRef.current = setTimeout(() => {
      handleNextQuestion(result);
    }, AUTO_ADVANCE_SECONDS * 1000);
  };

  // Cancela o auto-avanço (qualquer interação do usuário enquanto lê a explicação)
  const cancelAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
    setAutoAdvanceCountdown(null);
  };

  const loadQuestion = async () => {
    try {
      setLoading(true);
      clearAllTimers();
      const question = await quizService.getCurrentQuestion(sessionId);
      setCurrentQuestion(question);
      setTimeRemaining(Math.floor(question.timePerQuestion / 1000));
      setSelectedOption(null);
      setShowResult(false);
      setAnswerResult(null);
      setIsTimedOut(false);
      setIsSkipped(false);
      setFalhaEnvio(false);
      setAutoSubmitCountdown(null);
      setCanAdvance(false);
    } catch (error) {
      console.error('Erro ao carregar pergunta:', error);
      Alert.alert(t('common.error'), t('errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (showResult) return;

    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    soundService.playSelect();
    setSelectedOption(option);
    setAutoSubmitCountdown(null);

    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 700 - elapsed);
      setAutoSubmitCountdown(remaining);
      if (remaining === 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 50);

    submitTimerRef.current = setTimeout(() => {
      handleSubmitAnswer(option);
    }, 700);
  };

  const handleTimeout = async () => {
    if (!currentQuestion || showResult) return;
    // Um pulo em andamento tem precedência sobre o tempo esgotado. O congelar
    // do cronômetro já cobre o caso normal, mas entre o toque em "Pular" e o
    // congelamento entrar em vigor cabe um quadro de tela — e o jogador
    // perderia o pulo (já debitado) e a pergunta de uma vez só.
    if (skipEmCurso) return;

    // Mostra o banner de resultado imediatamente (antes de chamar o servidor)
    setShowResult(true);
    setIsTimedOut(true);
    await registrarTimeout();
  };

  /**
   * Registra no servidor a pergunta cujo tempo esgotou.
   *
   * Separado de handleTimeout para que o botão "Tentar novamente" possa
   * repetir só o envio, sem remontar o banner.
   */
  const registrarTimeout = async () => {
    if (!currentQuestion) return;
    setFalhaEnvio(false);

    try {
      const timeUsed = currentQuestion.timePerQuestion;
      const timeoutQuestionId = currentQuestion.question?.id;
      if (timeoutQuestionId) usedQuestionIdsRef.current.push(timeoutQuestionId);
      // O 5º argumento é obrigatório: sem ele o servidor compara a opção
      // enviada ('A', de placeholder) com a correta, e deixar o tempo acabar
      // pontuava como acerto sempre que a resposta certa era a letra A.
      const result = await quizService.submitAnswer(
        sessionId,
        selectedOption || 'A',
        timeUsed,
        timeoutQuestionId,
        true
      );

      latestResultRef.current = result;
      setAnswerResult(result);
      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);
      setQuestionResults(prev => [...prev, 'timeout']);
      setCanAdvance(true);

      soundService.playTimeout();
      // Tempo esgotado conta como erro: NÃO avança sozinho — usuário lê a explicação
    } catch (error) {
      // Este catch desfazia showResult. Como o cronômetro continuava em zero,
      // o efeito chamava handleTimeout no mesmo instante, que falhava de novo:
      // um laço que deixava o jogador preso num banner "Tempo esgotado!" sem
      // botão nenhum, sem sequer saber que algo tinha falhado.
      //
      // Agora a falha fica visível e oferece nova tentativa. O banner
      // permanece, então o efeito do cronômetro não volta a disparar.
      console.error('Erro ao registrar tempo esgotado:', error);
      setFalhaEnvio(true);
      setCanAdvance(false);
    }
  };

  const handleSubmitAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;

    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setAutoSubmitCountdown(null);
    setShowResult(true);

    try {
      const timeUsed = currentQuestion.timePerQuestion - (timeRemaining * 1000);
      const questionId = currentQuestion.question?.id;
      if (questionId) usedQuestionIdsRef.current.push(questionId);

      const result = await quizService.submitAnswer(sessionId, option, timeUsed, questionId);

      latestResultRef.current = result;
      setAnswerResult(result);
      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);
      setQuestionResults(prev => [
        ...prev,
        result.answerRecord.isCorrect ? 'correct' : 'wrong',
      ]);

      setCanAdvance(true);

      if (result.answerRecord.isCorrect) {
        soundService.playCorrect();
        // Acertou: avança sozinho (com contagem visível e cancelável)
        startAutoAdvance(result);
      } else {
        soundService.playIncorrect();
        // Errou: NÃO avança sozinho — usuário lê a explicação no próprio ritmo
      }
    } catch (error) {
      console.error('Erro ao submeter resposta:', error);
      Alert.alert(t('common.error'), t('errors.tryAgainLater'));
      setShowResult(false);
      setSelectedOption(null);
    }
  };

  /**
   * Pular a pergunta atual.
   *
   * Chamado pelo RewardedAdButton depois que a recompensa é concedida — o
   * anúncio (ou o atalho do Pro) já aconteceu, e o contador de uso já subiu.
   *
   * O pulo custa a pergunta: vai ao servidor como não-respondida, então não dá
   * pontos, zera a sequência e continua contando entre as 10. Quem pula 3 fica
   * limitado a 70% na fase e nunca faz uma fase perfeita — é esse custo que
   * impede o pulo de virar atalho para as fases Elite.
   */
  const handleSkip = async () => {
    if (!currentQuestion || showResult) return;

    clearAllTimers();
    setSkipEmCurso(false);
    setAutoSubmitCountdown(null);
    setShowResult(true);
    setIsSkipped(true);

    try {
      const timeUsed = currentQuestion.timePerQuestion - timeRemaining * 1000;
      const questionId = currentQuestion.question?.id;
      if (questionId) usedQuestionIdsRef.current.push(questionId);

      const result = await quizService.submitAnswer(
        sessionId,
        selectedOption || 'A',
        timeUsed,
        questionId,
        true,
        true
      );

      latestResultRef.current = result;
      setAnswerResult(result);
      setCurrentScore(result.sessionStatus.score);
      setCurrentStreak(result.sessionStatus.streakCount);
      setQuestionResults(prev => [...prev, 'skipped']);
      setCanAdvance(true);
      // Sem avanço automático: a explicação continua valendo a leitura.
    } catch (error) {
      console.error('Erro ao pular pergunta:', error);
      setShowResult(false);
      setIsSkipped(false);
      Alert.alert(t('common.error'), t('errors.tryAgainLater'));
    }
  };

  const handleSkipFailed = (erro?: string) => {
    console.warn('[QuizScreen] Pulo não concedido:', erro);
    // O cronômetro só volta a correr quando o usuário fecha o aviso. Se
    // liberássemos aqui, ele perderia segundos lendo um erro que não causou —
    // e o anúncio que falhou nem chegou a lhe dar o pulo.
    // Falta de preenchimento é rotina, não erro do jogador: a mensagem diz o
    // que fazer em vez de só constatar a falha. O hook segue tentando
    // recarregar por trás, então "em instantes" é literal.
    Alert.alert(
      t('ads.adNotAvailable'),
      t('ads.adRetryLater'),
      [{ text: 'OK', onPress: () => setSkipEmCurso(false) }],
      // Sem isto, o botão "voltar" do Android fecharia o aviso sem passar pelo
      // onPress — e o cronômetro ficaria congelado até o fim da fase.
      { cancelable: false },
    );
  };

  const handleNextQuestion = (resultToUse?: any) => {
    const result = resultToUse ?? latestResultRef.current;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);

    setShowResult(false);
    setAnswerResult(null);
    setSelectedOption(null);
    setCanAdvance(false);
    setIsTimedOut(false);
    setIsSkipped(false);
    setFalhaEnvio(false);
    setAutoAdvanceCountdown(null);

    if (result?.sessionStatus?.isPhaseComplete) {
      // Passa os IDs das perguntas desta fase para serem registrados (anti-repetição)
      const usedQuestionIds = Array.from(new Set(usedQuestionIdsRef.current));
      navigation.navigate('QuizResult', { sessionId, usedQuestionIds });
    } else {
      loadQuestion();
    }
  };

  const handleExit = () => {
    Alert.alert(
      t('quiz.exitTitle'),
      t('quiz.exitMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quiz.exitConfirm'),
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const totalTime = currentQuestion?.timePerQuestion
    ? Math.floor(currentQuestion.timePerQuestion / 1000)
    : 30;
  const timerColor = getTimerColor(timeRemaining, totalTime);
  const timerWidth = (timeRemaining / totalTime) * 100;
  const totalQuestions = currentQuestion?.totalQuestions ?? 10;

  // ——— Loading state ———
  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ——— Header ——— */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleExit}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            {t('quiz.questionCounter', {
              current: currentQuestion.questionIndex,
              total: currentQuestion.totalQuestions,
            })}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            {currentScore} {t('quiz.pointsAbbr')}
          </Text>
          {currentStreak > 0 && (
            <View style={styles.streakContainer}>
              <Flame size={14} color={COLORS.primary} fill={COLORS.primary} />
              <Text style={styles.streakText}>{currentStreak}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ——— Timer bar + segundos ——— */}
      <View style={styles.timerRow}>
        <View style={styles.timerBarContainer}>
          <View
            style={[
              styles.timerBar,
              { width: `${timerWidth}%`, backgroundColor: timerColor },
            ]}
          />
        </View>
        <View style={styles.timerBadge}>
          <Clock size={12} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>
            {timeRemaining}s
          </Text>
        </View>
      </View>

      {/* ——— Indicadores de progresso (dots) ——— */}
      <View style={styles.progressDots}>
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const result = questionResults[i];
          const isCurrent = i === questionResults.length && !showResult;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                result === 'correct' && styles.dotCorrect,
                result === 'wrong' && styles.dotWrong,
                result === 'timeout' && styles.dotTimeout,
                result === 'skipped' && styles.dotSkipped,
                isCurrent && styles.dotCurrent,
              ]}
            />
          );
        })}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScrollBeginDrag={cancelAutoAdvance}
      >
        <QuestionCard
          question={currentQuestion.question}
          selectedOption={selectedOption || undefined}
          correctOption={
            showResult && answerResult
              ? answerResult.answerRecord.correctOption
              : undefined
          }
          showResult={showResult}
          onSelectOption={handleAnswerSelect}
          disabled={showResult}
        />

        {/* ——— Pular pergunta ———
            Some assim que o usuário escolhe uma alternativa: a partir dali a
            resposta já está a caminho, e pular deixaria de fazer sentido. */}
        {!showResult && !selectedOption && (
          <View style={styles.skipRow}>
            <RewardedAdButton
              rewardType="skip"
              variant="outline"
              size="small"
              onStarted={() => setSkipEmCurso(true)}
              onRewardEarned={handleSkip}
              onFailed={handleSkipFailed}
            />
          </View>
        )}

        {/* ——— Auto-submit countdown indicator ——— */}
        {selectedOption && !showResult && autoSubmitCountdown !== null && (
          <View style={styles.autoSubmitIndicator}>
            <View style={styles.autoSubmitBar}>
              <View
                style={[
                  styles.autoSubmitProgress,
                  { width: `${(autoSubmitCountdown / 700) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.autoSubmitText}>{t('quiz.autoConfirming')}</Text>
          </View>
        )}

        {/* ——— Banner de resultado ——— */}
        {showResult && (
          <View style={styles.resultContainer}>
            {/* Tocar no banner pausa o auto-avanço (para ler a explicação com calma) */}
            <Pressable onPress={cancelAutoAdvance}>
            {isSkipped ? (
              /* Pulada — vale mostrar a resposta certa mesmo assim */
              <View style={styles.skippedBanner}>
                <View style={styles.resultIconContainer}>
                  <SkipForward size={44} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.skippedTitle}>{t('quiz.skippedTitle')}</Text>
                {answerResult && (
                  <Text style={styles.correctAnswerText}>
                    {t('quiz.correctAnswerLabel', {
                      option: answerResult.answerRecord.correctOption,
                    })}
                  </Text>
                )}
              </View>
            ) : isTimedOut ? (
              /* Timeout — sem resposta selecionada */
              <View style={styles.timeoutBanner}>
                <View style={styles.resultIconContainer}>
                  <Clock size={44} color="#F97316" />
                </View>
                <Text style={styles.timeoutTitle}>{t('quiz.timeUp')}</Text>
                {answerResult && (
                  <Text style={styles.correctAnswerText}>
                    {t('quiz.correctAnswerLabel', {
                      option: answerResult.answerRecord.correctOption,
                    })}
                  </Text>
                )}
              </View>
            ) : !answerResult ? (
              /* Aguardando resposta do servidor — estado neutro (evita flash de "Incorreta") */
              <View style={styles.pendingBanner}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : answerResult?.answerRecord?.isCorrect ? (
              /* Resposta correta */
              <View style={styles.successBanner}>
                <View style={styles.resultIconContainer}>
                  <CheckCircle size={44} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>{t('quiz.correctTitle')}</Text>
                <Text style={styles.pointsEarned}>
                  +{answerResult.scoreResult.totalPoints} {t('quiz.pointsEarned')}
                </Text>
              </View>
            ) : (
              /* Resposta errada */
              <View style={styles.errorBanner}>
                <View style={styles.resultIconContainer}>
                  <XCircle size={44} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>{t('quiz.incorrectTitle')}</Text>
                {answerResult && (
                  <Text style={styles.correctAnswerText}>
                    {t('quiz.correctAnswerLabel', {
                      option: answerResult.answerRecord.correctOption,
                    })}
                  </Text>
                )}
              </View>
            )}
            </Pressable>

            {/* ——— Falha ao registrar no servidor ———
                Sem isto o jogador ficava olhando um banner sem botão, sem
                saber que algo tinha dado errado nem como sair. */}
            {falhaEnvio && (
              <View>
                <Text style={styles.falhaTexto}>{t('errors.connectionError')}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={registrarTimeout}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ——— Botão "Próxima" ——— */}
            {canAdvance && (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => handleNextQuestion()}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>
                  {autoAdvanceCountdown !== null
                    ? `${t('quiz.nextQuestion')} (${autoAdvanceCountdown})`
                    : `${t('quiz.nextQuestion')} →`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
  questionCounter: {
    flex: 1,
    alignItems: 'center',
  },
  questionCounterText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  scoreText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.success,
    fontFamily: 'Poppins-Bold',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  streakText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },
  // Timer com número de segundos
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.screenPadding,
    gap: 8,
    marginBottom: SPACING.sm,
  },
  timerBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: 3,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 38,
  },
  timerText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  // Dots de progresso
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dotCorrect: {
    backgroundColor: '#22C55E',
  },
  dotWrong: {
    backgroundColor: '#EF4444',
  },
  dotTimeout: {
    backgroundColor: '#F97316',
  },
  // Pulada é neutra: não foi acerto nem erro, foi uma pergunta abandonada.
  dotSkipped: {
    backgroundColor: COLORS.textSecondary,
  },
  dotCurrent: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
  autoSubmitIndicator: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  autoSubmitBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  autoSubmitProgress: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  autoSubmitText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  resultContainer: {
    marginTop: SPACING.lg,
  },
  // Banners de resultado
  pendingBanner: {
    backgroundColor: COLORS.backgroundMuted,
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 116,
  },
  successBanner: {
    backgroundColor: 'rgba(15, 181, 126, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    alignItems: 'center',
  },
  skipRow: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  falhaTexto: {
    ...TYPOGRAPHY.body,
    color: '#F97316',
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  retryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F97316',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  retryButtonText: {
    ...TYPOGRAPHY.body,
    color: '#F97316',
    fontFamily: 'Poppins-SemiBold',
  },
  skippedBanner: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.textSecondary,
    alignItems: 'center',
  },
  skippedTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  timeoutBanner: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
    alignItems: 'center',
  },
  resultIconContainer: {
    marginBottom: SPACING.sm,
  },
  successTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: '#EF4444',
    marginBottom: SPACING.xs,
  },
  timeoutTitle: {
    ...TYPOGRAPHY.h3,
    color: '#F97316',
    marginBottom: SPACING.xs,
  },
  pointsEarned: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  correctAnswerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
  // Botão "Próxima"
  nextButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    ...TYPOGRAPHY.body,
    color: '#1A1A2E',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
});
