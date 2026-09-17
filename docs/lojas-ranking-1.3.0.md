# Fichas das lojas — ranking (1.3.0)

O ranking é a primeira função do AstroQuiz em que uma pessoa escreve algo que
outra vê. Isso muda três formulários que já estavam respondidos: os rótulos de
privacidade da App Store, a classificação etária da Apple e o Data Safety do
Google Play. Este documento traz as respostas prontas para copiar.

A seção 2 foi conferida contra o App Store Connect e contra o código em
17/09/2026. As demais foram escritas em 16/09/2026 a partir do código.

---

## 1. O que a 1.3.0 passa a coletar

| Dado | Obrigatório? | Fica público? | Onde fica |
|---|---|---|---|
| Apelido escolhido | Não — sem apelido, o app usa um nome sorteado | Sim | `leaderboard_players.nickname` |
| Nome sorteado (ex.: "Cometa Veloz 42") | Gerado pelo servidor | Sim | `leaderboard_players.generated_name` |
| País | Não | Só se a pessoa ligar "Mostrar meu país" | `leaderboard_players.country` |
| Resultado de cada fase (pontuação, acertos, tempo) | Sim, para quem joga com conta | A pontuação e a fase, sim | `phase_results` |
| Denúncia de apelido | Ação voluntária | Não | `leaderboard_reports` |

Três fatos que valem para os dois formulários:

- **O app não pede localização.** Não há `NSLocationWhenInUseUsageDescription`
  no `Info.plist` nem `ACCESS_COARSE_LOCATION` no manifesto Android. O país é
  digitado pela pessoa, sempre.
- **Nome, e-mail, foto e UID nunca aparecem no ranking.** A lista pública usa um
  id gerado com `crypto.randomBytes`, sem relação com a conta.
- **Dá para sair sem apagar a conta.** `Perfil → Ranking → Apagar meus dados do
  ranking` remove cadastro, apelido, país e reservas, e anonimiza as partidas
  (`phase_results.firebase_uid` vira nulo, `eligible` vira falso).

---

## 2. App Store — rótulos de privacidade (App Privacy)

**Regra que a própria tela da Apple impõe:** a declaração descreve a versão
**que está no ar**, não a próxima. E ela é publicada na hora, sem revisão. Por
isso a atualização acontece em dois momentos.

### 2.1. Publicado em 17/09/2026 (versão no ar: 1.2.0)

A declaração anterior era de fevereiro e estava incompleta. Conferida contra o
código, ficou assim:

| Tipo de dado | Finalidade | Vinculado | Rastreamento | Origem no código |
|---|---|---|---|---|
| Nome | Funcionalidade do app | sim | não | Firebase Auth; Sentry recebe o nome |
| Endereço de e-mail | Funcionalidade do app | sim | não | Firebase Auth |
| ID de usuário | Funcionalidade do app, Análise | sim | não | UID do Firebase; `analyticsService.setUserId` |
| ID do dispositivo | Publicidade de terceiros | não | **sim** | AdMob (IDFA) |
| Dados de publicidade | Publicidade de terceiros | não | **sim** | AdMob |
| Interações com o produto | Análise | sim | não | Firebase Analytics com `setUserId` — *era "não vinculado"* |
| Dados de falhas | Funcionalidade do app | sim | não | Sentry com id e nome do usuário — *era "não vinculado"* |
| Localização aproximada | Análise | sim | não | Firebase Analytics estima a região pelo IP — *faltava* |
| Histórico de compras | Funcionalidade do app, Análise | sim | não | RevenueCat (`Purchases.logIn`) e compras registradas pelo Analytics — *faltava* |
| Dados de desempenho | Funcionalidade do app | sim | não | Sentry, `tracesSampleRate: 0.2` — *faltava* |

Fontes do Google sobre o Firebase Analytics: "Analytics derives general location
data from users' masked IP addresses", e registro automático de compras dentro
do app — https://support.google.com/analytics/answer/10285841

Regra prática: **vinculado = passa pela conta do jogador**; **rastreamento = só
anúncio (AdMob)**.

### 2.2. No envio da 1.3.0

