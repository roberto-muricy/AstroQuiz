/**
 * Tela do Ranking.
 *
 * Abre com a última lista salva e só então troca pelo que o servidor responder:
 * a lista inteira vem de uma requisição, e esperar por ela deixaria a tela em
 * branco a cada entrada. Quando o aparelho está sem rede, o que está salvo
 * continua na tela — avisado como salvo, nunca passado por atual.
 *
 * A tela tem quatro situações além da lista, e todas aparecem no mesmo lugar,
 * acima dos controles:
 *
 *   - primeira visita de quem tem conta: com que nome a pessoa aparece, e a
 *     saída, porque aparecer é o padrão;
 *   - convidado: a posição que teria, com convite para entrar;
 *   - quem se escondeu: por que não se encontra na lista, e como voltar;
 *   - erro e lista vazia, que são estados da própria lista.
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
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import {
  SeletorDeRecorte,
  LinhaDoRanking,
  MetricaDoRanking,
  CartaoDeConvite,
  AvisoDeOculto,
  ApresentacaoDoRanking,
  ModalDeDenuncia,
} from '@/components/leaderboard';
import leaderboardService, {
  PaginaDoRanking,
  RecorteDoRanking,
  ConfiguracoesDoJogador,
  EntradaDoRanking,
  MotivoDaDenuncia,
} from '@/services/leaderboardService';
import { LeaderboardStorage, estaFresco } from '@/utils/leaderboardStorage';
import { ProgressStorage } from '@/utils/progressStorage';
import { SettingsStorage } from '@/utils/settingsStorage';
import { paisDoAparelho } from '@/utils/pais';
import { IdiomaSuportado, nomeDeExibicao } from '@/utils/pseudonimo';
import { useApp } from '@/contexts/AppContext';
import { RootStackParamList } from '@/types';

type Periodo = 'weekly' | 'all-time';
type Escopo = 'mundo' | 'pais';

/** O máximo que o servidor devolve de uma vez. */
const POR_PAGINA = 50;

export const LeaderboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useApp();
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

  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesDoJogador | null>(null);
  const [mostrarApresentacao, setMostrarApresentacao] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [salvandoVisibilidade, setSalvandoVisibilidade] = useState(false);

  const [denunciando, setDenunciando] = useState<EntradaDoRanking | null>(null);
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);
  const [denunciaEnviada, setDenunciaEnviada] = useState(false);

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

  /**
   * Lê as configurações de quem tem conta. É esta leitura que cria o cadastro
   * no ranking, com um nome sorteado — e por isso a apresentação vem logo em
   * seguida, antes de a pessoa aparecer para os outros.
   */
  const carregarConfiguracoes = useCallback(async () => {
    if (!isAuthenticated) {
      setConfiguracoes(null);
      setMostrarApresentacao(false);
      return;
    }

    try {
      const [config, ajustes] = await Promise.all([
        leaderboardService.lerConfiguracoes(),
        SettingsStorage.getSettings(),
      ]);
      setConfiguracoes(config);
      setMostrarApresentacao(!ajustes.apresentacaoDoRankingVista);
    } catch {
      // Sem as configurações a lista continua de pé: perde-se só o cartão próprio.
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      carregar({ doZero: true });
      carregarConfiguracoes();
    }, [carregar, carregarConfiguracoes]),
  );

  const marcarApresentacaoVista = async () => {
    setMostrarApresentacao(false);
    await SettingsStorage.saveSettings({ apresentacaoDoRankingVista: true });
  };

  const sortearOutroNome = async () => {
    setSorteando(true);
    try {
      setConfiguracoes(await leaderboardService.sortearNome());
    } catch {
      // Falhou: o nome continua o que era, e a pessoa pode tentar de novo.
    } finally {
      setSorteando(false);
    }
  };

  const trocarVisibilidade = async (visivel: boolean) => {
    setSalvandoVisibilidade(true);
    try {
      setConfiguracoes(await leaderboardService.salvarConfiguracoes({ visible: visivel }));
      await carregar({ doZero: false });
    } catch {
      // Sem efeito: o estado anterior continua na tela.
    } finally {
      setSalvandoVisibilidade(false);
    }
  };

  const naoQuererAparecer = async () => {
    await marcarApresentacaoVista();
    await trocarVisibilidade(false);
  };

  const enviarDenuncia = async (motivo: MotivoDaDenuncia) => {
    if (!denunciando) return;
    setEnviandoDenuncia(true);
    try {
      await leaderboardService.denunciar(denunciando.publicId, motivo);
      setDenunciaEnviada(true);
    } catch {
      // Falhou: fecha sem afirmar que recebeu.
      setDenunciando(null);
    } finally {
      setEnviandoDenuncia(false);
    }
  };

  const fecharDenuncia = () => {
    setDenunciando(null);
    setDenunciaEnviada(false);
  };

  const entradas = pagina?.entries ?? [];
  const eu = pagina?.me ?? null;
  const euEstaNaLista = !!eu && entradas.some((e) => e.publicId === eu.publicId);
  const estouOculto = !!configuracoes && !configuracoes.visible;
  // Denunciar é para o nome de outra pessoa, e só faz sentido com conta.
  const podeDenunciar = (entrada: EntradaDoRanking) =>
    isAuthenticated && entrada.publicId !== configuracoes?.publicId;

  const cabecalho = (
    <View style={styles.cabecalho}>
      {mostrarApresentacao && !!configuracoes && (
        <ApresentacaoDoRanking
          configuracoes={configuracoes}
          idioma={idioma}
          sorteando={sorteando}
          aoSortearOutro={sortearOutroNome}
          aoContinuar={marcarApresentacaoVista}
          aoNaoQuererAparecer={naoQuererAparecer}
        />
      )}

      {!isAuthenticated && (
        <CartaoDeConvite
          posicaoHipotetica={pagina?.hypotheticalPosition ?? null}
          totalDeJogadores={pagina?.totalPlayers ?? 0}
          idioma={idioma}
          aoEntrar={() => navigation.navigate('Login')}
        />
      )}

      {estouOculto && !mostrarApresentacao && (
        <AvisoDeOculto
          posicao={eu?.position ?? null}
          idioma={idioma}
          salvando={salvandoVisibilidade}
          aoVoltarAAparecer={() => trocarVisibilidade(true)}
        />
      )}

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
            aoDenunciar={podeDenunciar(item) ? () => setDenunciando(item) : undefined}
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
            onRefresh={() => {
              setAtualizando(true);
              carregar({ doZero: false });
            }}
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

      <ModalDeDenuncia
        visivel={!!denunciando}
        nome={denunciando ? nomeDeExibicao(denunciando.name, idioma) : ''}
        enviando={enviandoDenuncia}
        enviada={denunciaEnviada}
        aoEnviar={enviarDenuncia}
        aoFechar={fecharDenuncia}
      />
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
  cabecalho: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  controles: {
    gap: SPACING.sm,
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
