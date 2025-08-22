# 🌍 Guia de Importação Multi-Idioma - AstroQuiz

## 📋 Visão Geral

Este guia te ajudará a importar suas perguntas em 4 idiomas (EN, PT, ES, FR) usando sua **integração existente** do Google Sheets com o painel admin do AstroQuiz.

## 🎯 Estrutura Esperada do Google Sheets

### Colunas Obrigatórias:
```
baseId | language | topic | level | question | optionA | optionB | optionC | optionD | correctOption | explanation
```

### Exemplo de Dados:
| baseId | language | topic | level | question | optionA | optionB | optionC | optionD | correctOption | explanation |
|--------|----------|-------|-------|----------|---------|---------|---------|---------|---------------|-------------|
| q001 | pt | astronomia | 1 | Qual é o planeta mais próximo do Sol? | Mercúrio | Vênus | Terra | Marte | A | Mercúrio é o planeta mais próximo do Sol |
| q001 | en | astronomy | 1 | Which planet is closest to the Sun? | Mercury | Venus | Earth | Mars | A | Mercury is the planet closest to the Sun |
| q001 | es | astronomía | 1 | ¿Cuál es el planeta más cercano al Sol? | Mercurio | Venus | Tierra | Marte | A | Mercurio es el planeta más cercano al Sol |
| q001 | fr | astronomie | 1 | Quelle est la planète la plus proche du Soleil? | Mercure | Vénus | Terre | Mars | A | Mercure est la planète la plus proche du Soleil |

## 🚀 Passo a Passo

### 1. Preparar os Dados no Google Sheets

1. **Acesse sua planilha**: `https://docs.google.com/spreadsheets/d/1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk/edit`
2. **Organize suas perguntas** com a estrutura acima
3. **Use o mesmo `baseId`** para todas as traduções da mesma pergunta
4. **Use códigos de idioma**: `pt`, `en`, `es`, `fr`
5. **Use códigos de resposta**: `A`, `B`, `C`, `D`

### 2. Configurar a Planilha

#### Estrutura da Planilha:
- **Sheet1**: Dados das perguntas
- **Range**: A1:K (ou até onde seus dados chegarem)
- **Headers**: Primeira linha com os nomes das colunas

#### Exemplo de Headers:
```
baseId | language | topic | level | question | optionA | optionB | optionC | optionD | correctOption | explanation
```

### 3. Acessar o Painel Admin

1. **Acesse o painel admin**: https://astroquiz-admin.vercel.app
2. **Faça login** com suas credenciais
3. **Navegue até a seção de importação**

### 4. Executar Importação

1. **Clique no botão "Importar do Google Sheets"**
2. **Aguarde o processamento** (o sistema irá):
   - ✅ Conectar com o Google Sheets
   - ✅ Validar todos os dados
   - ✅ Verificar duplicatas
   - ✅ Importar perguntas novas
   - ✅ Gerar relatório completo

### 5. Verificar Resultados

O sistema mostrará um relatório detalhado com:
- 📊 **Total processado**
- ✅ **Perguntas importadas**
- ⏭️ **Duplicatas encontradas**
- ❌ **Erros encontrados**
- 🌍 **Distribuição por idioma**
- 📈 **Análise de completude**

## 📊 Estrutura do Firebase

### Collection: `questions`
```javascript
{
  id: "q_q001_pt_1234567890",
  baseId: "q001",
  language: "pt",
  question: "Qual é o planeta mais próximo do Sol?",
  options: ["Mercúrio", "Vênus", "Terra", "Marte"],
  correctAnswer: 0, // índice da opção correta
  explanation: "Mercúrio é o planeta mais próximo do Sol",
  level: 1,
  difficulty: "easy",
  theme: "astronomy",
  topics: ["astronomia"],
  active: true,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  metadata: {
    source: "Google Sheets Multi-Language Import",
    importDate: Timestamp,
    version: "1.0",
    verified: true
  }
}
```

## 🔧 Configurações

### Idiomas Suportados
- `pt` - Português
- `en` - English  
- `es` - Español
- `fr` - Français

### Níveis de Dificuldade
- **Fácil**: Níveis 1-3
- **Médio**: Níveis 4-6
- **Difícil**: Níveis 7-10

