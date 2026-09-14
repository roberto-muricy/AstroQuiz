/**
 * Jogadores do ranking
 *
 * Como cada conta aparece na classificacao: apelido escolhido ou nome gerado,
 * pais e visibilidade. A tabela e criada pela migracao
 * database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js.
 *
 * As regras de apelido (tamanho, caracteres permitidos, nomes bloqueados) ainda
 * nao existem. Este modulo so garante a unicidade e o limite da coluna; nenhum
 * apelido deve chegar a atualizarJogador sem passar por aquelas regras.
 *
 * Recebe o knex, e nao o strapi, para ser testado contra SQLite.
 */

import { randomBytes } from 'crypto';
import { eTabelaInexistente, eViolacaoDeUnicidade } from './database-errors';

export const TABELA_DE_JOGADORES = 'leaderboard_players';

const TAMANHO_DA_COLUNA = 32;
const MAIOR_SMALLINT = 32767;

export interface Pseudonimo {
  adjetivo: string;
  objeto: string;
  numero: number;
}

export interface JogadorDoRanking {
  firebaseUid: string;
  idPublico: string;
  pseudonimo: Pseudonimo;
  apelido: string | null;
  apelidoAlteradoEm: string | null;
  pais: string | null;
  mostrarPais: boolean;
  visivel: boolean;
  ocultoPelaModeracao: boolean;
  apelidoOcultoPelaModeracao: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AlteracoesDoJogador {
  /** null ou texto vazio remove o apelido, e volta a valer o nome gerado. */
  apelido?: string | null;
  pais?: string | null;
  mostrarPais?: boolean;
  visivel?: boolean;
  pseudonimo?: Pseudonimo;
}

export class ErroDeApelidoEmUso extends Error {
  constructor() {
    super('Nickname already in use');
    this.name = 'ErroDeApelidoEmUso';
  }
}

export class ErroDePseudonimoEmUso extends Error {
  constructor() {
    super('Pseudonym already in use');
    this.name = 'ErroDePseudonimoEmUso';
  }
}

/** 96 bits aleatorios, 16 caracteres. O unico id do jogador que sai do servidor. */
export function gerarIdPublico(): string {
  return randomBytes(12).toString('base64url');
}

/**
 * Forma usada para comparar apelidos: sem acentos, minusculas e espacos
 * simples. A recomposicao final (NFC) evita que letras como as do hangul
 * fiquem mais longas do que o apelido original.
 */
export function normalizarApelido(apelido: string): string {
  return apelido
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC');
}

function limparApelido(apelido: unknown): string | null {
  if (apelido === null || apelido === undefined) return null;
  if (typeof apelido !== 'string') throw new Error('Nickname must be a string');
  const limpo = apelido.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!limpo) return null;
  if ([...limpo].length > TAMANHO_DA_COLUNA) throw new Error('Nickname too long');
  return limpo;
}

/** Formato apenas. A lista de paises validos entra com as regras da API. */
export function normalizarCodigoDePais(codigo: unknown): string | null {
  if (codigo === null || codigo === undefined || codigo === '') return null;
  if (typeof codigo !== 'string' || !/^[A-Za-z]{2}$/.test(codigo)) {
    throw new Error('Invalid country code');
  }
  return codigo.toUpperCase();
}

function conferirPseudonimo(p: any): Pseudonimo {
  const chaveValida = (v: any) =>
    typeof v === 'string' && v.length > 0 && v.length <= TAMANHO_DA_COLUNA;
  if (
    !p ||
    !chaveValida(p.adjetivo) ||
    !chaveValida(p.objeto) ||
    !Number.isInteger(p.numero) ||
    p.numero < 0 ||
    p.numero > MAIOR_SMALLINT
  ) {
    throw new Error('Invalid pseudonym');
  }
  return { adjetivo: p.adjetivo, objeto: p.objeto, numero: p.numero };
}

function conferirBooleano(valor: unknown, campo: string): boolean {
  if (typeof valor !== 'boolean') throw new Error(`${campo} must be a boolean`);
  return valor;
}

// SQLite devolve booleanos como 0/1 e datas como texto; o Postgres, como
// boolean e Date.
const comoBooleano = (v: any): boolean => v === true || v === 1 || v === '1' || v === 't';
const comoData = (v: any): string | null => (v == null ? null : new Date(v).toISOString());

function paraJogador(linha: any): JogadorDoRanking {
  return {
    firebaseUid: linha.firebase_uid,
    idPublico: linha.public_id,
    pseudonimo: {
      adjetivo: linha.pseudonym_adjective,
      objeto: linha.pseudonym_object,
      numero: Number(linha.pseudonym_number),
    },
    apelido: linha.nickname ?? null,
    apelidoAlteradoEm: comoData(linha.nickname_changed_at),
    pais: linha.country_code ?? null,
    mostrarPais: comoBooleano(linha.show_country),
    visivel: comoBooleano(linha.visible),
    ocultoPelaModeracao: comoBooleano(linha.hidden_by_admin),
    apelidoOcultoPelaModeracao: comoBooleano(linha.nickname_hidden),
    criadoEm: comoData(linha.created_at) as string,
    atualizadoEm: comoData(linha.updated_at) as string,
  };
}

