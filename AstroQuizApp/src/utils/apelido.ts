/**
 * Regras de apelido que dá para conferir no aparelho, para o erro aparecer
 * enquanto a pessoa digita em vez de depois de uma ida ao servidor.
 *
 * Só o FORMATO mora aqui — tamanho, caracteres e quantidade de letras — e os
 * motivos têm os mesmos nomes que o servidor devolve, para a tela ter uma
 * mensagem só por motivo.
 *
 * O conteúdo fica de fora de propósito: o filtro de palavras (quatro idiomas) e
 * os nomes reservados vivem no servidor, e duplicá-los aqui criaria duas
 * listas para manter, que divergiriam na primeira mudança. A tela mostra o
 * `reason` que vier na resposta. Quem decide é sempre o servidor: isto aqui é
 * conveniência, não autoridade.
 */

export const TAMANHO_MINIMO = 3;
export const TAMANHO_MAXIMO = 20;
const MINIMO_DE_LETRAS = 2;

/** Os mesmos nomes do servidor, menos os que só ele sabe julgar. */
export type MotivoLocal = 'too_short' | 'too_long' | 'invalid_characters' | 'too_few_letters';

/**
 * Uma união discriminada (`{ok:true, apelido} | {ok:false, motivo}`) seria mais
 * precisa, e é o que o servidor usa. Aqui não dá: o app compila com
 * `strict: false`, e sem `strictNullChecks` o TypeScript não estreita o `ok` —
 * toda tela que lesse `motivo` precisaria de um cast. Campos opcionais
 * funcionam nos dois modos.
 */
export interface ResultadoDoApelido {
  ok: boolean;
  /** Preenchido quando `ok`: o apelido já limpo, pronto para enviar. */
  apelido?: string;
  /** Preenchido quando não `ok`. */
  motivo?: MotivoLocal;
}

/** Mesma limpeza do servidor: NFC, sem espaço nas pontas, sem espaço repetido. */
export function limparApelido(entrada: string): string {
  return String(entrada ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validarApelidoLocalmente(entrada: string): ResultadoDoApelido {
  const apelido = limparApelido(entrada);
  const tamanho = [...apelido].length;

  if (tamanho < TAMANHO_MINIMO) return { ok: false, motivo: 'too_short' };
  if (tamanho > TAMANHO_MAXIMO) return { ok: false, motivo: 'too_long' };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(apelido)) return { ok: false, motivo: 'invalid_characters' };
  if ((apelido.match(/\p{L}/gu) ?? []).length < MINIMO_DE_LETRAS) {
    return { ok: false, motivo: 'too_few_letters' };
  }

  return { ok: true, apelido };
}

/**
 * Quanto falta para o apelido caber, contando em caracteres — e não em bytes,
 * senão um emoji ou uma letra acentuada contaria mais de uma vez no contador
 * que a pessoa vê enquanto digita.
 */
export function caracteresRestantes(entrada: string): number {
  return TAMANHO_MAXIMO - [...limparApelido(entrada)].length;
}
