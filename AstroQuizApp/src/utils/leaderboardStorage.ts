/**
 * Cache local do ranking.
 *
 * Serve para a tela abrir mostrando alguma coisa em vez de um vazio enquanto a
 * requisicao vai e volta, e para continuar dizendo algo quando o aparelho esta
 * sem rede.
 *
 * O que fica guardado tem data. A tela usa `estaFresco` para decidir se mostra
 * o que tem como atual ou avisa que e de antes — dado velho apresentado como
 * novo seria pior do que nao mostrar nada, porque posicao no ranking muda.
 *
 * Nao guarda configuracoes do jogador nem nada por conta: e so uma copia do que
 * o servidor respondeu, por recorte e pais.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@leaderboard_cache_v1';

/** Depois disso o que esta guardado vale so como "ultima vez que vi". */
export const VALIDADE_DO_CACHE_MS = 5 * 60 * 1000;

/**
 * Quantos recortes guardar. Sao 3 recortes x (mundo + pais), entao 8 cobre o
 * uso normal e ainda deixa folga; o mais antigo sai quando estoura.
 */
const LIMITE_DE_RECORTES = 8;

export interface PaginaGuardada<T> {
  pagina: T;
  /** ISO. Quando o servidor respondeu isto. */
  salvoEm: string;
}

type Cache<T> = Record<string, PaginaGuardada<T>>;

/** Uma chave por recorte e pais: o mundo e o Brasil sao listas diferentes. */
export const chaveDoRecorte = (recorte: string, pais?: string | null): string =>
  `${recorte}:${(pais || 'mundo').toUpperCase()}`;

export function estaFresco(
  guardada: PaginaGuardada<unknown> | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!guardada?.salvoEm) return false;
  const quando = new Date(guardada.salvoEm).getTime();
  if (Number.isNaN(quando)) return false;
  return agora.getTime() - quando < VALIDADE_DO_CACHE_MS;
}

async function lerCache<T>(): Promise<Cache<T>> {
  try {
    const salvo = await AsyncStorage.getItem(CACHE_KEY);
    const lido = salvo ? JSON.parse(salvo) : null;
    return lido && typeof lido === 'object' ? (lido as Cache<T>) : {};
  } catch (error) {
    console.warn('Erro ao ler o cache do ranking:', error);
    return {};
  }
}

export const LeaderboardStorage = {
  /** A ultima pagina guardada para este recorte, com ou sem validade. */
  async ler<T>(recorte: string, pais?: string | null): Promise<PaginaGuardada<T> | null> {
    const cache = await lerCache<T>();
    return cache[chaveDoRecorte(recorte, pais)] || null;
  },

  async guardar<T>(
    recorte: string,
    pais: string | null | undefined,
    pagina: T,
    agora: Date = new Date(),
  ): Promise<void> {
    try {
      const cache = await lerCache<T>();
      cache[chaveDoRecorte(recorte, pais)] = { pagina, salvoEm: agora.toISOString() };

      // Passou do limite: sai o mais antigo.
      const chaves = Object.keys(cache);
      if (chaves.length > LIMITE_DE_RECORTES) {
        chaves
          .sort((a, b) => Date.parse(cache[a].salvoEm) - Date.parse(cache[b].salvoEm))
          .slice(0, chaves.length - LIMITE_DE_RECORTES)
          .forEach((chave) => delete cache[chave]);
      }

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Erro ao guardar o cache do ranking:', error);
    }
  },

  /** Usado ao sair da conta e ao apagar os dados do ranking. */
  async limpar(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Erro ao limpar o cache do ranking:', error);
    }
  },
};
