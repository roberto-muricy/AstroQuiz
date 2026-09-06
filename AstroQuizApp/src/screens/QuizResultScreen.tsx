/**
 * QuizResultScreen - Refatorada
 * Tela de resultados após completar uma fase do quiz
 *
 * Refatoração: Usa design-system para consistência
 */

import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { ProgressStorage } from '@/utils/progressStorage';
import { checkAchievements, getPlayerLevel, getXPToNextLevel, calculateStarRating, getUnlockRequirement, estimatePhaseXP } from '@/utils/progressionSystem';
import type { RankIconName } from '@/utils/progressionSystem';
import { RankIcon } from '@/components/RankIcon';
import analyticsService from '@/services/analyticsService';
import soundService from '@/services/soundService';
import { showInterstitialAfterPhase, loadInterstitialAd } from '@/services/adService';
import { useAds } from '@/contexts/AdsContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AchievementPopup } from '@/components';
import { useApp } from '@/contexts/AppContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import quizService from '@/services/quizService';
import { useTranslation } from 'react-i18next';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from '@/constants/design-system';
import {
  RocketIcon,
  SparkleIcon,
  ThumbsUpIcon,
  KeepLookingIcon,
  FireIcon,
  AwardIcon,
  IconSizes,
  IconColors,
  RefreshIcon,
} from '@/components/Icons';

