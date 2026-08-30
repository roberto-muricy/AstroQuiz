/**
 * A cota de pulos.
 *
 * O paywall prometia "Pulos Ilimitados" e o código entregava exatamente isso ao
 * assinante (`canUseSkip = !adsEnabled || ...`). Só que as fases 41-50 exigem
 * 85% de acerto: com pulo sem limite o Pro chegaria à fase 50 sem responder
 * nada difícil, e patente, XP e ranking deixariam de significar qualquer coisa.
 *
 * A cota é por fase para os dois planos, seguindo o modelo das ajudas do Show
 * do Milhão — a ajuda pertence à partida, não a uma cota diária de consumo.
 *
 * Estes testes fixam o contrato: a cota volta em toda fase, o Pro leva mais que
 * o gratuito, e ninguém é ilimitado.
 */
import { calcularPulosRestantes, PHASE_LIMITS } from '../AdsContext';

const GRATIS = false;
const PRO = true;

describe('calcularPulosRestantes', () => {
  describe('usuário grátis', () => {
    it('entra em cada fase com a cota cheia', () => {
      expect(calcularPulosRestantes(GRATIS, 0)).toBe(PHASE_LIMITS.free);
    });

    it('acaba ao gastar a cota da fase', () => {
      expect(calcularPulosRestantes(GRATIS, PHASE_LIMITS.free)).toBe(0);
    });

    it('nunca fica negativo', () => {
      expect(calcularPulosRestantes(GRATIS, PHASE_LIMITS.free + 5)).toBe(0);
    });
  });

  describe('assinante Pro', () => {
    it('entra em cada fase com a cota cheia', () => {
      expect(calcularPulosRestantes(PRO, 0)).toBe(PHASE_LIMITS.pro);
    });

    it('desconta dentro da fase', () => {
      expect(calcularPulosRestantes(PRO, 1)).toBe(PHASE_LIMITS.pro - 1);
    });

    it('NÃO é ilimitado: acaba ao gastar a cota da fase', () => {
      expect(calcularPulosRestantes(PRO, PHASE_LIMITS.pro)).toBe(0);
    });
  });

  describe('relação entre os planos', () => {
    it('o Pro leva mais pulos que o gratuito — é o que o paywall promete', () => {
      expect(PHASE_LIMITS.pro).toBeGreaterThan(PHASE_LIMITS.free);
    });

    it('nenhum dos dois chega perto das 10 perguntas da fase', () => {
      // Se a cota se aproximar de 10, o jogador atravessa a fase sem responder
      // nada — e a precisão exigida pelas fases Elite deixa de filtrar.
      expect(PHASE_LIMITS.pro).toBeLessThan(5);
    });

    it('a cota do gratuito ainda permite passar nas fases iniciais', () => {
      // Com 1 pulo em 10 perguntas o teto é 90%, acima dos 60% da fase 1.
      const tetoDeAcerto = (10 - PHASE_LIMITS.free) / 10;
      expect(tetoDeAcerto).toBeGreaterThanOrEqual(0.6);
    });
  });
});
