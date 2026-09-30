# Relatório de uso — 18 a 27 de setembro de 2026

Fechado em 29/09/2026. Cobre desde o lançamento do ranking (18/09) até o
último dia que o GA4 já processou (27/09 — leva ~2 dias). Fontes: GA4
(propriedade `496639394`) e banco de produção. Como reproduzir: `node
scripts/ga4-relatorio.js 2026-09-18 2026-09-28` e as consultas de
`phase_results` citadas no fim.

## Tamanho do público

| | |
|---|---|
| Usuários ativos | **~30**, quase metade em cada plataforma (Android 16, iOS 14) |
| Novas instalações (`first_open`) | **18** |
| Sessões | Android 26, iOS 24 |
| Telas vistas | 199, por 28 pessoas |

O ritmo caiu ao longo do período: 9 usuários em 18/09, 0 em 20/09, fechando em
2 em 27/09. Não houve pico novo desde o lançamento do ranking.

| Dia | Ativos | Novos | Sessões |
|---|---|---|---|
| 18/09 | 9 | 2 | 15 |
| 19/09 | 8 | 6 | 10 |
| 20/09 | 0 | 0 | 1 |
| 21/09 | 5 | 0 | 5 |
| 22/09 | 6 | 4 | 8 |
| 23/09 | 3 | 3 | 5 |
| 24/09 | 2 | 0 | 3 |
| 25/09 | 1 | 1 | 1 |
| 26/09 | 2 | 0 | 2 |
| 27/09 | 2 | 2 | 2 |

## Logins e cadastro

**4 logins de verdade** (Google, Apple ou e-mail), por **2 pessoas**, no
período inteiro. É o número mais baixo do relatório, e explica por que o
ranking segue quase vazio: hoje só quem faz login **e** abre a aba Ranking
aparece nele. O login anônimo da 1.3.2 existe para resolver isso, mas ainda
não teve tempo de gerar dado de uso — ver seção "O que ainda não dá para
medir".

Abriram a aba Ranking 9 pessoas (31 vezes); 1 pessoa se cadastrou (5 vezes,
provavelmente reabrindo a tela).

## O funil do quiz

| Etapa | Eventos | Pessoas |
|---|---|---|
| Começaram uma fase (`quiz_start`) | 22 | 9 |
| Terminaram (`quiz_complete`) | 11 | 4 |
| Abandonaram no meio (`quiz_abandon`) | 5 | 4 |

## Até que fase o público joga

Aqui o GA4 não ajuda tanto quanto o banco, porque `phase_results` guarda o
histórico completo desde 14/09/2026, com a fase de cada partida.

**A resposta honesta: ainda não dá para saber**, porque quase ninguém de fora
jogou uma fase até o fim ainda.

- **Só 4 contas com login já terminaram alguma fase desde que o histórico
  existe**, e são todas nossas — conferidas uma a uma contra o cadastro no
  ranking: a conta pessoal (fase 13, todas aprovadas), e as três `+teste`
  (fases 11, 4 e 1). Nenhuma conta externa apareceu.
- **8 sessões de convidado** (sem login) chegaram até a fase 8, todas
  aprovadas — pode ser gente de fora ou teste nosso; sem conta não dá para
  saber quem é.
- No total, **12 fases terminadas** desde 14/09/2026, concentradas na fase 1
  (5 partidas) e caindo depois. Todas as que existem foram aprovadas — não é
  sinal de que o jogo é fácil, é sinal de que só jogou até o fim quem já
  queria jogar.

| Fase | Partidas | Aprovadas | Média de acertos |
|---|---|---|---|
| 1 | 5 | 5 | 8,8 |
| 2 | 2 | 2 | 10,0 |
| 3 | 1 | 1 | 10,0 |
| 4 | 1 | 1 | 10,0 |
| 7 | 1 | 1 | 10,0 |
| 8 | 1 | 1 | 7,0 |
| 9 | 1 | 1 | 9,0 |
| 10 | 1 | 1 | 10,0 |
| 11 | 1 | 1 | 7,0 |
| 12 | 1 | 1 | 8,0 |
| 13 | 2 | 2 | 7,0 |

## Plataformas, versões e países

- **Versões:** 1.3.1 (16), 1.3.0 (8), **1.3.2 (8)**, 1.1.0 (1). A 1.3.2 já
  aparece — é o Teste interno do Android, ainda sem gente de fora.
- **Países:** Brasil 12, sem país 9 (típico de teste fechado), Estados
  Unidos 7, Alemanha 1.

## Leitura

1. **O gargalo continua sendo gente chegando, não retenção.** 18 instalações
   em 10 dias é pouco, e o ritmo está caindo, não subindo.
2. **"Até que fase jogam" ainda não é uma pergunta que o produto responde**,
   porque a amostra de gente de fora que terminou uma fase é de zero contas
   e poucos convidados.
3. **O teste fechado do Android ainda não começou de verdade.** A revisão do
   Google passou em 21/09, mas o convite só foi enviado bem depois — os 14
   dias contínuos exigidos para produção só contam a partir de quando as
   pessoas aceitarem.
4. **O login anônimo (1.3.2) é a aposta para o próximo relatório.** Ele
   elimina o duplo requisito de login + abrir a aba Ranking. Vale reler este
   relatório perto de 10 dias depois de as 1.3.2 chegarem a gente de fora.

## O que ainda não dá para medir

- O efeito do login anônimo: a 1.3.2 só está no Teste interno do Android
  (sem gente de fora) e aguardando a revisão da Apple no iOS.
- Se o cansaço de emendar fases é real: quase ninguém jogou mais de uma fase
  na mesma sessão ainda para dar uma amostra.
- Downloads exatos por loja: bloqueado por API dos dois lados (a chave da
  App Store Connect recebe 403 em `analyticsReportRequests`; não há acesso à
  API da Play Console configurado). `first_open` do GA4 é a aproximação
  usada aqui.

## Consultas usadas no banco

```sql
-- maior fase por conta com login, ligada ao cadastro do ranking
select pr.firebase_uid, max(pr.phase) as maior_fase, lp.public_id,
       lp.hidden_by_admin
from phase_results pr
left join leaderboard_players lp on lp.firebase_uid = pr.firebase_uid
where pr.firebase_uid is not null
group by pr.firebase_uid, lp.public_id, lp.hidden_by_admin
order by maior_fase desc;

-- convidados (sem conta)
select max(phase) as maior_fase, count(*) as partidas,
       count(*) filter (where passed) as aprovadas
from phase_results where firebase_uid is null;

-- por fase, todas as contas e convidados
select phase, count(*) as partidas, count(*) filter (where passed) as aprovadas,
       round(avg(correct_answers)::numeric,1) as media_acertos
from phase_results group by phase order by phase;
```

Relatório anterior: `docs/relatorio-setembro-2026.md`.
