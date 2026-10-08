/**
 * Quem esta realmente logado.
 *
 * O app tem TRES estados de usuario, nao dois:
 *
 *   - logado de verdade, com o uid do Firebase
 *   - convidado, com um id gerado `anon_…`
 *   - pos-falha de carregamento, com o id fixo `guest`
 *
 * Como os dois ultimos preenchem `user`, um `if (user)` os trata como logados.
 * Foi assim que a propriedade de analytics `autenticado` nasceu respondendo
 * "sim" para todo mundo.
 *
 * Mora aqui, e nao no AppContext, para poder ser testada sem arrastar os
 * modulos nativos que o contexto importa.
 */
export const ehUsuarioAutenticado = (u: { id: string } | null | undefined): boolean =>
  !!u && !u.id.startsWith('anon_') && u.id !== 'guest';

/**
 * A tela mostra uma conta que o Firebase nao sustenta mais?
 *
 * O `user` do app e uma copia salva no login, e nada a mantinha em dia com o
 * Firebase. Quando a conta era apagada em outro aparelho, o Firebase encerrava
 * a sessao por conta propria e o app seguia exibindo "Conectado como ..." —
 * enquanto as fases iam como convidado, porque nao havia mais token, e ficavam
 * de fora do ranking sem nenhum aviso. Visto em 18/09/2026 com uma conta de
 * teste recriada.
 *
 * `uidDoFirebase` e o usuario atual do Firebase (null = ninguem). Um uid
 * diferente do exibido tambem conta como sessao perdida: a tela estaria
 * mostrando uma pessoa e mandando o token de outra.
 *
 * `saindo` cobre sair e excluir a conta, em que o proprio app desliga o
 * Firebase de proposito e nao ha nada para avisar.
 */
export function sessaoPerdida(
  usuarioLocal: { id: string } | null | undefined,
  uidDoFirebase: string | null,
  saindo: boolean,
): boolean {
  if (saindo || !ehUsuarioAutenticado(usuarioLocal)) return false;
  return uidDoFirebase !== usuarioLocal!.id;
}

/** So o que precisamos do usuario do Firebase, para testar sem os modulos nativos. */
export interface UsuarioComToken {
  getIdToken(forcarAtualizacao?: boolean): Promise<string>;
}

/**
 * Token do Firebase para a proxima requisicao.
 *
 * Perguntar ao SDK toda vez e barato: ele devolve o que tem em cache e so busca
 * um novo quando o atual esta perto de vencer. Por isso nao passamos `true`, que
 * forcaria ida a rede a cada chamada.
 *
 * Guardar o token em memoria e reusa-lo indefinidamente parecia equivalente, e
 * nao era. Depois de cerca de uma hora o token vence, e as rotas de quiz usam
 * autenticacao opcional: token vencido nao vira 401, vira convidado. A partida
 * era gravada sem conta e ficava de fora do ranking — e o interceptor de
 * resposta, que so renova o token quando ve um 401, nunca era acionado.
 */
export async function tokenParaRequisicao(
  usuario: UsuarioComToken | null | undefined,
  ultimoConhecido: string | null,
): Promise<string | null> {
  // Deslogado: nao mandar o token de quem saiu.
  if (!usuario) return null;

  try {
    return (await usuario.getIdToken()) || null;
  } catch {
    // Sem rede, ou falha do SDK: tenta o ultimo token conhecido, que pode ainda
    // estar valido. No pior caso o servidor trata a requisicao como convidado.
    return ultimoConhecido;
  }
}

/** So o que precisamos do usuario anonimo do Firebase, para testar sem os modulos nativos. */
export interface UsuarioVinculavel<C> {
  isAnonymous: boolean;
  linkWithCredential(credencial: C): Promise<unknown>;
}

/**
 * O que aconteceu ao tentar ligar um login a quem joga sem conta:
 *
 *   - `vinculada`: a credencial virou parte da conta anonima. O uid nao muda,
 *     entao as partidas, a posicao e o cadastro no ranking continuam da pessoa.
 *   - `sem-anonimo`: nao havia conta anonima para ligar; e so entrar.
 *   - `conta-existente`: a credencial ja pertence a outra conta. Entrar nela e o
 *     certo (e a conta antiga da pessoa); o que foi jogado como anonimo fica para
 *     tras, como antes de existir o vinculo.
 */
export type ResultadoDoVinculo = 'vinculada' | 'sem-anonimo' | 'conta-existente';

const JA_PERTENCE_A_OUTRA_CONTA = ['auth/credential-already-in-use', 'auth/email-already-in-use'];

/**
 * Liga um login a conta anonima atual, em vez de troca-la.
 *
 * Sem isto, entrar com Google, Apple ou e-mail criava uma conta nova e largava a
 * anonima: o jogador que estava em 1o no ranking como "Pulsar Firme 14" tocava
 * em Entrar para escolher o apelido e sumia da lista. Visto em 07/10/2026.
 *
 * Erros que nao sejam "ja pertence a outra conta" sobem para quem chamou, que
 * ja sabe traduzi-los (e-mail invalido, senha fraca, rede).
 */
export async function vincularAoAnonimo<C>(
  usuario: UsuarioVinculavel<C> | null | undefined,
  credencial: C,
): Promise<ResultadoDoVinculo> {
  if (!usuario?.isAnonymous) return 'sem-anonimo';
  try {
    await usuario.linkWithCredential(credencial);
    return 'vinculada';
  } catch (erro: any) {
    if (JA_PERTENCE_A_OUTRA_CONTA.includes(erro?.code)) return 'conta-existente';
    throw erro;
  }
}
