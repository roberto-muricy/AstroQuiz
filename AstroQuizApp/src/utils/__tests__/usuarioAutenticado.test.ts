/**
 * O app tem TRES estados de usuario, nao dois:
 *
 *   - logado de verdade (id do Firebase)
 *   - convidado, com um id gerado `anon_…`
 *   - pos-falha de carregamento, com o id fixo `guest`
 *
 * Como os dois ultimos preenchem `user`, um `if (user)` os trata como logados.
 * Foi assim que a propriedade de analytics `autenticado` nasceu respondendo
 * "sim" para todo mundo — o codigo compilava, os testes passavam, e so o log
 * do Firebase no simulador mostrou `autenticado, sim` sem ninguem ter logado.
 *
 * Este teste existe para essa distincao nao se perder de novo.
 */

import { ehUsuarioAutenticado } from '@/utils/autenticacao';

describe('ehUsuarioAutenticado', () => {
  it('reconhece quem logou de verdade', () => {
    expect(ehUsuarioAutenticado({ id: 'aBc123FirebaseUid' })).toBe(true);
  });

  it('convidado NAO conta como logado', () => {
    expect(ehUsuarioAutenticado({ id: 'anon_1788871866923_tyfltinmv5f' })).toBe(false);
  });

  it('o estado de falha `guest` NAO conta como logado', () => {
    expect(ehUsuarioAutenticado({ id: 'guest' })).toBe(false);
  });

  it('sem usuario nao conta como logado', () => {
    expect(ehUsuarioAutenticado(null)).toBe(false);
    expect(ehUsuarioAutenticado(undefined)).toBe(false);
  });

  it('um id que apenas CONTEM anon_ continua sendo login', () => {
    // A regra e prefixo, nao substring: um uid legitimo que por acaso tenha
    // "anon_" no meio nao pode ser rebaixado a convidado.
    expect(ehUsuarioAutenticado({ id: 'xyanon_123' })).toBe(true);
  });
});
