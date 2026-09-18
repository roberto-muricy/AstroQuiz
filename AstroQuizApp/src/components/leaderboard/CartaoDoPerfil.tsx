/**
 * O cartão do ranking no Perfil: onde o jogador controla como aparece.
 *
 * Tudo o que está aqui é escolha da pessoa sobre a própria exposição — nome,
 * país, aparecer ou não, e apagar. É este cartão que a política de privacidade
 * promete, então ele precisa existir inteiro antes de a 1.3.0 ir para as lojas.
 *
 * Só aparece para quem tem conta: convidado não tem cadastro no ranking, e a
 * primeira leitura das configurações é justamente o que cria o cadastro.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Dices } from 'lucide-react-native';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { Card } from '@/components/Card';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { ConfirmModal } from '@/components/ConfirmModal';
import leaderboardService, {
  ConfiguracoesDoJogador,
  motivoDoErro,
  proximaTrocaDoErro,
} from '@/services/leaderboardService';
import { LeaderboardStorage } from '@/utils/leaderboardStorage';
import analyticsService from '@/services/analyticsService';
import { IdiomaSuportado, nomeDeExibicao } from '@/utils/pseudonimo';
import { nomeDoPais, bandeira } from '@/utils/pais';
import { SeletorDePais } from './SeletorDePais';
import { EditorDeApelido } from './EditorDeApelido';

interface Props {
  idioma: IdiomaSuportado;
}

export const CartaoDoPerfil: React.FC<Props> = ({ idioma }) => {
  const { t } = useTranslation();

  const [config, setConfig] = useState<ConfiguracoesDoJogador | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sorteando, setSorteando] = useState(false);

  const [editandoApelido, setEditandoApelido] = useState(false);
  const [erroDoApelido, setErroDoApelido] = useState<string | null>(null);
  const [proximaTroca, setProximaTroca] = useState<string | null>(null);
  const [escolhendoPais, setEscolhendoPais] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;

      (async () => {
        try {
          const lido = await leaderboardService.lerConfiguracoes();
          if (vivo) {
            setConfig(lido);
            setProximaTroca(lido.nextNicknameChangeAt);
          }
        } catch {
          // Sem rede: o cartão mostra o aviso e nada mais.
        } finally {
          if (vivo) setCarregando(false);
        }
      })();

      return () => {
        vivo = false;
      };
    }, []),
  );

  /** Toda gravação passa por aqui: o ranking em cache deixa de valer depois. */
  const salvar = async (mudancas: Parameters<typeof leaderboardService.salvarConfiguracoes>[0]) => {
    setSalvando(true);
    setErroDoApelido(null);
    try {
      const atualizado = await leaderboardService.salvarConfiguracoes(mudancas);
      setConfig(atualizado);
      setProximaTroca(atualizado.nextNicknameChangeAt);
      setEditandoApelido(false);
      await LeaderboardStorage.limpar();
      return true;
    } catch (erro) {
      setErroDoApelido(motivoDoErro(erro));
      const quando = proximaTrocaDoErro(erro);
      if (quando) setProximaTroca(quando);
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const sortearNome = async () => {
    setSorteando(true);
    try {
      setConfig(await leaderboardService.sortearNome());
      await LeaderboardStorage.limpar();
    } catch {
      // O nome continua o que era.
    } finally {
      setSorteando(false);
    }
  };

  const apagarDados = async () => {
    setConfirmandoExclusao(false);
    setSalvando(true);
    try {
      await leaderboardService.apagarMeusDados();
      await LeaderboardStorage.limpar();
      // Ler de novo recria o cadastro, com outro nome e outro id público — é
      // exatamente o que "apagar meus dados" deve deixar para trás.
      setConfig(await leaderboardService.lerConfiguracoes());
    } catch {
      // Nada apagado: o cartão continua como estava.
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <Card style={styles.cartao}>
        <Text style={styles.titulo}>{t('leaderboard.profile.title')}</Text>
        <ActivityIndicator color={COLORS.primary} style={styles.espera} />
      </Card>
    );
  }

  if (!config) {
    return (
      <Card style={styles.cartao}>
        <Text style={styles.titulo}>{t('leaderboard.profile.title')}</Text>
        <Text style={styles.aviso}>{t('leaderboard.profile.offline')}</Text>
      </Card>
    );
  }

  const pais = config.country
    ? `${bandeira(config.country)} ${nomeDoPais(config.country, idioma)}`
    : t('leaderboard.profile.country.none');

  return (
    <Card style={styles.cartao}>
      <Text style={styles.titulo}>{t('leaderboard.profile.title')}</Text>

      <Pressable
        onPress={() => setEditandoApelido(true)}
        style={styles.linha}
        accessibilityRole="button"
      >
        <View style={styles.linhaTexto}>
          <Text style={styles.rotulo}>{t('leaderboard.profile.appearAs')}</Text>
          <Text style={styles.valor} numberOfLines={1}>
            {nomeDeExibicao(config.name, idioma)}
          </Text>
        </View>
        <ChevronRight size={20} color={COLORS.textTertiary} />
      </Pressable>

      {/* Sortear só faz sentido para quem não escolheu apelido: com apelido, o
          nome gerado não aparece para ninguém. */}
      {!config.nickname && (
        <Pressable
          onPress={sortearNome}
          disabled={sorteando}
          style={styles.botaoSortear}
          accessibilityRole="button"
        >
          {sorteando ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <>
              <Dices size={16} color={COLORS.primary} />
              <Text style={styles.textoSortear}>{t('leaderboard.intro.draw')}</Text>
            </>
          )}
        </Pressable>
      )}

      <View style={styles.divisor} />

      <Pressable
        onPress={() => setEscolhendoPais(true)}
        style={styles.linha}
        accessibilityRole="button"
      >
        <View style={styles.linhaTexto}>
          <Text style={styles.rotulo}>{t('leaderboard.profile.country.label')}</Text>
          <Text style={styles.valor} numberOfLines={1}>
            {pais}
          </Text>
        </View>
        <ChevronRight size={20} color={COLORS.textTertiary} />
      </Pressable>

      <View style={styles.linhaToggle}>
        <Text style={styles.rotuloToggle}>{t('leaderboard.profile.showCountry')}</Text>
        <ToggleSwitch
          value={config.showCountry}
          onValueChange={(valor) => salvar({ showCountry: valor })}
          disabled={salvando || !config.country}
        />
      </View>

      <View style={styles.divisor} />

      <View style={styles.linhaToggle}>
        <View style={styles.linhaTexto}>
          <Text style={styles.rotuloToggle}>{t('leaderboard.profile.visible')}</Text>
          <Text style={styles.ajuda}>{t('leaderboard.profile.visibleHelp')}</Text>
        </View>
        <ToggleSwitch
          value={config.visible}
          onValueChange={(valor) => salvar({ visible: valor })}
          disabled={salvando}
        />
      </View>

      <Pressable
        onPress={() => setConfirmandoExclusao(true)}
        disabled={salvando}
        style={styles.botaoApagar}
        accessibilityRole="button"
      >
        <Text style={styles.textoApagar}>{t('leaderboard.profile.delete.action')}</Text>
      </Pressable>

      <EditorDeApelido
        visivel={editandoApelido}
        apelidoAtual={config.nickname}
        proximaTrocaEm={proximaTroca}
        salvando={salvando}
        erroDoServidor={erroDoApelido}
        idioma={idioma}
        aoSalvar={async (apelido) => {
          if (await salvar({ nickname: apelido })) {
            analyticsService.logLeaderboardNicknameSet('definido');
          }
        }}
        aoLimpar={async () => {
          if (await salvar({ nickname: null })) {
            analyticsService.logLeaderboardNicknameSet('limpo');
          }
        }}
        aoFechar={() => {
          setEditandoApelido(false);
          setErroDoApelido(null);
        }}
      />

      <SeletorDePais
        visivel={escolhendoPais}
        selecionado={config.country}
        idioma={idioma}
        aoEscolher={(codigo) => {
          setEscolhendoPais(false);
          salvar({ country: codigo });
        }}
        aoFechar={() => setEscolhendoPais(false)}
      />

      <ConfirmModal
        visible={confirmandoExclusao}
        title={t('leaderboard.profile.delete.title')}
        message={t('leaderboard.profile.delete.message')}
        confirmText={t('leaderboard.profile.delete.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={apagarDados}
        onCancel={() => setConfirmandoExclusao(false)}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  cartao: {
    gap: SPACING.sm,
    // O Perfil separa cada cartão com 16 em cima (`styles.card` da tela). Este
    // cartão é um componente à parte e ficou sem esse espaço: encostava no de
    // Configurações, e as bordas coladas pareciam um cartão sobre o outro.
    marginTop: SPACING.md,
  },
  titulo: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  espera: {
    marginVertical: SPACING.md,
  },
  aviso: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 48,
  },
  linhaTexto: {
    flex: 1,
    gap: 2,
  },
  rotulo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  valor: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  botaoSortear: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  textoSortear: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  divisor: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  linhaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 48,
  },
  rotuloToggle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  ajuda: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  botaoApagar: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  textoApagar: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.danger,
    fontWeight: '600',
  },
});
