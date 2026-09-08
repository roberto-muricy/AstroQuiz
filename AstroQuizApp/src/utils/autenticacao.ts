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
