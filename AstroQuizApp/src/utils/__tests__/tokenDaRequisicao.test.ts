/**
 * O token ia junto de cada requisicao, mas era o mesmo token para sempre.
 *
 * O `api.ts` pedia o token ao Firebase uma unica vez e guardava em memoria.
 * Depois de cerca de uma hora ele vence — e as rotas de quiz usam autenticacao
 * opcional, entao token vencido nao devolve 401: devolve 200 tratando quem jogou
 * como convidado. A fase era gravada sem conta, ficava fora do ranking, e o
 * interceptor de resposta, que so renova quando ve um 401, nunca era acionado.
 *
 * Estes testes prendem o comportamento novo: perguntar ao SDK a cada
 * requisicao, sem forcar ida a rede, e nao mandar o token de quem ja saiu.
 */

import { tokenParaRequisicao } from '@/utils/autenticacao';

function usuarioQueDevolve(...tokens: string[]) {
  const chamadas: Array<boolean | undefined> = [];
  let i = 0;
  return {
    chamadas,
    getIdToken: jest.fn(async (forcar?: boolean) => {
      chamadas.push(forcar);
      return tokens[Math.min(i++, tokens.length - 1)];
    }),
  };
}

it('pergunta ao SDK a cada requisicao, em vez de reusar o que esta em memoria', async () => {
  const usuario = usuarioQueDevolve('token-1', 'token-2');

  expect(await tokenParaRequisicao(usuario, null)).toBe('token-1');
  expect(await tokenParaRequisicao(usuario, 'token-1')).toBe('token-2');
  expect(usuario.getIdToken).toHaveBeenCalledTimes(2);
});

it('nao forca ida a rede: quem decide renovar e o SDK', async () => {
  const usuario = usuarioQueDevolve('token-1');

  await tokenParaRequisicao(usuario, null);

  // Sem argumento (ou com false): `true` buscaria um token novo toda vez.
  expect(usuario.chamadas).toEqual([undefined]);
});

it('deslogado nao manda o token de quem saiu', async () => {
  expect(await tokenParaRequisicao(null, 'token-de-antes')).toBeNull();
  expect(await tokenParaRequisicao(undefined, 'token-de-antes')).toBeNull();
});

it('falha do SDK cai para o ultimo token conhecido', async () => {
  const usuario = {
    getIdToken: jest.fn(async () => {
      throw new Error('sem rede');
    }),
  };

  expect(await tokenParaRequisicao(usuario, 'token-de-antes')).toBe('token-de-antes');
  expect(await tokenParaRequisicao(usuario, null)).toBeNull();
});

it('token vazio conta como ausente', async () => {
  const usuario = { getIdToken: jest.fn(async () => '') };

  expect(await tokenParaRequisicao(usuario, null)).toBeNull();
});
