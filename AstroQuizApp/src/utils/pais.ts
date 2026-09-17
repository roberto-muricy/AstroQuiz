/**
 * Países do ranking: detecção, validação, bandeira e nome traduzido.
 *
 * Aqui ficam só os 249 códigos ISO 3166-1 alfa-2. Os NOMES vêm da tabela
 * gerada em `nomes-de-paises.ts` — ninguém digita esses mil textos à mão: o
 * gerador os tira da base de idiomas do Node.
 *
 * Eles já vieram do `Intl.DisplayNames` do aparelho, e isso estava quebrado sem
 * ninguém notar: o Hermes não implementa essa API, então a lista mostrava só
 * siglas e buscar "Brasil" não achava nada. O `Intl` ficou como reserva.
 *
 * A bandeira é derivada do próprio código, sem tabela: cada letra vira o
 * indicador regional correspondente.
 */

import { NativeModules, Platform } from 'react-native';

import { IdiomaSuportado } from './pseudonimo';
import { NOMES_DE_PAISES } from './nomes-de-paises';

/** ISO 3166-1 alfa-2. O servidor aceita qualquer par de letras; a lista daqui é o que o app oferece. */
export const CODIGOS_DE_PAIS: readonly string[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW',
  'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT',
  'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS',
  'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
];

const CONHECIDOS = new Set(CODIGOS_DE_PAIS);

export interface PaisNaLista {
  codigo: string;
  nome: string;
  bandeira: string;
}

/** Devolve o código em maiúsculas se for um país que o app conhece; senão, null. */
export function normalizarCodigoDePais(codigo: string | null | undefined): string | null {
  if (typeof codigo !== 'string') return null;
  const limpo = codigo.trim().toUpperCase();
  return CONHECIDOS.has(limpo) ? limpo : null;
}

/** A bandeira sai do próprio código: cada letra vira um indicador regional. */
export function bandeira(codigo: string | null | undefined): string {
  const valido = normalizarCodigoDePais(codigo);
  if (!valido) return '';
  return String.fromCodePoint(
    ...[...valido].map((letra) => 0x1f1e6 + (letra.charCodeAt(0) - 65)),
  );
}

/**
 * O nome do país vem de uma tabela embutida, não do `Intl`.
 *
 * O Hermes não implementa `Intl.DisplayNames`, então no aparelho o tradutor
 * nunca existe: até 17/09/2026 o seletor mostrava só siglas ("AD", "AE"…) e
 * buscar "Brasil" não achava nada. Os testes rodam no Node, que tem a base de
 * idiomas completa, e por isso não pegaram.
 *
 * A tabela é gerada por `scripts/gerar-nomes-de-paises.js`. O `Intl` fica como
 * reserva para um código que exista na lista e não esteja na tabela.
 */
const tradutores = new Map<string, Intl.DisplayNames | null>();

function tradutorDe(idioma: IdiomaSuportado): Intl.DisplayNames | null {
  if (!tradutores.has(idioma)) {
    try {
      tradutores.set(idioma, new Intl.DisplayNames([idioma], { type: 'region' }));
    } catch {
      // Aparelho sem Intl.DisplayNames: o nome vira o código.
      tradutores.set(idioma, null);
    }
  }
  return tradutores.get(idioma) || null;
}

/** Só para teste: esquece os tradutores já criados. */
export function limparCacheDeNomes(): void {
  tradutores.clear();
}

export function nomeDoPais(codigo: string | null | undefined, idioma: IdiomaSuportado): string {
  const valido = normalizarCodigoDePais(codigo);
  if (!valido) return '';

  const daTabela = NOMES_DE_PAISES[idioma]?.[valido];
  if (daTabela) return daTabela;

  try {
    return tradutorDe(idioma)?.of(valido) || valido;
  } catch {
    return valido;
  }
}

/** "pt-BR" e "pt_BR" viram "BR"; sem região, null. */
export function paisDoLocale(locale: string | null | undefined): string | null {
  if (typeof locale !== 'string') return null;
  const partes = locale.replace(/_/g, '-').split('-');
  for (const parte of partes.slice(1)) {
    const codigo = normalizarCodigoDePais(parte);
    if (codigo) return codigo;
  }
  return null;
}

/**
 * O país do aparelho, para já vir preenchido no perfil.
 *
 * O `Intl` resolve a região nas duas plataformas sem dependência nova; os
 * módulos nativos ficam de reserva para quando ele não estiver disponível.
 * Devolve null quando não dá para saber — e aí o jogador escolhe.
 */
export function paisDoAparelho(): string | null {
  try {
    const doIntl = paisDoLocale(Intl.DateTimeFormat().resolvedOptions().locale);
    if (doIntl) return doIntl;
  } catch {
    // Segue para os módulos nativos.
  }

  try {
    if (Platform.OS === 'ios') {
      const ajustes: any = NativeModules.SettingsManager?.settings;
      return (
        paisDoLocale(ajustes?.AppleLocale) || paisDoLocale(ajustes?.AppleLanguages?.[0]) || null
      );
    }
    return paisDoLocale((NativeModules.I18nManager as any)?.localeIdentifier) || null;
  } catch {
    return null;
  }
}

/** Sem acento e em minúsculas, para a busca achar "Sao Tome" digitando "são". */
const paraBusca = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

/** A lista inteira, com nome traduzido e ordenada como se escreve no idioma. */
export function listaDePaises(idioma: IdiomaSuportado): PaisNaLista[] {
  return CODIGOS_DE_PAIS.map((codigo) => ({
    codigo,
    nome: nomeDoPais(codigo, idioma),
    bandeira: bandeira(codigo),
  })).sort((a, b) => a.nome.localeCompare(b.nome, idioma));
}

/** Filtra por nome ou por código, ignorando acentos e maiúsculas. */
export function filtrarPaises(paises: PaisNaLista[], busca: string): PaisNaLista[] {
  const procurado = paraBusca(String(busca ?? ''));
  if (!procurado) return paises;
  return paises.filter(
    (pais) => paraBusca(pais.nome).includes(procurado) || paraBusca(pais.codigo).includes(procurado),
  );
}
