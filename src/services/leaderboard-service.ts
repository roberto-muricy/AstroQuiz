/**
 * Ranking (somente leitura)
 *
 * Regras, do plano aprovado em 13/09/2026:
 *
 *   - Pontos: soma da melhor pontuacao em cada fase. Repetir uma fase so soma
 *     se bater o recorde.
 *   - Semanal: as melhores pontuacoes feitas na semana, de segunda 00:00 a
 *     domingo, no horario de Brasilia (UTC-3 fixo; o Brasil nao tem horario de
 *     verao desde 2019).
 *   - Fase alcancada: maior fase aprovada em todo o historico.
 *   - Contagem anti-salto: a primeira fase registrada de uma conta e o ponto de
 *     partida; depois, a fase N so conta se N <= (ultima fase aprovada em
 *     sequencia) + 1.
 *   - Desempate: quem chegou primeiro fica a frente; depois, o id publico.
 *   - Entram so resultados `eligible` (conta, 10 perguntas, relogio do servidor,
 *     dentro do teto) de jogadores cadastrados, visiveis e nao ocultos pela
 *     moderacao.
 *
 * O banco devolve agregados por (conta, fase) — no maximo 50 linhas por conta —
 * e as regras sao aplicadas aqui. O firebase_uid nunca sai deste modulo.
 */

import { eTabelaInexistente } from './database-errors';
import { TABELA_DE_JOGADORES } from './leaderboard-players';
import { LEADERBOARD_DEFAULT_PAGE_SIZE, LEADERBOARD_MAX_PAGE_SIZE } from './validation';

export type TipoDeRanking = 'all-time' | 'weekly' | 'phase';

/** Nome gerado vai como chaves: o app traduz para o idioma de quem ve. */
export type NomeExibido =
  | { type: 'nickname'; text: string }
  | { type: 'generated'; adjective: string; object: string; number: number };

export interface EntradaDoRanking {
  position: number;
  publicId: string;
  name: NomeExibido;
  /** So quando o jogador escolheu mostrar o pais. */
  country: string | null;
  score: number;
  highestPhase: number;
}

export interface PaginaDoRanking {
  board: TipoDeRanking;
  country: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  page: number;
  pageSize: number;
  totalPlayers: number;
  totalPages: number;
  entries: EntradaDoRanking[];
}

const FUSO_DE_BRASILIA_MS = 3 * 60 * 60 * 1000;
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
const VALIDADE_DO_CACHE_MS = 30 * 1000;

interface MelhorDaFase {
  fase: number;
  pontos: number;
  /** Quando essa melhor pontuacao foi feita pela primeira vez. */
  alcancadoEm: number;
}

interface ProgressoDaFase {
  fase: number;
  /** Ordem de gravacao do primeiro resultado da conta nesta fase. */
  primeiroId: number;
  /** Primeira aprovacao nesta fase, ou null se nunca aprovou. */
  aprovadaEm: number | null;
}

interface Classificado {
  publicId: string;
  name: NomeExibido;
  countryCode: string | null;
  showCountry: boolean;
  score: number;
  highestPhase: number;
  alcancadoEm: number;
  faseAlcancadaEm: number;
}

// Duas variantes fixas; nada vindo da requisicao entra no texto do SQL.
const SQL_MELHORES = `
  select r.firebase_uid, r.phase, r.score as best, min(r.finished_at) as reached_at
  from phase_results r
  join (
    select firebase_uid, phase, max(score) as best
    from phase_results
    where eligible = ? and firebase_uid is not null
    group by firebase_uid, phase
  ) m on m.firebase_uid = r.firebase_uid and m.phase = r.phase and m.best = r.score
  where r.eligible = ?
  group by r.firebase_uid, r.phase, r.score`;

const SQL_MELHORES_DA_SEMANA = `
  select r.firebase_uid, r.phase, r.score as best, min(r.finished_at) as reached_at
  from phase_results r
  join (
    select firebase_uid, phase, max(score) as best
    from phase_results
    where eligible = ? and firebase_uid is not null
      and finished_at >= ? and finished_at < ?
    group by firebase_uid, phase
  ) m on m.firebase_uid = r.firebase_uid and m.phase = r.phase and m.best = r.score
  where r.eligible = ? and r.finished_at >= ? and r.finished_at < ?
  group by r.firebase_uid, r.phase, r.score`;

const SQL_PROGRESSO = `
  select firebase_uid, phase, min(id) as first_id,
         min(case when passed = ? then finished_at end) as first_passed_at
  from phase_results
  where eligible = ? and firebase_uid is not null
  group by firebase_uid, phase`;

