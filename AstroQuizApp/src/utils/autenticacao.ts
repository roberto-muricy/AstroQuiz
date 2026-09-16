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
