# Relatório de uso — 28 de setembro a 17 de outubro de 2026

Fechado em 18/10/2026. Cobre os 20 dias desde o fim do relatório anterior
(`relatorio-pos-ranking-29-set-2026.md`, 18 a 27/09). Os dias 16 e 17/10 ainda
podem crescer no GA4, que leva cerca de 2 dias para fechar. Fontes: GA4
(propriedade `496639394`), banco de produção, Sentry e App Store Connect. Como
reproduzir: `node scripts/ga4-relatorio.js 2026-09-28 2026-10-17`,
`node scripts/sentry-issues.js 14` e as consultas do fim.

## O que mudou no período

- **30/09:** iOS 1.3.2 liberada, com o login anônimo. É a primeira versão
  pública em que quem joga sem conta entra no ranking.
- **07/10:** convite do teste fechado do Android reenviado aos testadores.
- **08 a 09/10:** Android 1.3.3 (64) no Teste interno e iOS 1.3.3 (53) enviada
  à Apple. Com ela, quem joga sem conta vê com que nome aparece no ranking e
  mantém a posição ao criar conta.
- **Hoje:** a iOS 1.3.3 já foi **aprovada** e está parada esperando liberação
  manual (`PENDING_DEVELOPER_RELEASE`). Ninguém fora do teste a recebeu ainda.

## Tamanho do público

| | 18–27/09 (10 dias) | 28/09–17/10 (20 dias) |
|---|---|---|
| Usuários ativos | ~30 | **34** (Android 17, iOS 17) |
| Novas instalações (`first_open`) | 18 | **22** |
| Instalações por dia | 1,8 | **1,1** |
| Desinstalações (`app_remove`, só Android) | — | 2 |

O ritmo de instalações caiu à metade. Dos 20 dias, 8 tiveram zero usuários
(28 e 29/09; 04, 05, 11, 13, 14 e 16/10). O único pico foi de **07 a 09/10**
(13, 6 e 4 usuários; 12 instalações), que coincide com o reenvio do convite do
teste fechado. Ou seja: foram testadores chegando, não gente de fora.

| Dia | Ativos | Novos | Sessões |
|---|---|---|---|
| 30/09 | 2 | 0 | 4 |
| 01/10 | 1 | 1 | 1 |
| 02/10 | 1 | 0 | 0 |
| 03/10 | 2 | 2 | 2 |
| 06/10 | 2 | 0 | 2 |
| 07/10 | 13 | 6 | 18 |
| 08/10 | 6 | 4 | 8 |
| 09/10 | 4 | 2 | 4 |
| 10/10 | 1 | 0 | 1 |
| 12/10 | 2 | 2 | 2 |
| 15/10 | 3 | 1 | 4 |
| 17/10 | 5 | 2 | 6 |

Quem usa fica: 36 sessões engajadas, **265 s em média** por sessão e 120
minutos no total.

## O login anônimo funcionou

É a principal mudança desde o relatório anterior.

| | Antes (14–27/09) | Agora (28/09–17/10) |
|---|---|---|
| Partidas de convidado sem conta (fora do ranking) | 8 | **0** |
| Cadastros no ranking | 4, todos nossos | **18** (17 visíveis; 3 ocultos pelo admin são contas de teste) |
| Apelidos escolhidos | — | 0 (todos usam o nome sorteado) |

Todas as 22 partidas terminadas no período estão ligadas a uma conta. Antes,
quem jogava sem login ficava fora do ranking. Os cadastros novos se concentram
na semana de 05/10 (10 de 12), a mesma do pico de testadores.

**O vínculo da 1.3.3 ainda não foi usado por ninguém de fora.** A única conta
anônima que virou conta com login foi o nosso teste de 08/10. Nenhum jogador
de fora tem a 1.3.3 ainda: no iOS ela não foi liberada, e no Android está só
no teste.

## Logins

**2 logins de verdade, por 2 pessoas**, no período inteiro (antes: 4 logins
por 2 pessoas). O botão "Entrar" do cartão do ranking foi tocado 2 vezes, por
1 pessoa. O login continua raro, e com o anônimo deixou de ser necessário
para aparecer no ranking.

