# Fix: Idiomas em Produção (Vercel)

## Problema
No painel de produção só aparecem 2 idiomas (PT e EN) em vez dos 4 esperados (PT, EN, ES, FR).

## Causa Provável
- Build do Vercel não incluindo arquivos de tradução ES e FR
- Cache do navegador/CDN
- Importação incorreta dos arquivos de tradução

## Soluções Implementadas

### 1. ✅ Arquivo de Traduções Centralizado
Criado `src/translations.js` que força a importação explícita de todos os arquivos de tradução.

### 2. ✅ Configuração i18n Atualizada
- Adicionado `supportedLngs` explícito
- Debug habilitado em desenvolvimento
- Importação centralizada das traduções

### 3. ✅ Tradução Francesa Completa
Expandido `src/locales/fr/translation.json` com todas as chaves necessárias.

### 4. ✅ Verificação de Idiomas
Criado `src/utils/languageChecker.js` para debug e validação.

### 5. ✅ Configuração Vercel
Criado `vercel.json` com configurações específicas para build.

## Como Testar

### Local
1. `npm start`
2. Abrir console do navegador
3. Verificar logs: "✅ Todos os idiomas estão disponíveis"
4. Testar seletor de idiomas no header

### Produção
1. Deploy no Vercel
2. Abrir painel de produção
3. Verificar se 4 idiomas aparecem no seletor
4. Testar mudança de idioma

## Próximos Passos

### Se ainda não funcionar:
1. **Limpar Cache do Vercel**:
   ```bash
   vercel --prod --force
   ```

2. **Verificar Build Logs**:
   - Acessar dashboard do Vercel
   - Verificar se arquivos `es/translation.json` e `fr/translation.json` estão incluídos

3. **Forçar Novo Deploy**:
   ```bash
   git add .
   git commit -m "fix: force rebuild with all language files"
   git push
   ```

4. **Verificar Importações**:
   - Confirmar que todos os imports estão corretos
   - Verificar se não há erros de sintaxe nos JSONs

## Debug em Produção

Adicionar no console do navegador:
```javascript
// Verificar idiomas disponíveis
console.log('Idiomas:', Object.keys(window.i18next?.options?.resources || {}));

// Testar tradução específica
window.i18next?.getResource('es', 'translation', 'admin_panel');
```

## Arquivos Modificados
- `src/translations.js` (novo)
- `src/i18n.js` (atualizado)
- `src/locales/fr/translation.json` (expandido)
- `src/utils/languageChecker.js` (novo)
- `vercel.json` (novo)
- `src/components/QuestionManager.js` (debug adicionado)

## Status
- ✅ Implementação local completa
- ⏳ Aguardando teste em produção
- ⏳ Verificação do deploy no Vercel