// Postgres devolve { rows }; SQLite, a lista. Datas: Date no Postgres, texto
// ISO no SQLite. Booleanos: boolean no Postgres, 0/1 no SQLite.
const linhasDe = (resultado: any): any[] => (Array.isArray(resultado) ? resultado : resultado?.rows ?? []);
const instante = (valor: any): number => new Date(valor).getTime();
const verdadeiro = (v: any): boolean => v === true || v === 1 || v === '1' || v === 't';
const compararTexto = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function agruparPorConta<T>(linhas: any[], converter: (linha: any) => T): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const linha of linhas) {
    const lista = mapa.get(linha.firebase_uid) ?? [];
    lista.push(converter(linha));
    mapa.set(linha.firebase_uid, lista);
  }
  return mapa;
}

/** Semana do ranking que contem `agora`: de segunda 00:00 a segunda seguinte, horario de Brasilia. */
export function semanaDoRanking(agora: Date): { inicio: Date; fim: Date } {
  const local = new Date(agora.getTime() - FUSO_DE_BRASILIA_MS);
  const diasDesdeSegunda = (local.getUTCDay() + 6) % 7;
  const inicio = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - diasDesdeSegunda) +
      FUSO_DE_BRASILIA_MS
  );
  return { inicio, fim: new Date(inicio.getTime() + SEMANA_MS) };
}

/** Ultima fase da sequencia aprovada a partir do ponto de partida da conta. */
function fronteiraDaSequencia(progresso: ProgressoDaFase[]): number {
  if (progresso.length === 0) return 0;
  const primeira = progresso.reduce((a, b) => (b.primeiroId < a.primeiroId ? b : a));
  const aprovadas = new Set(progresso.filter((p) => p.aprovadaEm !== null).map((p) => p.fase));
  let fronteira = primeira.fase - 1;
  while (aprovadas.has(fronteira + 1)) fronteira++;
  return fronteira;
}

function nomeExibido(jogador: any): NomeExibido {
  const apelido = typeof jogador.nickname === 'string' && jogador.nickname ? jogador.nickname : null;
  if (apelido && !verdadeiro(jogador.nickname_hidden)) return { type: 'nickname', text: apelido };
  return {
    type: 'generated',
    adjective: jogador.pseudonym_adjective,
    object: jogador.pseudonym_object,
    number: Number(jogador.pseudonym_number),
  };
}

async function carregarMelhores(
  knex: any,
  semana: { inicio: Date; fim: Date } | null
): Promise<Map<string, MelhorDaFase[]>> {
  // Datas vao como texto ISO: e assim que estao gravadas no SQLite, e o
  // Postgres converte na comparacao.
  const resultado = semana
    ? await knex.raw(SQL_MELHORES_DA_SEMANA, [
        true,
        semana.inicio.toISOString(),
        semana.fim.toISOString(),
        true,
        semana.inicio.toISOString(),
        semana.fim.toISOString(),
      ])
    : await knex.raw(SQL_MELHORES, [true, true]);

  return agruparPorConta(linhasDe(resultado), (l) => ({
    fase: Number(l.phase),
    pontos: Number(l.best),
    alcancadoEm: instante(l.reached_at),
  }));
}

async function carregarProgresso(knex: any): Promise<Map<string, ProgressoDaFase[]>> {
  const resultado = await knex.raw(SQL_PROGRESSO, [true, true]);
  return agruparPorConta(linhasDe(resultado), (l) => ({
    fase: Number(l.phase),
    primeiroId: Number(l.first_id),
    aprovadaEm: l.first_passed_at == null ? null : instante(l.first_passed_at),
  }));
}

function carregarJogadoresVisiveis(knex: any): Promise<any[]> {
  return knex(TABELA_DE_JOGADORES)
    .select(
      'firebase_uid',
      'public_id',
      'pseudonym_adjective',
      'pseudonym_object',
      'pseudonym_number',
      'nickname',
      'nickname_hidden',
      'country_code',
      'show_country'
    )
    .where({ visible: true, hidden_by_admin: false });
}

const porPontos = (a: Classificado, b: Classificado): number =>
  b.score - a.score || a.alcancadoEm - b.alcancadoEm || compararTexto(a.publicId, b.publicId);

const porFase = (a: Classificado, b: Classificado): number =>
  b.highestPhase - a.highestPhase ||
  a.faseAlcancadaEm - b.faseAlcancadaEm ||
  b.score - a.score ||
  compararTexto(a.publicId, b.publicId);