export const QuizResultScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuizResult'>>();
  const { sessionId, usedQuestionIds = [] } = route.params;
  const { locale } = useApp();
  const { adsEnabled } = useAds();
  const { isPro } = useSubscription();
  const { t } = useTranslation();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [falhaAoCarregar, setFalhaAoCarregar] = useState(false);
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
    icon: RankIconName;
  } | null>(null);
  const [stars, setStars] = useState(0);
  const [unlockRequirement, setUnlockRequirement] = useState<{ requiredAccuracy: number; specialRequirement?: string } | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [levelTitle, setLevelTitle] = useState('');
  const [levelIcon, setLevelIcon] = useState<RankIconName | null>(null);
  const [xpToNext, setXpToNext] = useState(0);

  useEffect(() => {
    loadResults();

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadResults = async () => {
    try {
      const finishResponse = await quizService.finishQuiz(sessionId);
      console.log('🏁 Quiz finalizado:', finishResponse);

      const data = finishResponse;
      setSessionData(data);

      const accuracy = data.accuracy ||
        (data.totalQuestions > 0 ? Math.round((data.correctAnswers / data.totalQuestions) * 100) : 0);
      const computedStars = calculateStarRating(data.correctAnswers || 0, data.totalQuestions || 10);
      setStars(computedStars);
      setUnlockRequirement(getUnlockRequirement((data.phaseNumber || 1) + 1));

      const isPerfect = accuracy === 100;

      // O evento que fecha o funil: quantos começaram a fase, quantos
      // terminaram e com que desempenho. É a taxa de aprovação por fase que
      // diz se a exigência de acerto deve subir ou ficar em 60%.
      analyticsService.logQuizComplete({
        phaseNumber: data.phaseNumber,
        score: data.finalScore || data.score || 0,
        accuracy,
        timeSpent: data.totalTime || 0,
        correctAnswers: data.correctAnswers || 0,
        totalQuestions: data.totalQuestions || 10,
        passed: !!data.passed,
      });

      // Registrar as perguntas vistas ANTES do teste de aprovação.
      //
      // Isto morava dentro do `if (data.passed)` abaixo, junto com XP e
      // desbloqueio. Quem reprovava numa fase tinha as 10 perguntas esquecidas
      // e as reencontrava na fase seguinte — reprovar é justamente quando o
      // jogador MAIS vai repetir a fase, e mais sente a repetição.
      await ProgressStorage.registrarPerguntasVistas(usedQuestionIds);

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
        setLevelTitle(currentLevel.title);
        setLevelIcon(currentLevel.icon);
        setXpToNext(getXPToNextLevel(updated.stats.totalXP));
        setPhaseUnlocked(updated.unlockedPhases > data.phaseNumber);

        if (currentLevel.level > prevLevel.level) {
          triggerLevelUp(prevLevel.level, currentLevel);
        }

        const unlockedAchievementIds = updated.stats.achievements || [];
        const newlyUnlocked = checkAchievements(updated.stats, unlockedAchievementIds);

        if (newlyUnlocked.length > 0) {
          setNewAchievements(newlyUnlocked);
          const updatedStats = {
            ...updated.stats,
            achievements: [...unlockedAchievementIds, ...newlyUnlocked.map(a => a.id)],
          };
          await ProgressStorage.saveProgress({ ...updated, stats: updatedStats });

          setTimeout(() => {
            setCurrentAchievementIndex(0);
            setShowAchievementPopup(true);
          }, 1000);
        }

        setTimeout(() => soundService.playUnlock(), 500);
      }

      soundService.playPhaseComplete(isPerfect);

      // XP entra depois da fanfarra para os dois não se sobreporem.
      if (data.passed) {
        setTimeout(() => soundService.playXP(), 900);
      }

    } catch (error) {
      // Sem isto a tela ficava em "calculando" para sempre: o erro so ia para o
      // console e nada na interface mudava. Falhar em silencio e pior do que
      // falhar — o jogador nao tem como saber que precisa tentar de novo.
      console.error('Erro ao carregar resultados:', error);
      setFalhaAoCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = async () => {
    try {
      if (startingNextPhase) return;
      setStartingNextPhase(true);
      if (sessionData?.phaseNumber) {
        const progress = await ProgressStorage.getProgress();
        const excludeQuestions = progress.answeredQuestionIds || [];
        const newSession = await quizService.startQuiz(sessionData.phaseNumber, locale, undefined, excludeQuestions);
        await runAdThen(() =>
          navigation.reset({
            index: 1,
            routes: [
              { name: 'Main' },
              {
                name: 'QuizGame',
                params: { phaseNumber: sessionData.phaseNumber, sessionId: newSession.sessionId },
              },
            ],
          })
        );
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
      const progress = await ProgressStorage.getProgress();
      const excludeQuestions = progress.answeredQuestionIds || [];
      const newSession = await quizService.startQuiz(nextPhase, locale, undefined, excludeQuestions);
      await runAdThen(() =>
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' },
            {
              name: 'QuizGame',
              params: { phaseNumber: nextPhase, sessionId: newSession.sessionId },
            },
          ],
        })
      );
    } catch (error) {
      console.error('Erro ao iniciar próxima fase:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a próxima fase.');
    } finally {
      setStartingNextPhase(false);
    }
  };


  /**
   * Exibe o interstitial ao SAIR da tela de resultado — nunca na chegada, para
   * nao atropelar a fanfarra, as estrelas e a contagem de XP. Assinantes Pro
   * (adsEnabled=false) nunca veem anuncio. A regra de fase minima fica no
   * adService (MIN_PHASE_FOR_ADS).
   */
  const runAdThen = async (next: () => void) => {
    try {
      if (adsEnabled && !isPro) {
        await showInterstitialAfterPhase(sessionData?.phaseNumber || 1);
        // Ja deixa o proximo carregado para a fase seguinte
        loadInterstitialAd();
      }
    } catch (error) {
      // anuncio nunca pode impedir a navegacao
    }
    next();
  };

  const handleBackToMenu = () => {
    runAdThen(() =>
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  const triggerLevelUp = (fromLevel: number, toLevel: { level: number; title: string; icon: RankIconName }) => {
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
        colors={COLORS.backgroundGradient}
        style={styles.container}
      >
        <View style={styles.loading}>
          {falhaAoCarregar ? (
            <>
              <Text style={styles.loadingText}>{t('errors.connectionError')}</Text>
              <TouchableOpacity
                style={styles.retryResultButton}
                onPress={() => {
                  setFalhaAoCarregar(false);
                  setLoading(true);
                  loadResults();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.retryResultText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.loadingText}>{t('result.calculatingResults')}</Text>
          )}
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

  const acertos = sessionData.correctAnswers || 0;
  const totalPerguntas = sessionData.totalQuestions || 10;
  const segundos = Math.round((sessionData.totalTime || 0) / 1000);
  // Quantas respostas faltaram para os 60%. Dizer "faltaram 2 acertos" e mais
  // acionavel do que "minimo 60%": a distancia vem em perguntas, que e a
  // unidade em que o jogador pensa.
  const faltaram = Math.max(0, Math.ceil(totalPerguntas * 0.6) - acertos);

  // Quanto do nível atual já foi percorrido, em %. O topo da faixa é o XP que
  // o jogador tem mais o que falta; a base é o XP que o nível atual exigiu.
  const nivelAtual = getPlayerLevel(totalXP);
  const topoDaFaixa = totalXP + xpToNext;
  const xpProgresso = topoDaFaixa > nivelAtual.xpRequired
    ? ((totalXP - nivelAtual.xpRequired) / (topoDaFaixa - nivelAtual.xpRequired)) * 100
    : 100;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
        >
          {/* ——— Cabeçalho ———
              Antes daqui saíam sete anúncios do mesmo fato: troféu, título,
              três estrelas, selo APROVADO, "100% de acerto", cartão "Pontuação
              perfeita" e o par "10 certas / 0 erradas". Sobrou um ícone, uma
              palavra e a fase. */}
          <Animated.View style={[styles.header, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.eyebrow}>
              {passed
                ? t('result.phaseCompleted', { phase: sessionData.phaseNumber })
                : t('result.phaseIncomplete', { phase: sessionData.phaseNumber })}
            </Text>
            <View style={styles.performanceIcon}>
              {/* Foguete no lugar do troféu: é o ícone da marca, e "decolou"
                  fala a língua do app. Luneta no lugar do haltere de academia. */}
              {isPerfect ? <RocketIcon size={52} color={IconColors.gold} /> :
               isGreat ? <SparkleIcon size={52} color={IconColors.gold} /> :
               isGood ? <ThumbsUpIcon size={52} color={IconColors.success} /> :
               <KeepLookingIcon size={52} color={IconColors.primary} />}
            </View>
            <Text style={styles.title}>
              {isPerfect ? t('result.perfect') : isGreat ? t('result.excellent') : isGood ? t('result.veryGood') : t('result.keepTrying')}
            </Text>
          </Animated.View>

          {/* ——— O placar, sem caixa ———
              O cartão roxo #5A5A9C não existia no design system e era a única
              superfície opaca dessa cor no app inteiro. O número não precisa de
              moldura para ser o herói da tela. */}
          <View style={styles.heroScore}>
            <Text style={[styles.scoreValue, !passed && styles.scoreValueMuted]}>
              {sessionData.finalScore || sessionData.score || 0}
            </Text>
            <Text style={styles.scoreLabel}>{t('result.pointsLabel')}</Text>
          </View>

          {/* ——— Os fatos, numa linha ———
              Quatro tiles viravam meia tela. "0 erradas" não informa nada
              depois de "100%", então acerto e erro viraram uma fração. */}
          <View style={styles.fatos}>
            <Text style={styles.fato}>{accuracy}<Text style={styles.fatoUnidade}>%</Text></Text>
            <Text style={styles.separador}>·</Text>
            <Text style={styles.fato}>{acertos}<Text style={styles.fatoUnidade}>/{totalPerguntas}</Text></Text>
            <Text style={styles.separador}>·</Text>
            <Text style={styles.fato}>{segundos}<Text style={styles.fatoUnidade}>s</Text></Text>
            {sessionData.maxStreak > 1 && (
              <>
                <Text style={styles.separador}>·</Text>
                <Text style={styles.fato}>
                  {sessionData.maxStreak}
                  <Text style={styles.fatoUnidade}> {t('result.inARow')}</Text>
                </Text>
              </>
            )}
          </View>

          {/* ——— Conquistas como medalhas ———
              Eram três cartões de três linhas cada. O texto explicativo não
              sobrevive à segunda partida; o que fica é o símbolo. */}
          {(isPerfect || sessionData.maxStreak >= 10) && (
            <View style={styles.medalhas}>
              {isPerfect && (
                <View style={styles.medalha}>
                  <AwardIcon size={15} color={COLORS.primary} />
                  <Text style={styles.medalhaTexto}>{t('result.perfectBonus')}</Text>
                </View>
              )}
              {sessionData.maxStreak >= 10 && (
                <View style={styles.medalha}>
                  <FireIcon size={15} color={COLORS.primary} />
                  <Text style={styles.medalhaTexto}>
                    {t('result.streakOf', { count: sessionData.maxStreak })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ——— Por que não passou ———
              "Faltaram 2 acertos" no lugar de "mínimo 60%": a distância em
              perguntas é a unidade em que o jogador pensa. E a promessa de que
              as perguntas mudam só virou verdade quando a exclusão foi
              corrigida no servidor — é o melhor motivo para tentar de novo. */}
          {!passed && (
            <View style={styles.avisoFalha}>
              <Text style={styles.avisoTitulo}>
                {t('result.missedBy', { count: faltaram })}
              </Text>
              <Text style={styles.avisoTexto}>
                {t('result.retryHint', { needed: Math.ceil(totalPerguntas * 0.6), total: totalPerguntas })}
              </Text>
            </View>
          )}

          {/* ——— Nível e XP, numa linha ——— */}
          {levelTitle ? (
            <View style={styles.nivelBloco}>
              <View style={styles.nivelLinha}>
                {levelIcon && <RankIcon name={levelIcon} size={15} color={IconColors.gold} />}
                <Text style={styles.nivelTexto}>{levelTitle}</Text>
                <Text style={styles.nivelXp}>
                  {xpToNext > 0 ? t('result.xpToNext', { xp: xpToNext }) : t('result.maxLevel')}
                </Text>
              </View>
              {xpToNext > 0 && (
                <View style={styles.barraXp}>
                  <View style={[styles.barraXpFill, { width: `${Math.min(100, Math.max(4, xpProgresso))}%` }]} />
                </View>
              )}
            </View>
          ) : null}

          {/* Botões de Ação */}
          <View style={styles.actions}>
            {/* O "Nova fase desbloqueada!" era um cartão inteiro logo acima
                deste botão, dizendo o que o botão já diz. Virou a segunda linha
                dele: o anúncio e a ação no mesmo lugar. */}
            {passed && phaseUnlocked && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextPhase}
                disabled={startingNextPhase}
              >
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {t('result.playPhase', { phase: sessionData.phaseNumber + 1 })}
                  </Text>
                  <Text style={styles.buttonSubText}>{t('result.justUnlocked')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Vermelho era punição visual por reprovar. Laranja é o mesmo
                convite de sempre — o jogador já sabe que errou. */}
            {!passed && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePlayAgain}
              >
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.buttonGradient}
                >
                  <RefreshIcon size={18} color="#1A1A2E" />
                  <Text style={styles.buttonText}>{t('result.tryAgain')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {passed && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePlayAgain}
                disabled={startingNextPhase}
              >
                <RefreshIcon size={17} color={COLORS.text} />
                <Text style={styles.secondaryButtonText}>{t('result.playAgain')}</Text>
              </TouchableOpacity>
            )}

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
            <View style={styles.levelUpIcon}>
              <SparkleIcon size={64} color={IconColors.gold} />
            </View>
            <Text style={styles.levelUpTitle}>{t('result.levelUp')}</Text>
            <Text style={styles.levelUpSubtitle}>
              {t('result.levelUpFrom', { from: levelUpInfo.from, to: levelUpInfo.to })}
            </Text>
            <View style={styles.levelUpBadgeRow}>
              <RankIcon name={levelUpInfo.icon} size={22} color={IconColors.gold} filled />
              <Text style={styles.levelUpBadge}>{levelUpInfo.title}</Text>
            </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  // Azul-marinho liso, igual às outras sete telas do app. Esta era a única com
  // fundo em gradiente, e a troca abrupta ao sair do quiz fazia a tela parecer
  // de outro aplicativo.
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  retryResultButton: {
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  retryResultText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  scrollContent: {
    padding: SIZES.screenPadding,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.textTertiary,
    fontFamily: 'Poppins-Medium',
  },
  performanceIcon: {
    marginTop: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  // O placar sem moldura. O cartao roxo #5A5A9C que ficava aqui nao existia no
  // design system e era a unica superficie opaca dessa cor no app.
  heroScore: {
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  scoreValue: {
    fontSize: 68,
    lineHeight: 76,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },
  // Reprovou: o numero perde o destaque laranja, mas continua legivel.
  scoreValueMuted: {
    color: COLORS.textSecondary,
  },
  scoreLabel: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: COLORS.textTertiary,
    fontFamily: 'Poppins-Medium',
  },
  // Os quatro tiles viraram esta linha.
  fatos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  fato: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
  },
  fatoUnidade: {
    color: COLORS.textTertiary,
    fontFamily: 'Poppins-Regular',
  },
  separador: {
    color: COLORS.textDisabled,
    fontSize: 14,
  },
  medalhas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  medalha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 167, 38, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.36)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  medalhaTexto: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  avisoFalha: {
    backgroundColor: COLORS.backgroundMuted,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    marginTop: SPACING.lg,
  },
  avisoTitulo: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: SPACING.xs,
  },
  avisoTexto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  nivelBloco: {
    marginTop: SPACING.lg,
  },
  nivelLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  nivelTexto: {
    ...TYPOGRAPHY.caption,
    color: COLORS.premium,
    fontFamily: 'Poppins-SemiBold',
  },
  nivelXp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  barraXp: {
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundMuted,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  barraXpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.premium,
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderRadius: RADIUS.md,
    padding: SIZES.screenPadding,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  achievementSuccess: {
    backgroundColor: 'rgba(15, 181, 126, 0.15)',
    borderLeftColor: COLORS.success,
  },
  achievementWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftColor: '#EF4444',
  },
  achievementTitleSuccess: {
    color: COLORS.success,
  },
  achievementTitleWarning: {
    color: '#EF4444',
  },
  achievementTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  achievementText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    textAlign: 'center',
  },
  actions: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  primaryButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg - 2,
    alignItems: 'center',
  },
  // Texto escuro sobre o laranja: branco sobre #FFA726 fica em 2,1:1, abaixo
  // do minimo de 4,5:1 da WCAG. O mesmo par ja e usado no botao "Proxima" da
  // tela do jogo.
  buttonText: {
    ...TYPOGRAPHY.h3,
    color: '#1A1A2E',
  },
  buttonSubText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(26, 26, 46, 0.62)',
    marginTop: 3,
  },
  secondaryButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundHighlight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg - 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },
  tertiaryButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  levelUpCard: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SIZES.screenPadding,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  levelUpIcon: {
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  levelUpTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  levelUpSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  levelUpBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  levelUpBadge: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  levelUpButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  levelUpButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.body,
    fontFamily: 'Poppins-Bold',
  },
});
