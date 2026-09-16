/**
 * Ranking — conversa com o backend.
 *
 * Substitui o antigo quizService.getLeaderboard, que chamava /quiz/leaderboard,
 * uma rota que nunca existiu no servidor.
 *
 * Os nomes chegam como chaves, e nao como texto: quem nao escolheu apelido tem
 * um nome gerado (adjetivo + objeto + numero) que o app monta no idioma de quem
 * esta vendo. Por isso `NomeExibido` tem duas formas.
 *
 * O servidor nunca devolve o uid de ninguem — so o `publicId`, que e o unico
 * identificador que sai de la.
 */

import api from './api';
import { ApiResponse } from '../types';

export type RecorteDoRanking = 'weekly' | 'all-time' | 'phase';

export type NomeExibido =
  | { type: 'nickname'; text: string }
  | { type: 'generated'; adjective: string; object: string; number: number };

export interface EntradaDoRanking {
  position: number;
  publicId: string;
  name: NomeExibido;
  /** So vem quando o jogador escolheu mostrar o pais. */
  country: string | null;
  score: number;
  highestPhase: number;
}

export interface PosicaoPropria extends EntradaDoRanking {
  /** Falso para quem desligou "aparecer no ranking": a posicao e a que teria. */
  inBoard: boolean;
}

export interface PaginaDoRanking {
  board: RecorteDoRanking;
  country: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  page: number;
  pageSize: number;
  totalPlayers: number;
  totalPages: number;
  entries: EntradaDoRanking[];
  /** Null para convidado e para quem ainda nao tem partida que conte. */
  me: PosicaoPropria | null;
  /** Onde a pontuacao enviada em `score` entraria. Null no recorte por fase. */
  hypotheticalPosition: number | null;
}

export interface NomeGerado {
  adjective: string;
  object: string;
  number: number;
}

export interface ConfiguracoesDoJogador {
  publicId: string;
  name: NomeExibido;
  nickname: string | null;
  nicknameHidden: boolean;
  generatedName: NomeGerado;
  country: string | null;
  showCountry: boolean;
  visible: boolean;
  nicknameChangedAt: string | null;
  /** Quando a proxima troca de apelido fica liberada, ou null se ja pode. */
  nextNicknameChangeAt: string | null;
}

export interface MudancasDoJogador {
  /** null remove o apelido e volta a valer o nome gerado. */
  nickname?: string | null;
  country?: string | null;
  showCountry?: boolean;
  visible?: boolean;
}

export type MotivoDaDenuncia = 'offensive' | 'impersonation' | 'spam';

/**
 * O motivo que o servidor deu para recusar, quando deu.
 *
 * O axios lanca em 4xx, entao o corpo da recusa fica em `response.data` e nao
 * chega pelo caminho normal. Os nomes sao os mesmos que a validacao local usa,
 * para a tela ter uma frase por motivo — venha ela daqui ou de la.
 */
export function motivoDoErro(erro: any): string | null {
  const detalhes = erro?.response?.data?.error?.details;
  if (detalhes?.reason) return String(detalhes.reason);

  const status = erro?.response?.status;
  if (status === 409) return 'taken';
  if (status === 429) return 'tooSoon';
  return null;
}

/** Quando a proxima troca de apelido fica liberada, se o servidor disse. */
export function proximaTrocaDoErro(erro: any): string | null {
  return erro?.response?.data?.error?.details?.nextNicknameChangeAt ?? null;
}

function conteudo<T>(resposta: ApiResponse<T>, oQue: string): T {
  if (!resposta?.success || resposta.data === undefined || resposta.data === null) {
    throw new Error(resposta?.error || resposta?.message || `Erro ao ${oQue}`);
  }
  return resposta.data;
}

class LeaderboardService {
  /**
   * Uma pagina do ranking. Com `pais`, a lista e so daquele pais e o recorte vai
   * em `board`. `pontuacaoLocal` e o que o convidado tem guardado no aparelho:
   * o servidor responde com a posicao que essa pontuacao ocuparia.
   */
  async buscarPagina(opcoes: {
    recorte: RecorteDoRanking;
    pais?: string | null;
    pagina?: number;
    tamanho?: number;
    pontuacaoLocal?: number | null;
  }): Promise<PaginaDoRanking> {
    const { recorte, pais, pagina, tamanho, pontuacaoLocal } = opcoes;
    const params: Record<string, any> = {};

    if (pais) params.board = recorte;
    if (pagina && pagina > 1) params.page = pagina;
    if (tamanho) params.pageSize = tamanho;
    if (typeof pontuacaoLocal === 'number' && pontuacaoLocal > 0) {
      params.score = Math.floor(pontuacaoLocal);
    }

    const caminho = pais
      ? `/leaderboard/country/${encodeURIComponent(pais)}`
      : `/leaderboard/${recorte}`;

    const resposta = await api.get<ApiResponse<PaginaDoRanking>>(caminho, params);
    return conteudo(resposta, 'buscar o ranking');
  }

  /**
   * Configuracoes de quem esta logado. A primeira leitura cria o cadastro no
   * ranking, com um nome gerado — e por isso que a tela consegue dizer "voce
   * aparece como ..." antes de o jogador escolher qualquer coisa.
   */
  async lerConfiguracoes(): Promise<ConfiguracoesDoJogador> {
    const resposta = await api.get<ApiResponse<ConfiguracoesDoJogador>>('/leaderboard/me');
    return conteudo(resposta, 'ler suas configuracoes do ranking');
  }

  async salvarConfiguracoes(mudancas: MudancasDoJogador): Promise<ConfiguracoesDoJogador> {
    const resposta = await api.put<ApiResponse<ConfiguracoesDoJogador>>('/leaderboard/me', mudancas);
    return conteudo(resposta, 'salvar suas configuracoes do ranking');
  }

  /** Sorteia outro nome gerado. Nao mexe no apelido de quem tem um. */
  async sortearNome(): Promise<ConfiguracoesDoJogador> {
    const resposta = await api.post<ApiResponse<ConfiguracoesDoJogador>>(
      '/leaderboard/me/pseudonym',
      {},
    );
    return conteudo(resposta, 'sortear outro nome');
  }

  /** Sai do ranking e apaga o cadastro. As partidas deixam de apontar para a conta. */
  async apagarMeusDados(): Promise<void> {
    const resposta = await api.delete<ApiResponse<unknown>>('/leaderboard/me');
    if (!resposta?.success) {
      throw new Error(resposta?.error || 'Erro ao apagar seus dados do ranking');
    }
  }

  /**
   * Denuncia o apelido de outro jogador. So registra, para revisao manual: a
   * resposta e a mesma para denuncia nova e repetida.
   */
  async denunciar(playerId: string, motivo: MotivoDaDenuncia): Promise<void> {
    const resposta = await api.post<ApiResponse<unknown>>('/leaderboard/report', {
      playerId,
      reason: motivo,
    });
    if (!resposta?.success) {
      throw new Error(resposta?.error || 'Erro ao enviar a denuncia');
    }
  }
}

export default new LeaderboardService();