## Até que fase o público joga

**7 contas terminaram ao menos uma fase**, 22 partidas no total, 20 aprovadas.

| Conta (hash) | Tipo | Dias | Partidas | Maior fase |
|---|---|---|---|---|
| `f0af5e` | anônima | 15 a 17/10 | **14** | **13** |
| `c3090b` | anônima | 07 a 08/10 | 3 | 5 |
| `21362a` | anônima | 10/10 | 1 | 5 |
| `4b04e9` | login (nosso teste de vínculo) | 08/10 | 1 | 2 |
| `8f73b4` | login | 07/10 | 1 | 1 |
| `a8cdf7` | anônima | 03/10 | 1 | 1 |
| `3f2001` | anônima | 06/10 | 1 | 1 |

- **Pela primeira vez alguém foi longe:** `f0af5e` jogou 14 partidas em 3 dias
  e chegou à fase 13. Se não for conta nossa, é o primeiro jogador de fora com
  retenção de verdade. A conta é anônima, então o banco não diz de quem é.
- **Primeira reprovação registrada:** fase 13, com 5 de 10. A fase 9 também
  precisou de uma segunda tentativa. Até o relatório anterior, todas as
  partidas tinham sido aprovadas.
- A média de acertos cai da fase 1 (8,5) para a faixa de 6 a 7 a partir da
  fase 4. A dificuldade está subindo como deveria.

| Fase | Partidas | Aprovadas | Média de acertos |
|---|---|---|---|
| 1 | 4 | 4 | 8,5 |
| 2 | 2 | 2 | 9,0 |
| 3 | 2 | 2 | 8,5 |
| 4 | 2 | 2 | 6,5 |
| 5 | 3 | 3 | 6,7 |
| 6 | 1 | 1 | 10,0 |
| 7 | 1 | 1 | 6,0 |
| 8 | 1 | 1 | 7,0 |
| 9 | 2 | 1 | 6,5 |
| 10 | 1 | 1 | 7,0 |
| 11 | 1 | 1 | 8,0 |
| 12 | 1 | 1 | 9,0 |
| 13 | 1 | 0 | 5,0 |

No GA4, o funil fica assim: 9 pessoas começaram uma fase (33 vezes), 6
terminaram (22 vezes) e 2 abandonaram no meio (3 vezes).

## Ranking

- Aberto por **12 pessoas, 51 vezes**; 5 pessoas trocaram filtros (22 vezes).
- **Semana atual (desde 13/10): só 1 jogador**, com 4.936 pontos. É a
  situação que a 1.3.3 trata: com a semana vazia, ou quase, o ranking abre no
  geral.
- **Nenhuma denúncia de apelido**, o que é esperado sem nenhum apelido
  escolhido.

## Erros (Sentry)

**Nenhum erro novo desde 23/09.** O único que ainda aparece como aberto é o
REACT-NATIVE-3 ("Unable to open URL", só iOS, visto pela última vez em
23/09). A correção está na 1.3.3. Depois da liberação, se ele não voltar em
2 semanas, pode ser marcado como resolvido.

## Plataformas, versões e países

- **Versões:** 1.3.2 (24 usuários), **1.3.3 (8)** (testadores e nós),
  1.3.1 (3), 1.2.0 (1), 1.0.0 (1).
- **Países:** Brasil 17, sem país 8 (típico de teste), Estados Unidos 4,
  Portugal 2, Irlanda 1, Coreia do Sul 1.

## Leitura

1. **O login anônimo resolveu o ranking vazio por falta de cadastro.** Toda
   partida agora conta, e o ranking passou de 4 cadastros (todos nossos) para
   17 visíveis.
2. **O gargalo continua sendo gente chegando.** 22 instalações em 20 dias, e
   metade delas veio do pico dos testadores. Sem divulgação, o app recebe
   cerca de 1 instalação por dia.
3. **Há o primeiro sinal de retenção real**, se a conta `f0af5e` não for
   nossa: 14 fases em 3 dias. Vale confirmar.