Fazer junto do envio da build, não antes — antes disso o ranking não existe na
versão do ar.

1. **Tipos de dados → Editar** e marcar:
   - **Conteúdos de jogos** — Funcionalidade do app, vinculado, sem rastreamento. É a pontuação que aparece no ranking.
   - **Outros conteúdos de usuário** — Funcionalidade do app, vinculado, sem rastreamento. É o apelido.
2. **Localização aproximada → Editar** e acrescentar **Funcionalidade do app** à
   finalidade (fica Análise + Funcionalidade do app). É o país do ranking.
3. **Conta de demonstração:** preencher usuário e senha em *Informações para a
   revisão do app*. Sem isso o revisor navega como convidado e **não encontra a
   denúncia**, que é justamente o que a Guideline 1.2 exige — descoberto em
   17/09/2026 testando no aparelho.
4. **URL das opções de privacidade do usuário:** trocar
   `privacy.html#9-como-excluir-sua-conta` por
   `privacy.html#como-excluir-sua-conta`. A âncora antiga nunca existiu na página
   (o link abria o topo) e a seção virou a 10. A nova âncora, sem número, está
   no `privacy.html` e não quebra em renumeração. Essa URL só muda criando a
   versão nova, como a tela avisa — e a página precisa estar publicada no Vercel
   antes.

---

## 3. App Store — classificação etária e conteúdo gerado pelo usuário

O questionário de classificação etária pergunta sobre conteúdo gerado pelo
usuário. A resposta muda na 1.3.0.

**"Seu app contém conteúdo gerado pelo usuário?" → Sim.**

Escolha a opção mais restrita que descreva o caso: conteúdo gerado pelo usuário
**sem** conteúdo adulto, **sem** interação entre pessoas e **com** moderação. O
AstroQuiz não tem chat, mensagem, comentário, foto nem perfil visitável. A única
coisa que uma pessoa escreve e outra lê é um apelido de até 20 caracteres numa
lista.

### 3.1. A Guideline 1.2 e o que o app tem

A App Review exige quatro coisas de um app com conteúdo gerado pelo usuário.
Situação de cada uma:

| Exigência | Existe? | Onde |
|---|---|---|
| Filtrar material ofensivo | Sim — filtro automático em pt/en/es/fr no cadastro e na troca do apelido | `src/services/nickname.ts` |
| Denunciar conteúdo, com resposta em prazo razoável | Sim — botão em cada linha do ranking; 5 denúncias de contas diferentes ocultam o apelido na hora, antes de qualquer revisão manual | `src/services/leaderboard-reports.ts` |
| Bloquear quem abusa | Parcial — um administrador bloqueia a conta (`isBlocked`), e a autenticação passa a recusá-la | `src/middlewares/auth.ts:54` |
| Contato publicado | Sim — `robertomuricy@gmail.com`, nos Termos e na Política | `astroquiz-legal/` |

**A terceira linha é a que pode gerar pergunta na revisão.** A Apple às vezes
procura um "bloquear este usuário" na mão do jogador. O AstroQuiz não tem — e,
como não há nenhuma interação entre pessoas, também não há o que bloquear além
do apelido, que a denúncia já oculta. O argumento está escrito na nota da seção
4. Se a revisão insistir, o caminho mais curto é um "ocultar este jogador da
minha lista" guardado só no aparelho; não é trabalho grande, mas não vale fazer
antes de alguém pedir.

---

## 4. Nota para a App Review

Em inglês, para colar em *App Review Information → Notes*:

```
AstroQuiz 1.3.0 adds a public leaderboard.

User-generated content is limited to a single field: a display nickname of up
to 20 characters. There is no chat, messaging, commenting, image upload, user
profile page, or any other way for players to communicate. Players only see
each other's nickname, country flag, score and rank in a list.

Moderation, per Guideline 1.2:
- Nicknames are screened automatically on creation and on every change, in
  Portuguese, English, Spanish and French, and names impersonating AstroQuiz,
  our team or other companies are rejected.
- Any signed-in player can report a nickname: long-press that player's row in
  the leaderboard (Ranking tab) and choose a reason. A nickname reported by 5
  distinct accounts is hidden immediately and replaced by a generated name,
  before any manual review.
- **Reporting requires an account.** Guests can browse the leaderboard but
  cannot report, so please sign in with the demo account below before checking
  the moderation tools; long-press does nothing while signed out.
- An administrator can block an abusive account; blocked accounts are rejected
  at authentication.
- Our contact address is published in the Terms and the Privacy Policy.

Location: the app does not request location permission on either platform. The
country shown next to a player is chosen from a list by that player, is
optional, and is only visible if the player turns on "Show my country". The
approximate location declared in App Privacy refers to the general region that
Firebase Analytics derives from masked IP addresses.

Leaving the leaderboard: Profile > Ranking offers "Appear in the leaderboard"
and "Show my country" toggles, and a "Delete my leaderboard data" action that
removes the nickname, country and rank and anonymizes past games, without
deleting the account. Deleting the account remains available in Profile.

Privacy Policy: https://astroquiz-legal.vercel.app/privacy.html
Terms: https://astroquiz-legal.vercel.app/terms.html
```

As duas URLs são as mesmas que o app já abre em `ProfileScreen.tsx:432` e
`UpgradeScreen.tsx:234`, e o projeto no Vercel se chama `astroquiz-legal`.

---

## 5. Google Play — Data Safety

### 5.1. O que acrescentar

| Categoria | Tipo | Coletado | Compartilhado | Obrigatório | Finalidade |
|---|---|---|---|---|---|
| Personal info | Other info (apelido) | Sim | Não | **Opcional** | App functionality |
| Location | Approximate location (país) | Sim | Não | **Opcional** | App functionality |
| App activity | Other actions (resultado das fases) | Sim | Não | Obrigatório | App functionality, Analytics |

"Compartilhado", no formulário do Google, quer dizer transferido para outra
empresa. O ranking não transfere nada: apelido, país e pontuação ficam no nosso
banco, no Railway. Ficam **públicos dentro do app**, que é outra coisa, e o
formulário não tem campo para isso — está descrito na Política de Privacidade,
seção 3.

Marque as duas primeiras linhas como **opcionais**: o formulário pergunta se a
pessoa pode usar o app sem fornecer o dado, e aqui pode.

### 5.2. Perguntas gerais da seção

- *Os dados são criptografados em trânsito?* **Sim** — tudo em HTTPS.
- *Você oferece um jeito de pedir a exclusão dos dados?* **Sim** — dentro do app,
  em Perfil, tanto para os dados do ranking quanto para a conta inteira, e
  também por e-mail.
- *URL de exclusão de conta:* a Política de Privacidade descreve o caminho na
  seção 10. Se o Play pedir uma página dedicada, é o link da política que serve.

### 5.3. Classificação de conteúdo (IARC)

O questionário do Google também pergunta sobre interação entre usuários.
Responda **sim** para "os usuários podem interagir" apenas na medida em que o
apelido é visível — não há troca de mensagens, não há compartilhamento de
localização (o país é digitado e opcional) e não há compras entre jogadores.
Isso costuma manter a classificação onde já está.

---

## 6. Páginas legais

Atualizadas em 16/09/2026, em `astroquiz-legal/`:

- `privacy.html` — nova seção **3. Ranking público** (o que fica visível, o que
  nunca fica, moderação de apelidos, como sair) e **2.6. Dados do ranking** na
  lista de coleta. As seções seguintes foram renumeradas: a antiga 3 virou 4, e
  assim por diante até a 15.
- `terms.html` — **9.1. Apelido no ranking** (as regras que a pessoa aceita ao
  escolher um) e **9.2. Manipulação de pontuação** (pontuação é calculada no
  servidor; manipular tira do ranking).

As duas páginas são pt-BR. Se as lojas pedirem versão em inglês, isso ainda não
existe.

---

## 7. O que depende de você

- Conferir se os rótulos da seção 2.2 batem com o que está respondido hoje.
- Publicar as páginas legais atualizadas antes de enviar a build — a revisão lê
  a política no ar, não a do repositório.
- Decidir sobre o "ocultar este jogador" da seção 3.1, se a revisão pedir.