async function calcularClassificacao(
  knex: any,
  tipo: TipoDeRanking,
  semana: { inicio: Date; fim: Date } | null
): Promise<Classificado[]> {
  const [jogadores, progresso, melhores] = await Promise.all([
    carregarJogadoresVisiveis(knex),
    carregarProgresso(knex),
    carregarMelhores(knex, semana),
  ]);

  const lista: Classificado[] = [];
  for (const jogador of jogadores) {
    const doJogador = progresso.get(jogador.firebase_uid) ?? [];
    const limite = fronteiraDaSequencia(doJogador) + 1;

    let pontos = 0;
    let alcancadoEm = 0;
    let fasesContadas = 0;
    for (const m of melhores.get(jogador.firebase_uid) ?? []) {
      if (m.fase > limite) continue;
      pontos += m.pontos;
      alcancadoEm = Math.max(alcancadoEm, m.alcancadoEm);
      fasesContadas++;
    }

    let maiorAprovada: ProgressoDaFase | null = null;
    for (const p of doJogador) {
      if (p.aprovadaEm === null || p.fase > limite) continue;
      if (!maiorAprovada || p.fase > maiorAprovada.fase) maiorAprovada = p;
    }
    const highestPhase = maiorAprovada?.fase ?? 0;

    if (tipo === 'phase' ? highestPhase === 0 : fasesContadas === 0) continue;

    lista.push({
      publicId: jogador.public_id,
      name: nomeExibido(jogador),
      countryCode: jogador.country_code ?? null,
      showCountry: verdadeiro(jogador.show_country),
      score: pontos,
      highestPhase,
      alcancadoEm,
      faseAlcancadaEm: maiorAprovada?.aprovadaEm ?? 0,
    });
  }

  return lista.sort(tipo === 'phase' ? porFase : porPontos);
}

const cache = new Map<string, { expiraEm: number; lista: Classificado[] }>();

/** Chamado quando entra um resultado novo. */
export function limparCacheDoRanking(): void {
  cache.clear();
}

async function classificacaoEmCache(
  knex: any,
  tipo: TipoDeRanking,
  semana: { inicio: Date; fim: Date } | null
): Promise<Classificado[]> {
  const chave = `${tipo}:${semana ? semana.inicio.toISOString() : 'sempre'}`;
  const agora = Date.now();
  const guardada = cache.get(chave);
  if (guardada && guardada.expiraEm > agora) return guardada.lista;

  let lista: Classificado[];
  try {
    lista = await calcularClassificacao(knex, tipo, semana);
  } catch (erro) {
    // Sem as tabelas (ambiente sem as migracoes) o ranking so esta vazio.
    if (!eTabelaInexistente(erro)) throw erro;
    lista = [];
  }

  for (const [outraChave, entrada] of cache) {
    if (entrada.expiraEm <= agora) cache.delete(outraChave);
  }
  cache.set(chave, { expiraEm: agora + VALIDADE_DO_CACHE_MS, lista });
  return lista;
}

/**
 * Uma pagina do ranking. Com `pais`, so jogadores daquele pais que escolheram
 * mostra-lo, com as posicoes contadas dentro do pais.
 */
export async function montarPaginaDoRanking(
  knex: any,
  opcoes: {
    tipo: TipoDeRanking;
    pais?: string | null;
    pagina?: number;
    tamanho?: number;
    agora?: Date;
  }
): Promise<PaginaDoRanking> {
  const pagina = Math.max(1, Math.floor(opcoes.pagina ?? 1));
  const tamanho = Math.min(
    LEADERBOARD_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(opcoes.tamanho ?? LEADERBOARD_DEFAULT_PAGE_SIZE))
  );
  const pais = opcoes.pais ? opcoes.pais.toUpperCase() : null;
  const semana = opcoes.tipo === 'weekly' ? semanaDoRanking(opcoes.agora ?? new Date()) : null;

  const lista = await classificacaoEmCache(knex, opcoes.tipo, semana);
  const filtrada = pais ? lista.filter((e) => e.showCountry && e.countryCode === pais) : lista;
  const inicio = (pagina - 1) * tamanho;

  return {
    board: opcoes.tipo,
    country: pais,
    periodStart: semana ? semana.inicio.toISOString() : null,
    periodEnd: semana ? semana.fim.toISOString() : null,
    page: pagina,
    pageSize: tamanho,
    totalPlayers: filtrada.length,
    totalPages: Math.ceil(filtrada.length / tamanho),
    entries: filtrada.slice(inicio, inicio + tamanho).map((e, i) => ({
      position: inicio + i + 1,
      publicId: e.publicId,
      name: { ...e.name },
      country: e.showCountry ? e.countryCode : null,
      score: e.score,
      highestPhase: e.highestPhase,
    })),
  };
}
