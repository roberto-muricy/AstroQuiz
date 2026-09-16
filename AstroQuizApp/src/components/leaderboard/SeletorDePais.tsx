/**
 * Seletor de país do ranking.
 *
 * São 249 países: sem busca, escolher o seu é rolar uma lista inteira. A busca
 * ignora acento e maiúscula e também aceita a sigla, porque quem sabe que é
 * "BR" digita "BR".
 *
 * "Não informar" fica no topo, e não no fim: é a escolha de quem não quer dizer
 * de onde é, e essa pessoa não deveria ter que rolar 249 nomes para chegar lá.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Search, X } from 'lucide-react-native';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { IdiomaSuportado } from '@/utils/pseudonimo';
import { listaDePaises, filtrarPaises } from '@/utils/pais';

interface Props {
  visivel: boolean;
  /** O país atual, ou null para "não informar". */
  selecionado: string | null;
  idioma: IdiomaSuportado;
  aoEscolher: (codigo: string | null) => void;
  aoFechar: () => void;
}

export const SeletorDePais: React.FC<Props> = ({
  visivel,
  selecionado,
  idioma,
  aoEscolher,
  aoFechar,
}) => {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');

  const todos = useMemo(() => listaDePaises(idioma), [idioma]);
  const visiveis = useMemo(() => filtrarPaises(todos, busca), [todos, busca]);

  const escolher = (codigo: string | null) => {
    setBusca('');
    aoEscolher(codigo);
  };

  const fechar = () => {
    setBusca('');
    aoFechar();
  };

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
      <View style={styles.tela}>
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>{t('leaderboard.profile.country.title')}</Text>
          <Pressable onPress={fechar} accessibilityRole="button" hitSlop={SPACING.sm}>
            <X size={24} color={COLORS.text} />
          </Pressable>
        </View>

        <View style={styles.campoDeBusca}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder={t('leaderboard.profile.country.search')}
            placeholderTextColor={COLORS.textTertiary}
            style={styles.entrada}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('leaderboard.profile.country.search')}
          />
        </View>

        <FlatList
          data={visiveis}
          keyExtractor={(pais) => pais.codigo}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              onPress={() => escolher(null)}
              style={styles.linha}
              accessibilityRole="button"
            >
              <Text style={styles.semPais}>{t('leaderboard.profile.country.none')}</Text>
              {selecionado === null && <Check size={20} color={COLORS.primary} />}
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => escolher(item.codigo)}
              style={styles.linha}
              accessibilityRole="button"
              accessibilityState={{ selected: item.codigo === selecionado }}
            >
              <Text style={styles.bandeira}>{item.bandeira}</Text>
              <Text style={styles.nome} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={styles.sigla}>{item.codigo}</Text>
              {item.codigo === selecionado && <Check size={20} color={COLORS.primary} />}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.vazio}>{t('leaderboard.profile.country.noResults')}</Text>
          }
          contentContainerStyle={styles.lista}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.xxl,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  titulo: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    flex: 1,
  },
  campoDeBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.backgroundMuted,
  },
  entrada: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    paddingVertical: SPACING.sm + 2,
  },
  lista: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 52,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  bandeira: {
    fontSize: 22,
  },
  nome: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  sigla: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  semPais: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  vazio: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
