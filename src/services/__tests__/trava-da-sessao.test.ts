/**
 * comTravaDaSessao: o toque e o tempo esgotado chegando juntos contavam a mesma
 * pergunta duas vezes, porque as duas requisicoes liam o mesmo estado antes de
 * gravar.
 */

import { comTravaDaSessao } from '../quiz-session';

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('comTravaDaSessao', () => {
  it('executa uma tarefa por vez na mesma sessao, na ordem de chegada', async () => {
    const eventos: string[] = [];
    const tarefa = (nome: string, ms: number) =>
      comTravaDaSessao('quiz_1_mesma_sessao', async () => {
        eventos.push(`inicio ${nome}`);
        await esperar(ms);
        eventos.push(`fim ${nome}`);
        return nome;
      });

    expect(await Promise.all([tarefa('a', 30), tarefa('b', 1), tarefa('c', 1)])).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(eventos).toEqual(['inicio a', 'fim a', 'inicio b', 'fim b', 'inicio c', 'fim c']);
  });

  it('sessoes diferentes nao esperam uma pela outra', async () => {
    const eventos: string[] = [];
    const tarefa = (sessao: string, nome: string, ms: number) =>
      comTravaDaSessao(sessao, async () => {
        eventos.push(`inicio ${nome}`);
        await esperar(ms);
        eventos.push(`fim ${nome}`);
      });

    await Promise.all([tarefa('quiz_1_uma', 'a', 30), tarefa('quiz_1_outra', 'b', 1)]);
    expect(eventos).toEqual(['inicio a', 'inicio b', 'fim b', 'fim a']);
  });

  it('uma tarefa que falha libera a vez da proxima', async () => {
    const falha = comTravaDaSessao('quiz_1_com_erro', async () => {
      throw new Error('falhou');
    });
    const depois = comTravaDaSessao('quiz_1_com_erro', async () => 'seguiu');

    await expect(falha).rejects.toThrow('falhou');
    await expect(depois).resolves.toBe('seguiu');
  });
});
