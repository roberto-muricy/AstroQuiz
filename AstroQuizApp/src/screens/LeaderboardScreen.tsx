/**
 * Tela do Ranking.
 *
 * Abre com a última lista salva e só então troca pelo que o servidor responder:
 * a lista inteira vem de uma requisição, e esperar por ela deixaria a tela em
 * branco a cada entrada. Quando o aparelho está sem rede, o que está salvo
 * continua na tela — avisado como salvo, nunca passado por atual.
 *
 * Esta etapa traz os controles e a lista. Os estados especiais — convite ao
 * convidado, jogador oculto, denúncia e a apresentação da primeira visita —
 * vêm na etapa seguinte.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { SeletorDeRecorte, LinhaDoRanking, MetricaDoRanking } from '@/components/leaderboard';
import leaderboardService, {
  PaginaDoRanking,
  RecorteDoRanking,
} from '@/services/leaderboardService';
import { LeaderboardStorage, estaFresco } from '@/utils/leaderboardStorage';
import { ProgressStorage } from '@/utils/progressStorage';
import { paisDoAparelho } from '@/utils/pais';
import { IdiomaSuportado } from '@/utils/pseudonimo';

type Periodo = 'weekly' | 'all-time';
type Escopo = 'mundo' | 'pais';

/** O máximo que o servidor devolve de uma vez. */
const POR_PAGINA = 50;

export const LeaderboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const idioma = ((i18n.language || 'pt').slice(0, 2) as IdiomaSuportado) || 'pt';

  const paisDoJogador = useMemo(() => paisDoAparelho(), []);

  const [periodo, setPeriodo] = useState<Periodo>('weekly');
  const [escopo, setEscopo] = useState<Escopo>('mundo');
  const [metrica, setMetrica] = useState<MetricaDoRanking>('pontos');

  const [pagina, setPagina] = useState<PaginaDoRanking | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(false);
  const [mostrandoSalvo, setMostrandoSalvo] = useState(false);

  // "Mais longe na jornada" só existe no geral: na semana, pontos são a única
  // ordem que faz sentido.
  const recorte: RecorteDoRanking = metrica === 'fase' ? 'phase' : periodo;
  const pais = escopo === 'pais' ? paisDoJogador : null;

  const trocarPeriodo = (novo: Periodo) => {
    setPeriodo(novo);
    if (novo === 'weekly') setMetrica('pontos');
  };

  const carregar = useCallback(
    async ({ doZero }: { doZero: boolean }) => {
      if (doZero) {
        setCarregando(true);
        setErro(false);

        const salva = await LeaderboardStorage.ler<PaginaDoRanking>(recorte, pais);
        if (salva) {
          setPagina(salva.pagina);
          setMostrandoSalvo(!estaFresco(salva));
          setCarregando(false);
        }
      }

      try {
        const pontuacaoLocal = await ProgressStorage.pontuacaoTotalDoServidor();
        const nova = await leaderboardService.buscarPagina({
          recorte,
          pais,
          tamanho: POR_PAGINA,
          pontuacaoLocal,
        });

        setPagina(nova);
        setErro(false);
        setMostrandoSalvo(false);
        await LeaderboardStorage.guardar(recorte, pais, nova);
      } catch {
        // Com algo salvo na tela, a falha vira um aviso; sem nada, vira erro.
        setErro((atual) => atual || !pagina);
        setMostrandoSalvo((atual) => atual || !!pagina);
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    // `pagina` fica de fora de propósito: ela muda a cada carga e recriaria o
    // callback, disparando o efeito de foco em laço.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recorte, pais],
  );

  useFocusEffect(
    useCallback(() => {
      carregar({ doZero: true });
    }, [carregar]),
  );

  const aoPuxar = () => {
    setAtualizando(true);
    carregar({ doZero: false });
  };

  const entradas = pagina?.entries ?? [];
  const eu = pagina?.me ?? null;
  const euEstaNaLista = !!eu && entradas.some((e) => e.publicId === eu.publicId);

  const cabecalho = (
    <View style={styles.controles}>
      <SeletorDeRecorte<Periodo>
        rotuloDoGrupo={t('leaderboard.period.label')}
        valor={periodo}
        aoTrocar={trocarPeriodo}
        opcoes={[
          { valor: 'weekly', rotulo: t('leaderboard.period.week') },
          { valor: 'all-time', rotulo: t('leaderboard.period.allTime') },
        ]}
      />

      {!!paisDoJogador && (
        <SeletorDeRecorte<Escopo>
          rotuloDoGrupo={t('leaderboard.scope.label')}
          valor={escopo}
          aoTrocar={setEscopo}
          opcoes={[
            { valor: 'mundo', rotulo: t('leaderboard.scope.world') },
            { valor: 'pais', rotulo: paisDoJogador },
          ]}
        />
      )}

      {periodo === 'all-time' && (
        <SeletorDeRecorte<MetricaDoRanking>
          rotuloDoGrupo={t('leaderboard.metric.label')}
          valor={metrica}
          aoTrocar={setMetrica}
          opcoes={[
            { valor: 'pontos', rotulo: t('leaderboard.metric.points') },
            { valor: 'fase', rotulo: t('leaderboard.metric.phase') },
          ]}
        />
      )}

      {!!pagina && !erro && (
        <Text style={styles.contagem}>
          {t('leaderboard.players', { count: pagina.totalPlayers })}
        </Text>
      )}

      {mostrandoSalvo && <Text style={styles.avisoSalvo}>{t('leaderboard.savedList')}</Text>}
    </View>
  );

  const vazio = carregando ? (
    <ActivityIndicator color={COLORS.primary} style={styles.espera} />
  ) : erro ? (
    <View style={styles.estado}>
      <Text style={styles.estadoTitulo}>{t('leaderboard.error.title')}</Text>
      <Pressable
        onPress={() => carregar({ doZero: true })}
        style={styles.botao}
        accessibilityRole="button"
      >
        <Text style={styles.botaoTexto}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.estado}>
      <Text style={styles.estadoTitulo}>{t('leaderboard.empty.title')}</Text>
      <Text style={styles.estadoDica}>{t('leaderboard.empty.hint')}</Text>
    </View>
  );

  return (
    <View style={[styles.tela, { paddingTop: insets.top + SPACING.md }]}>
      <Text style={styles.titulo}>{t('leaderboard.title')}</Text>

      <FlatList
        data={entradas}
        keyExtractor={(entrada) => entrada.publicId}
        renderItem={({ item }) => (
          <LinhaDoRanking
            entrada={item}
            idioma={idioma}
            metrica={metrica}
            destacada={!!eu && item.publicId === eu.publicId}
          />
        )}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={vazio}
        contentContainerStyle={[
          styles.lista,
          { paddingBottom: insets.bottom + SPACING.xxl },
          entradas.length === 0 && styles.listaVazia,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoPuxar}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />

      {/* Fora da lista carregada, a posição própria fica fixa no rodapé. */}
      {!!eu && !euEstaNaLista && (
        <View style={[styles.rodape, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <Text style={styles.rodapeRotulo}>{t('leaderboard.yourPosition')}</Text>
          <LinhaDoRanking entrada={eu} idioma={idioma} metrica={metrica} destacada />
        </View>
      )}
    </View>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  titulo: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  lista: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  listaVazia: {
    flexGrow: 1,
  },
  controles: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  contagem: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  avisoSalvo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
  },
  espera: {
    marginTop: SPACING.xl,
  },
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  estadoTitulo: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: 'center',
  },
  estadoDica: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  botao: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  botaoTexto: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  rodape: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  rodapeRotulo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
