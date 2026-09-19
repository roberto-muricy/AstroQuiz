/**
 * Versão do app — ARQUIVO GERADO, não editar à mão.
 *
 * Gerado por scripts/gerar-versao.js a partir do project.pbxproj (iOS) e do
 * build.gradle (Android). Para atualizar, mude a versão na configuração de
 * build e rode o gerador; `versao.test.ts` falha se este arquivo ficar atrás.
 *
 * Sem dependência de react-native de propósito: assim os testes leem este
 * arquivo sem precisar do ambiente do React Native.
 */

export interface VersaoDaPlataforma {
  /** O que o público vê: 1.3.0. */
  versao: string;
  /** O número do envio, que sobe a cada build enviada. */
  build: string;
}

export const VERSOES: Record<'ios' | 'android', VersaoDaPlataforma> = {
  ios: { versao: '1.3.1', build: '51' },
  android: { versao: '1.3.1', build: '61' },
};

/** "1.3.0 (48)" — a build entra porque é ela que identifica o envio num relato de erro. */
export function versaoParaExibir(plataforma: string): string {
  const { versao, build } = VERSOES[plataforma === 'android' ? 'android' : 'ios'];
  return versao + ' (' + build + ')';
}