### Mapeamento de Temas
```javascript
const topicToThemeMap = {
  "astronomia": "astronomy",
  "planetas": "planets",
  "estrelas": "stars",
  "galáxias": "galaxies",
  "exploração espacial": "space-exploration",
  "cosmologia": "cosmology"
};
```

## ⚠️ Validações Automáticas

### Campos Obrigatórios
- ✅ `baseId` - ID único da pergunta
- ✅ `language` - Código do idioma
- ✅ `question` - Texto da pergunta
- ✅ `optionA`, `optionB`, `optionC`, `optionD` - Todas as opções
- ✅ `correctOption` - Resposta correta (A, B, C, D)

### Validações de Conteúdo
- ✅ Idiomas suportados
- ✅ Níveis válidos (1-10)
- ✅ Respostas corretas válidas
- ✅ Textos não vazios

## 🎯 Benefícios da Estrutura Multi-Idioma

### 1. **Relacionamento por `baseId`**
- Todas as traduções da mesma pergunta compartilham o mesmo `baseId`
- Facilita manutenção e atualizações
- Permite rastreamento de versões

### 2. **Flexibilidade de Idiomas**
- Suporte a 4 idiomas simultâneos
- Fácil adição de novos idiomas
- Controle granular por idioma

### 3. **Importação Inteligente**
- Verificação automática de duplicatas
- Validação em tempo real
- Relatórios detalhados
- Processamento em lote (batch)

### 4. **Versionamento e Rastreabilidade**
- Metadados de importação
- Controle de versões
- Histórico de mudanças

## 🔄 Atualizações Futuras

### Adicionar Novos Idiomas
1. Adicione o código do idioma em `SUPPORTED_LANGUAGES`
2. Adicione o nome do idioma em `LANGUAGE_NAMES`
3. Importe as novas traduções

### Atualizar Perguntas Existentes
1. Use o mesmo `baseId` das perguntas existentes
2. Execute a importação pelo painel admin
3. As perguntas serão atualizadas automaticamente

### Adicionar Novos Tópicos
1. Adicione o mapeamento em `topicToThemeMap`
2. Importe as novas perguntas
3. Os temas serão criados automaticamente

## 🚨 Troubleshooting

### Erro: "Idioma não suportado"
- Verifique se está usando os códigos corretos: `pt`, `en`, `es`, `fr`
- Certifique-se de que não há espaços extras

### Erro: "Resposta correta inválida"
- Use apenas: `A`, `B`, `C`, `D`
- Verifique se não há espaços extras

### Erro: "Nível inválido"
- Use números de 1 a 10
- Verifique se não há texto misturado

### Erro: "Campos obrigatórios ausentes"
- Verifique se todas as colunas estão preenchidas
- Certifique-se de que não há linhas vazias

### Erro: "Nenhum dado encontrado na planilha"
- Verifique se o `SHEET_ID` está correto
- Verifique se o `RANGE` está correto
- Verifique se a planilha tem dados

## 📞 Suporte

Se encontrar problemas:
1. Verifique o relatório de validação no painel admin
2. Corrija os erros indicados
3. Execute novamente a importação
4. Consulte os logs detalhados no console do navegador

## 🎯 URLs Importantes

- **Painel Admin**: https://astroquiz-admin.vercel.app
- **Google Sheets**: https://docs.google.com/spreadsheets/d/1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk/edit
- **Firebase Console**: https://console.firebase.google.com/project/astroquiz-3a316

## 🔧 Configurações Técnicas

### Google Sheets API
- **Sheet ID**: `1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk`
- **API Key**: `AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo`
- **Range**: `Sheet1`

### Firebase
- **Project ID**: `astroquiz-3a316`
- **Collection**: `questions`
- **Batch Size**: 500 perguntas por lote

---

**🎉 Parabéns!** Suas perguntas multi-idioma estão prontas para uso no AstroQuiz!

### 📋 Próximos Passos:
1. **Organize suas perguntas** no Google Sheets
2. **Execute a importação** pelo painel admin
3. **Verifique os resultados** no relatório
4. **Teste no app** AstroQuiz
5. **Monitore o uso** através do Firebase Console