function traduzirViolacao(erro: any): never {
  if (eViolacaoDeUnicidade(erro, 'nickname_normalized')) throw new ErroDeApelidoEmUso();
  if (eViolacaoDeUnicidade(erro, 'pseudonym_number')) throw new ErroDePseudonimoEmUso();
  throw erro;
}

export async function buscarJogador(knex: any, firebaseUid: string): Promise<JogadorDoRanking | null> {
  const linha = await knex(TABELA_DE_JOGADORES).where({ firebase_uid: firebaseUid }).first();
  return linha ? paraJogador(linha) : null;
}

export async function buscarJogadorPorIdPublico(
  knex: any,
  idPublico: string
): Promise<JogadorDoRanking | null> {
  const linha = await knex(TABELA_DE_JOGADORES).where({ public_id: idPublico }).first();
  return linha ? paraJogador(linha) : null;
}

/**
 * Cria o jogador. Se a conta ja estiver cadastrada, devolve o cadastro
 * existente sem alterar nada.
 */
export async function criarJogador(
  knex: any,
  dados: { firebaseUid: string; pseudonimo: Pseudonimo; pais?: string | null },
  agora: Date = new Date()
): Promise<JogadorDoRanking> {
  const existente = await buscarJogador(knex, dados.firebaseUid);
  if (existente) return existente;

  const pseudonimo = conferirPseudonimo(dados.pseudonimo);
  const instante = agora.toISOString();

  try {
    await knex(TABELA_DE_JOGADORES).insert({
      firebase_uid: dados.firebaseUid,
      public_id: gerarIdPublico(),
      pseudonym_adjective: pseudonimo.adjetivo,
      pseudonym_object: pseudonimo.objeto,
      pseudonym_number: pseudonimo.numero,
      country_code: normalizarCodigoDePais(dados.pais),
      show_country: true,
      visible: true,
      hidden_by_admin: false,
      nickname_hidden: false,
      created_at: instante,
      updated_at: instante,
    });
  } catch (erro) {
    // Duas requisicoes da mesma conta ao mesmo tempo: vale a que chegou primeiro.
    if (eViolacaoDeUnicidade(erro, 'firebase_uid')) {
      const criadoAoMesmoTempo = await buscarJogador(knex, dados.firebaseUid);
      if (criadoAoMesmoTempo) return criadoAoMesmoTempo;
    }
    traduzirViolacao(erro);
  }

  return (await buscarJogador(knex, dados.firebaseUid)) as JogadorDoRanking;
}

/**
 * Altera o que o proprio jogador pode mudar. Devolve null se a conta nao
 * estiver cadastrada.
 *
 * A data de alteracao do apelido so muda quando o apelido muda de fato.
 */
export async function atualizarJogador(
  knex: any,
  firebaseUid: string,
  alteracoes: AlteracoesDoJogador,
  agora: Date = new Date()
): Promise<JogadorDoRanking | null> {
  const atual = await buscarJogador(knex, firebaseUid);
  if (!atual) return null;

  const campos: Record<string, any> = {};

  if ('apelido' in alteracoes) {
    const apelido = limparApelido(alteracoes.apelido);
    if (apelido !== atual.apelido) {
      campos.nickname = apelido;
      campos.nickname_normalized = apelido === null ? null : normalizarApelido(apelido);
      campos.nickname_changed_at = agora.toISOString();
    }
  }
  if ('pais' in alteracoes) campos.country_code = normalizarCodigoDePais(alteracoes.pais);
  if ('mostrarPais' in alteracoes) {
    campos.show_country = conferirBooleano(alteracoes.mostrarPais, 'mostrarPais');
  }
  if ('visivel' in alteracoes) campos.visible = conferirBooleano(alteracoes.visivel, 'visivel');
  if ('pseudonimo' in alteracoes) {
    const p = conferirPseudonimo(alteracoes.pseudonimo);
    campos.pseudonym_adjective = p.adjetivo;
    campos.pseudonym_object = p.objeto;
    campos.pseudonym_number = p.numero;
  }

  if (Object.keys(campos).length === 0) return atual;

  try {
    await knex(TABELA_DE_JOGADORES)
      .where({ firebase_uid: firebaseUid })
      .update({ ...campos, updated_at: agora.toISOString() });
  } catch (erro) {
    traduzirViolacao(erro);
  }

  return buscarJogador(knex, firebaseUid);
}

/**
 * Usado na exclusao de conta. Sem a tabela nao ha o que apagar, e a exclusao
 * da conta nao pode falhar por isso.
 */
export async function apagarJogador(knex: any, firebaseUid: string): Promise<number> {
  try {
    return await knex(TABELA_DE_JOGADORES).where({ firebase_uid: firebaseUid }).del();
  } catch (erro) {
    if (eTabelaInexistente(erro)) return 0;
    throw erro;
  }
}
