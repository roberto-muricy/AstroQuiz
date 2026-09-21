# Relatório de uso — setembro de 2026

Fechado em 21/09/2026. Fontes: GA4 (propriedade `496639394`, dados processados
até 19/09) e banco de produção. Como reproduzir: `node scripts/ga4-relatorio.js
2026-09-01 2026-09-21` e as consultas de `phase_results` citadas no fim.

## Tamanho do público

| | |
|---|---|
| Usuários ativos | **77** |
| Novos | **56** |
| Sessões | **142** |
| Telas vistas | 942, por 76 pessoas |

Dois picos, ambos ligados a divulgação ou lançamento: **07/09 com 21 usuários**
(17 novos) e **17–18/09 com 12 e 9**, quando saiu a 1.3.0 com o ranking.

## O funil do quiz

| Etapa | Eventos | Pessoas |
|---|---|---|
| Começaram uma fase (`quiz_start`) | 91 | **29** |
| Abandonaram no meio (`quiz_abandon`) | 26 | **16** |
| Terminaram (`quiz_complete`) | 25 | **12** |

Menos de 4 em cada 10 que começam chegam ao fim. No dia de maior movimento
(07/09): 37 começos por 10 pessoas, 14 abandonos por 8 e **2 conclusões, de uma
única pessoa**.

## Plataformas, versões e países

- **iOS:** 52 usuários, 115 sessões. **Android:** 25 usuários, 27 sessões — quase
  uma sessão por pessoa, ou seja, instalam pelo teste interno e não voltam.
- **Versões:** 1.2.0 (40), 1.1.0 (20), 1.3.1 (12), 1.3.0 (10), 1.2.1 (3), 1.0.0 (2).
  Mais da metade do público está em versão sem ranking.
- **Países:** Brasil 39, Estados Unidos 13, sem país 19 (típico de teste de loja),
  França 3, Espanha 2, e uma pessoa em Alemanha, Moçambique e Uzbequistão.

## Ranking, desde o lançamento em 18/09

| | |
|---|---|
| Abriram o ranking | 27 vezes, **6 pessoas** |
| Cadastraram-se | 6 vezes, **2 pessoas** |
| Login no mês inteiro | 4 vezes, **1 pessoa** |

O ranking depende de conta, e quase ninguém entra em conta.

## Fases (banco, 14 a 21/09)

A tabela `phase_results` só existe desde 14/09, quando o ranking entrou no
backend. No período: **15 fases terminadas, todas nossas** (testes, aparelhos do
Roberto e contas `+teste`), conferidas uma a uma. O banco bate com o GA4 nesse
intervalo — 10 conclusões nossas contra 11 registradas —, o que dá confiança na
medição.

Por fase: a 1 teve 5 partidas, média de 8,8 acertos e 45 s; da 7 à 12, uma
partida cada, de 74 a 148 s. Todas aprovadas.

## Leitura

1. **O gargalo é a primeira fase, não a instalação.** Entram 56 pessoas novas no
   mês, e metade das que começam uma fase abandona no meio.
2. **O ranking chegou a poucos.** Seis pessoas o abriram, duas se cadastraram. Ele
   exige conta, e só uma pessoa fez login no mês.
3. **A base está velha.** A maioria ainda usa 1.1.0 ou 1.2.0, sem ranking.

## Limites

- O GA4 ainda não havia processado 20 e 21/09 quando este relatório foi fechado.
- `averageSessionDuration` e `userEngagementDuration` vieram implausíveis (mais de
  100 min por sessão), o que é comum em apps React Native por causa de tempo em
  segundo plano. Não foram usados.
- Quem joga sem conta só aparece no GA4; no banco, aparece apenas se terminar uma
  fase, e sem identidade.
- Uma afirmação anterior de que "ninguém além de nós jogou" valia só para 14–21/09
  e para fases **terminadas**. O GA4 mostra gente jogando no começo do mês.

## Consultas usadas no banco

```sql
select (finished_at at time zone 'America/Sao_Paulo')::date as dia, count(*),
       count(*) filter (where passed), count(*) filter (where firebase_uid is not null),
       round(avg(score))
from phase_results where finished_at >= '2026-09-01' group by 1 order by 1;

select phase, count(*), round(avg(correct_answers)::numeric,1), round(avg(score)),
       round(avg(total_time_ms)/1000)
from phase_results where finished_at >= '2026-09-01' group by 1 order by 1;
```
