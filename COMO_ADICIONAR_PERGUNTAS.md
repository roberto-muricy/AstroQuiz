# 📝 Como Adicionar Perguntas ao AstroQuiz

## 📋 Formato do CSV

Use o arquivo `TEMPLATE_PERGUNTAS.csv` como base. O formato é:

```csv
baseId,topic,question,level,optionA,optionB,optionC,optionD,correctOption,explanation
```

### Campos Obrigatórios

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| **baseId** | String | ID único da pergunta | `q0001` |
| **topic** | String | Categoria/tema | `Sistema Solar`, `Estrelas`, `Galáxias` |
| **question** | String | Texto da pergunta | `Qual é o maior planeta do Sistema Solar?` |
| **level** | 1-5 | Dificuldade (1=fácil, 5=difícil) | `1` |
| **optionA** | String | Alternativa A | `Marte` |
| **optionB** | String | Alternativa B | `Júpiter` |
| **optionC** | String | Alternativa C | `Saturno` |
| **optionD** | String | Alternativa D | `Terra` |
| **correctOption** | A/B/C/D | Resposta correta | `B` |
| **explanation** | String | Explicação da resposta | `Júpiter é o maior planeta...` |

---

## 📊 Níveis de Dificuldade

| Nível | Tipo | Para quem | Exemplo |
|-------|------|-----------|---------|
| **1** | Iniciante | Conhecimento básico | "Quantos planetas tem o Sistema Solar?" |
| **2** | Básico | Conhecimento escolar | "O que causa as fases da Lua?" |
| **3** | Intermediário | Conhecimento científico | "O que é um buraco negro?" |
| **4** | Avançado | Conhecimento especializado | "Como se formam estrelas de nêutrons?" |
| **5** | Expert | Conhecimento acadêmico | "Qual é a equação de Schwarzschild?" |

---

## 📦 Distribuição por Fase

| Fases | Níveis Usados | Distribuição |
|-------|--------------|--------------|
| 1-10 | 1, 2 | 70% nível 1, 30% nível 2 |
| 11-20 | 1, 2, 3 | 40% nível 1, 40% nível 2, 20% nível 3 |
| 21-30 | 2, 3, 4 | 30% nível 2, 50% nível 3, 20% nível 4 |
| 31-40 | 3, 4, 5 | 20% nível 3, 50% nível 4, 30% nível 5 |
| 41-50 | 4, 5 | 30% nível 4, 70% nível 5 |

**Importante:** Fases 1-10 compartilham o mesmo pool! Para evitar repetições, precisamos de **pelo menos 100-150 perguntas de níveis 1 e 2**.

---

## 🚀 Como Importar

### Opção 1: Via Admin do Strapi
1. Acesse: `http://localhost:1337/admin`
2. Menu: **Content Manager → Question**
3. Botão: **Import from CSV**
4. Selecione seu arquivo CSV
5. Confirme e publique

### Opção 2: Via Script (Automático)

```bash
cd /Users/robertomuricy/Documents/Projetos/AstroQuiz/astroquiz-backend
node scripts/import-questions.js seu-arquivo.csv pt
```

*Nota: Se o script não existir, posso criar para você!*

---

## ✅ Checklist de Qualidade

Antes de importar, verifique:
- [ ] Cada pergunta tem ID único (`baseId`)
- [ ] Níveis estão entre 1-5
- [ ] `correctOption` é sempre A, B, C ou D
- [ ] Explicações são claras e educativas
- [ ] Não há perguntas duplicadas
- [ ] Português correto (sem erros de digitação)
- [ ] Fatos estão cientificamente corretos

---

## 📈 Metas de Conteúdo

| Status Atual | Meta Curto Prazo | Meta Longo Prazo |
|--------------|------------------|------------------|
| 353 perguntas | 500+ perguntas | 1000+ perguntas |

**Distribuição recomendada:**
- Nível 1: ~150 perguntas (iniciantes)
- Nível 2: ~150 perguntas (básico)
- Nível 3: ~120 perguntas (intermediário)
- Nível 4: ~80 perguntas (avançado)
- Nível 5: ~50 perguntas (expert)

---

## 🤖 Dica: Gerar com IA

Você pode usar IA (ChatGPT/Claude) para gerar perguntas:

**Prompt exemplo:**
```
Gere 20 perguntas de astronomia em português para um quiz educativo.
Formato CSV: baseId,topic,question,level,optionA,optionB,optionC,optionD,correctOption,explanation

Níveis:
- 1: Iniciante (conhecimento básico)
- 2: Básico (escolar)

Tópicos: Sistema Solar, Estrelas, Lua, Planetas

Importante: explicações didáticas e fatos corretos.
```

**⚠️ Sempre revisar:** IA pode errar fatos científicos!

---

Quer que eu crie o script de importação automática?
