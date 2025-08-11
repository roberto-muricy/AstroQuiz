# 🎮 Configuração das Regras do Jogo - AstroQuiz Admin

## 📋 Visão Geral

As regras do jogo foram integradas ao painel admin na aba **Configurações**. Agora você pode gerenciar todos os parâmetros do AstroQuiz diretamente pela interface web.

## 🚀 Como Usar

### 1. Acessar o Painel Admin
- Execute `npm start` no diretório `AstroQuiz_Admin`
- Acesse `http://localhost:3000`
- Clique na aba **"Configurações"** (⚙️)

### 2. Configurações Disponíveis

#### ⏱️ Tempo e Velocidade
- **Tempo por Pergunta**: 5-60 segundos
- **Bônus de Tempo**: 0-10 segundos
- **Penalidade de Tempo**: 0-5 segundos

#### 🎯 Pontuação
- **Pontos por Resposta Correta**: 1-50 pontos
- **Pontos por Nível**: 50-500 pontos
- **Multiplicador de Pontos**: 1.0-3.0x
- **Bônus por Sequência**: 0-20 pontos

#### 📈 Progresso
- **Porcentagem para Passar**: 50-100%
- **Perguntas por Nível**: 5-20 perguntas
- **Tentativas Máximas**: 0-10 (0 = ilimitado)
- **Estrelas para Desbloquear**: 1-3 estrelas

#### 🏆 Conquistas
- **Velocista**: 60-300 segundos
- **Perfeccionista**: 90-100%
- **Mestre de Sequência**: 3-10 acertos

#### 🔧 Modo de Jogo
- **Permitir Dicas**: Ativar/desativar
- **Permitir Pular**: Ativar/desativar
- **Mostrar Timer**: Ativar/desativar
- **Mostrar Progresso**: Ativar/desativar

#### 🏅 Ranking
- **Intervalo de Atualização**: 1-60 minutos
- **Limite do Ranking**: 10-200 jogadores

#### 📱 Notificações
- **Habilitar Notificações**: Ativar/desativar
- **Lembrete Diário**: Ativar/desativar
- **Notificações de Conquistas**: Ativar/desativar

## ⚙️ Configuração do Firebase

### 1. Atualizar Regras do Firestore

As regras do Firestore foram atualizadas para incluir a coleção `gameRules`. Se você ainda não aplicou as regras:

1. Acesse o [Firebase Console](https://console.firebase.google.com/project/astroquiz-3a316/firestore)
2. Vá para **Firestore Database** > **Rules**
3. Substitua as regras atuais por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para a coleção users
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção questions
    match /questions/{questionId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção gameRules
    match /gameRules/{ruleId} {
      allow read, write: if true;
    }
  }
}
```

4. Clique em **Publish**

### 2. Aguardar Aplicação das Regras
- As regras podem levar alguns minutos para serem aplicadas
- Teste o painel admin após 5-10 minutos

## 🧪 Testando a Funcionalidade

### 1. Primeiro Acesso
- Na primeira vez que acessar a aba Configurações, as regras padrão serão criadas automaticamente
- Você verá uma mensagem de carregamento enquanto as regras são inicializadas

### 2. Modificando Configurações
- Altere qualquer valor nos campos
- Clique em **"Salvar Regras"** para aplicar as mudanças
- Uma mensagem de sucesso aparecerá quando as regras forem salvas

### 3. Restaurando Padrões
- Clique em **"Restaurar Padrões"** para voltar às configurações iniciais
- Confirme clicando em **"Salvar Regras"**

## 📊 Impacto das Mudanças

### Dificuldade do Jogo
- **Reduzir tempo por pergunta** = Jogo mais difícil
- **Aumentar porcentagem para passar** = Jogo mais difícil
- **Reduzir porcentagem para passar** = Jogo mais fácil

### Engajamento
- **Habilitar dicas** = Jogo mais acessível
- **Limitar tentativas** = Maior desafio
- **Aumentar pontos** = Ranking mais competitivo

### Performance
- **Reduzir intervalo de ranking** = Atualizações mais frequentes
- **Aumentar limite do ranking** = Mais jogadores visíveis

## 🔄 Integração com o App

As regras configuradas no painel admin são automaticamente aplicadas no app AstroQuiz:

1. **Carregamento**: O app busca as regras do Firebase ao iniciar
2. **Cache**: As regras são armazenadas em cache por 5 minutos
3. **Aplicação**: Todas as funcionalidades do jogo usam as regras configuradas

## 🛠️ Solução de Problemas

### Erro de Permissões
```
Missing or insufficient permissions
```
**Solução**: Verifique se as regras do Firestore foram aplicadas corretamente

### Regras Não Carregam
**Solução**: 
1. Aguarde alguns minutos para as regras serem aplicadas
2. Recarregue a página do painel admin
3. Verifique a conexão com a internet

### Mudanças Não Aplicadas
**Solução**:
1. Clique em **"Salvar Regras"** após fazer mudanças
2. Aguarde a mensagem de sucesso
3. Teste no app após alguns minutos

## 📝 Exemplos de Configuração

### Jogo Fácil
```javascript
{
  timePerQuestion: 20,
  passingPercentage: 70,
  allowHints: true,
  allowSkip: true
}
```

### Jogo Difícil
```javascript
{
  timePerQuestion: 10,
  passingPercentage: 90,
  allowHints: false,
  allowSkip: false,
  maxAttempts: 3
}
```

### Jogo Competitivo
```javascript
{
  pointsPerCorrectAnswer: 20,
  pointsMultiplier: 2.0,
  rankingUpdateInterval: 1,
  rankingDisplayLimit: 100
}
```

## 🎯 Próximos Passos

1. **Teste o painel admin** acessando a aba Configurações
2. **Configure as regras** conforme suas necessidades
3. **Teste no app** para verificar se as mudanças foram aplicadas
4. **Monitore o desempenho** dos usuários após as mudanças

---

**🎉 Parabéns!** Agora você tem controle total sobre as regras do AstroQuiz através do painel admin.
