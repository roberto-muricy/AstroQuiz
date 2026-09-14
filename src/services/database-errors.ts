/**
 * Reconhece erros de banco pelo significado, igual em Postgres e SQLite.
 */

/** Postgres (42P01) e SQLite descrevem assim a tabela que nao existe. */
export function eTabelaInexistente(erro: any): boolean {
  return erro?.code === '42P01' || /no such table/i.test(String(erro?.message));
}

/**
 * Violacao de unicidade. Com `coluna`, so quando a restricao envolve aquela
 * coluna: o Postgres a cita em `detail`, o SQLite na mensagem.
 */
export function eViolacaoDeUnicidade(erro: any, coluna?: string): boolean {
  const eUnicidade =
    erro?.code === '23505' || /UNIQUE constraint failed/i.test(String(erro?.message));
  if (!eUnicidade) return false;
  if (!coluna) return true;
  return [erro?.detail, erro?.message, erro?.constraint]
    .filter(Boolean)
    .join(' ')
    .includes(coluna);
}
