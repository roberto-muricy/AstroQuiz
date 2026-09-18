/**
 * Em 18/09/2026 o simulador exibia "Conectado como robertomuricy+teste…" com
 * uma conta que ja nao existia no Firebase: tinha sido apagada e recriada em
 * outro aparelho. Uma fase perfeita, de 690 pontos, entrou como convidado e
 * ficou fora do ranking, sem aviso. E o botao Sair nao fazia nada.
 *
 * `sessaoPerdida` e a regra que decide quando a tela e o Firebase discordam.
 * Ela precisa acertar dos dois lados: deixar de avisar repete o bug, e avisar
 * demais tira do login quem esta conectado de verdade.
 */

import { sessaoPerdida } from '@/utils/autenticacao';

const LOGADO = { id: 'aBc123FirebaseUid' };

describe('sessaoPerdida', () => {
  it('a conta exibida sumiu do Firebase: sessao perdida (o caso de 18/09)', () => {
    expect(sessaoPerdida(LOGADO, null, false)).toBe(true);
  });

  it('Firebase com a mesma conta exibida: tudo certo', () => {
    expect(sessaoPerdida(LOGADO, 'aBc123FirebaseUid', false)).toBe(false);
  });

  it('Firebase com OUTRA conta: sessao perdida, porque o token seria de outra pessoa', () => {
    expect(sessaoPerdida(LOGADO, 'outroUid', false)).toBe(true);
  });

  it('saindo ou excluindo a conta de proposito: sem aviso', () => {
    expect(sessaoPerdida(LOGADO, null, true)).toBe(false);
    expect(sessaoPerdida(LOGADO, 'outroUid', true)).toBe(false);
  });

  it('convidado nunca perde sessao, com ou sem alguem no Firebase', () => {
    const convidado = { id: 'anon_1788871866923_tyfltinmv5f' };
    expect(sessaoPerdida(convidado, null, false)).toBe(false);
    // No meio do login o Firebase ja tem o usuario e a tela ainda mostra o
    // convidado. Nao e sessao perdida: o proprio login atualiza a tela.
    expect(sessaoPerdida(convidado, 'aBc123FirebaseUid', false)).toBe(false);
  });

  it('o estado `guest` e a tela ainda carregando tambem nao contam', () => {
    expect(sessaoPerdida({ id: 'guest' }, null, false)).toBe(false);
    expect(sessaoPerdida(null, null, false)).toBe(false);
    expect(sessaoPerdida(undefined, 'aBc123FirebaseUid', false)).toBe(false);
  });
});
