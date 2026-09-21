# Google Play — Conteúdo do app

Folha de respostas das dez declarações da página **Conteúdo do app**
(`.../app/4974581592584252652/app-content`), conferida contra o código em
21/09/2026.

Nenhuma delas estava preenchida: o teste interno não exige nada disso, então a
1.3.1 (61) subiu sem que o Play pedisse. **Produção exige as dez.**

Nada aqui depende de pacote novo. É só ficha.

---

## 1. As seis rápidas

| Declaração | Resposta |
|---|---|
| Política de Privacidade | `https://astroquiz-legal.vercel.app/privacy.html` |
| Anúncios | Sim, contém anúncios (AdMob) |
| ID de publicidade | Sim → finalidade **Publicidade ou marketing** e **Análise** |
| Apps governamentais | Não |
| Recursos financeiros | Não — assinatura do próprio app não é recurso financeiro |
| Apps de saúde | Não |

---

## 2. Público-alvo e conteúdo

- Faixas etárias: **13–15, 16–17, 18 e mais**
- "O app tem apelo para crianças?" → **Não**

Decidido com o Roberto em 21/09/2026. Marcar qualquer faixa abaixo de 13 põe o
app no **programa Famílias**: exige rede de anúncios certificada, proíbe anúncio
personalizado e submete a ficha a uma revisão mais dura. Nada disso está
configurado no AdMob hoje. Mirar crianças é um projeto à parte, não um
formulário.

---

## 3. Detalhes do login

Jogar não exige conta. **O ranking e a denúncia de apelido exigem.**

Fornecer a conta de demonstração — a mesma da revisão da Apple — e explicar isso
no campo de instruções. Foi exatamente esse detalhe que quase derrubou a revisão
da Apple em 17/09/2026: sem login, o revisor navega como convidado e não
encontra a denúncia, que é o que a Guideline 1.2 exige.

---

## 4. Segurança dos dados

Perguntas de abertura:

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha dados? | Sim |
| Tudo criptografado em trânsito? | Sim — tudo em HTTPS |
| Oferece exclusão de dados? | Sim |
| URL de exclusão | `https://astroquiz-legal.vercel.app/privacy.html#como-excluir-sua-conta` |

Em todas as linhas abaixo: **coletado = Sim**, **efêmero = Não**.

| Tipo de dado | Compart. | Obrigatório | Finalidade | Origem no código |
|---|---|---|---|---|
| Pessoais → Nome | Não | Opcional | Funcionalidade | Firebase Auth; Sentry (`username`); **e o apelido do ranking** |
| Pessoais → E-mail | Não | Opcional | Funcionalidade, Gerenciamento de contas | Firebase Auth |
| Pessoais → IDs do usuário | Não | Opcional | Funcionalidade, Análise | UID do Firebase; `analyticsService.setUserId`; `Purchases.logIn` |
| Fotos e vídeos → Fotos | Não | Opcional | Funcionalidade | `fbUser.photoURL` do login Google, enviada ao backend em `strapiSyncService.syncUser` |
| Local → Localização aproximada | **Sim** | **Obrigatório** | Funcionalidade, Análise, Publicidade | Região pelo IP (Analytics e AdMob) + país do ranking |
| Financeiras → Histórico de compras | Não | Opcional | Funcionalidade, Análise | RevenueCat e Play Billing |
| Atividade → Interações no app | Não | Obrigatório | Análise | Firebase Analytics |
| Atividade → Outras ações | Não | Obrigatório | Funcionalidade, Análise | `phase_results` |
| Registros → Registros de falhas | Não | Obrigatório | Análise | Sentry |
| Registros → Diagnósticos | Não | Obrigatório | Análise | Sentry, `tracesSampleRate: 0.2` |
| IDs de dispositivo ou outros IDs | **Sim** | Obrigatório | Publicidade, Análise | AdMob |

### Três decisões que não são óbvias

