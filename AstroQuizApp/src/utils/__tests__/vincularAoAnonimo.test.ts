/**
 * Quem joga sem conta tem um uid anonimo do Firebase, e e nele que ficam as
 * partidas e o cadastro no ranking. Entrar com uma conta nova precisa ligar o
 * login a esse uid, nao troca-lo — senao a pessoa some do ranking ao tocar em
 * "Entrar para escolher seu apelido".
 */

import { vincularAoAnonimo } from '@/utils/autenticacao';

const anonimo = (link: jest.Mock) => ({ isAnonymous: true, linkWithCredential: link });

describe('vincularAoAnonimo', () => {
  it('liga a credencial a conta anonima, mantendo o uid', async () => {
    const link = jest.fn().mockResolvedValue({});
    await expect(vincularAoAnonimo(anonimo(link), 'credencial')).resolves.toBe('vinculada');
    expect(link).toHaveBeenCalledWith('credencial');
  });

  it('sem ninguem no Firebase, so manda entrar', async () => {
    await expect(vincularAoAnonimo(null, 'credencial')).resolves.toBe('sem-anonimo');
  });

  it('com uma conta de verdade ja aberta, nao tenta ligar nada', async () => {
    const link = jest.fn();
    await expect(
      vincularAoAnonimo({ isAnonymous: false, linkWithCredential: link }, 'credencial'),
    ).resolves.toBe('sem-anonimo');
    expect(link).not.toHaveBeenCalled();
  });

  it.each(['auth/credential-already-in-use', 'auth/email-already-in-use'])(
    'credencial que ja e de outra conta (%s) manda entrar nela',
    async (code) => {
      const link = jest.fn().mockRejectedValue({ code });
      await expect(vincularAoAnonimo(anonimo(link), 'credencial')).resolves.toBe('conta-existente');
    },
  );

  it('outros erros sobem para quem chamou traduzir', async () => {
    const link = jest.fn().mockRejectedValue({ code: 'auth/weak-password' });
    await expect(vincularAoAnonimo(anonimo(link), 'credencial')).rejects.toEqual({
      code: 'auth/weak-password',
    });
  });
});