4. **A 1.3.3 está pronta e parada.** Liberar o iOS é o que coloca o cartão
   "Você aparece como…", o vínculo de conta e a correção de links na mão de
   quem já joga.

## Próximos passos

- Liberar a iOS 1.3.3 (está aprovada).
- Promover a Android 1.3.3 (64) para o Teste fechado e completar 12
  testadores ativos por 14 dias, para liberar a produção.
- Próximo relatório: medir o vínculo (contas anônimas que viram login) e
  quantos jogadores escolhem apelido, cerca de 2 semanas depois da liberação
  da 1.3.3.

## Consultas usadas no banco

As contas aparecem como os 6 primeiros caracteres do SHA-256 do uid: nenhum
identificador sai do banco. "Anônima" é uma conta com uid e sem perfil;
"login" é uma conta com perfil em `user_profiles`, que só é criado no login
de verdade.

```sql
-- partidas por semana e tipo de conta
select date_trunc('week', pr.finished_at at time zone 'America/Sao_Paulo')::date as semana,
       case when pr.firebase_uid is null then 'convidado'
            when exists (select 1 from user_profiles u where u.firebase_uid = pr.firebase_uid) then 'login'
            else 'anonimo' end as tipo,
       count(*) as partidas, count(distinct pr.firebase_uid) as contas
from phase_results pr
where pr.finished_at >= '2026-09-28'
group by 1, 2 order by 1, 2;

-- por fase
select phase, count(*) as partidas, count(*) filter (where passed) as aprovadas,
       round(avg(correct_answers)::numeric, 1) as media_acertos
from phase_results where finished_at >= '2026-09-28'
group by phase order by phase;

-- cadastros no ranking
select count(*) as total, count(*) filter (where visible) as visiveis,
       count(*) filter (where nickname is not null) as com_apelido,
       count(*) filter (where hidden_by_admin) as ocultos
from leaderboard_players;

-- contas anônimas que viraram login (perfil criado depois da 1ª partida)
select count(*) from (
  select pr.firebase_uid from phase_results pr
  join user_profiles u on u.firebase_uid = pr.firebase_uid
  group by pr.firebase_uid
  having min(u.created_at) > min(pr.finished_at) + interval '1 minute'
) x;
```

Relatório anterior: `docs/relatorio-pos-ranking-29-set-2026.md`.

## Atualização de 21/10/2026 — os 3 primeiros dias com a iOS 1.3.3

A iOS 1.3.3 foi liberada em 18/10. Este trecho cobre de 18 a 20/10. É cedo
demais para medir o efeito dela; serve para ver se algo quebrou e quem
continuou jogando. Os dias 19 e 20 ainda podem crescer no GA4.

| | 18–20/10 |
|---|---|
| Usuários ativos | 4, **todos no iOS** (nenhum Android) |
| Novas instalações | 3 |
| Na 1.3.3 | 2 dos 4 |
| Sessões engajadas | 8, média de **392 s** (antes 265 s) |
| Erros novos no Sentry | **nenhum** |

- **Um jogador novo foi fundo de cara:** a conta anônima `9619dd` apareceu em
  18/10 e jogou 8 partidas em 3 dias, até a fase 5. Na fase 5 reprovou duas
  vezes, com média de 5 acertos, e passou na terceira. É o único jogador da
  semana no ranking (1.062 pontos).
- **Primeira recompensa por anúncio:** o GA4 registrou um `ad_reward`. Alguém
  assistiu a um anúncio com recompensa. Não aparecia nos relatórios
  anteriores.
- `f0af5e`, que chegou à fase 13 de 15 a 17/10, não voltou a jogar.
- **O vínculo de conta ainda não foi usado de fora:** continua 1, o nosso
  teste. Ninguém tocou em Entrar nesses 3 dias.
- **Ranking:** 19 cadastros (18 visíveis), nenhum apelido escolhido, nenhuma
  denúncia.
- **Android parado:** nenhum usuário Android nesses 3 dias. A 1.3.3 (64)
  continua só no Teste interno.

Próxima leitura com amostra útil: por volta de 01/11, duas semanas depois da
liberação.