**O apelido vai em "Nome".** A definição do Google para Nome é como a pessoa se
refere a si mesma, incluindo apelido. A versão anterior deste documento
(`lojas-ranking-1.3.0.md`, seção 5.1) mandava usar "Outras informações"; "Nome"
é mais fiel e economiza uma linha.

**Localização aproximada é obrigatória, não opcional.** O país do ranking é
opcional, mas a região que o Analytics e o AdMob deduzem do IP é automática, e
as duas caem no mesmo tipo de dado. O app **não pede permissão de localização**
em nenhuma plataforma: não há `NSLocationWhenInUseUsageDescription` no
`Info.plist` nem `ACCESS_*_LOCATION` no manifesto Android.

**Só o que vai para o AdMob é "compartilhado".** No vocabulário do formulário,
compartilhar é transferir para outra empresa, e o Google exclui dessa definição
o prestador de serviço que processa por nós. Firebase, Sentry, RevenueCat e
Railway são prestadores; rede de anúncios, não. Que o ranking seja **público
dentro do app** é outra coisa, e o formulário não tem campo para isso — está
descrito na Política de Privacidade, seção 3.

### Pendência achada no caminho

O app envia a URL da foto do perfil Google ao backend, e isso **não está
declarado nos rótulos de privacidade da App Store**. Não trava a Play. Corrigir
na próxima mexida na ficha da Apple.

---

## 5. Classificação de conteúdo (IARC)

- E-mail: `robertomuricy@gmail.com`
- Categoria: **Jogo**. Não escolher "Social ou Comunicação": essa categoria é
  para apps cujo objetivo principal é a comunicação, e abre um questionário bem
  mais severo. O AstroQuiz é um jogo que tem uma lista de pontuação.
- Violência, sexo, linguagem, drogas, jogos de azar, terror: **não** em tudo.

Bloco "Diversos":

| Pergunta | Resposta |
|---|---|
| Permite interação ou troca de conteúdo entre usuários | **Sim** |
| Compartilha a localização precisa com outros usuários | Não |
| Símbolos nazistas | Não |
| Conteúdo que denigre a Coreia do Sul | Não |
| Defende terrorismo | Não |
| Descrições realistas de crimes | Não |

### Por que "sim" na primeira

A pergunta fala em voz, texto e partilha de imagens, e o AstroQuiz não tem nada
disso. O que decide é a definição que a IARC dá no "Saiba mais": ela inclui a
troca de **outros tipos de conteúdo criado pelo usuário**, e dá o comentário
como exemplo. Comentário também é mão única — a pessoa escreve, os outros leem,
ninguém responde — e mesmo assim é "sim". O apelido tem a mesma forma, menor.

A ressalva de que multiplayer sozinho não obriga o "sim" exige "sem recursos de
comunicação **ou compartilhamento**". Um ranking com nomes sorteados pelo
servidor cairia ali; o nosso deixa a pessoa escrever o próprio nome, e é esse
campo que conta.

**Um argumento que não vale**, e que chegou a ser usado antes: "a Apple recebeu
sim, então aqui também". A pergunta da Apple é sobre conteúdo gerado pelo
usuário — apelido é, e o sim está certo lá. Esta é sobre comunicação entre
usuários. São perguntas diferentes, e responder diferente não seria
inconsistência.

O que uma pessoa vê da outra, no app inteiro: apelido de até 20 caracteres
(escolhido ou sorteado), bandeira do país (opcional), pontuação, posição e fase.
Sem chat, mensagem, comentário, foto, áudio, página de perfil ou lista de
amigos.

---

## 6. Ordem sugerida

As seis rápidas primeiro, para a lista encolher. Depois público-alvo, detalhes
do login, classificação de conteúdo e, por último, segurança dos dados, que é a
mais longa.

A classificação sai na hora. A segurança dos dados passa por revisão do Google e
aparece na página do app em algumas horas.
