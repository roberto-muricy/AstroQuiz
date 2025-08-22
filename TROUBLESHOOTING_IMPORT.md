# 🔧 Troubleshooting - Importação Multi-idioma

## 🚨 Problema
O botão "Importar Multi-idioma" continua abrindo diálogo de upload em vez de conectar com Google Sheets.

## 🔍 Diagnóstico

### 1. **Verificar Console do Navegador**
1. Abra o painel admin: https://astroquiz-admin.vercel.app
2. Pressione **F12** para abrir DevTools
3. Vá na aba **"Console"**
4. Clique no botão **"Importar Multi-idioma"**
5. **Verifique se aparece**:
   - `🔘 Botão 'Importar Multi-idioma' clicado!`
   - `🔍 Função importFromMultipleSheets existe? function`
   - `🚀 Função importFromMultipleSheets chamada`

### 2. **Se NÃO aparecer os logs**
- **Problema**: Cache do navegador ou código não atualizado
- **Solução**: Limpar cache completamente

### 3. **Se aparecer "function" mas não executar**
- **Problema**: Erro JavaScript na função
- **Solução**: Verificar erros no console

### 4. **Se aparecer "undefined"**
- **Problema**: Função não definida
- **Solução**: Recarregar página

## 🧹 Limpeza Completa de Cache

### **Chrome/Edge:**
1. Pressione **Ctrl+Shift+Delete** (Windows) ou **Cmd+Shift+Delete** (Mac)
2. Selecione **"Todo o período"**
3. Marque **TODAS** as opções:
   - Cookies e dados do site
   - Imagens e arquivos em cache
   - Histórico de navegação
   - Dados de formulários
4. Clique em **"Limpar dados"**
5. Feche **TODAS** as abas do painel admin
6. Abra novamente: https://astroquiz-admin.vercel.app

### **Firefox:**
1. Pressione **Ctrl+Shift+Delete** (Windows) ou **Cmd+Shift+Delete** (Mac)
2. Selecione **"Tudo"**
3. Clique em **"Limpar agora"**

### **Safari:**
1. Menu → **Desenvolvedor** → **Esvaziar Caches**
2. Menu → **Histórico** → **Limpar Histórico**

## 🔄 Forçar Atualização

### **Método 1: Hard Refresh**
- **Windows**: `Ctrl+F5`
- **Mac**: `Cmd+Shift+R`

### **Método 2: DevTools**
1. F12 → aba **"Network"**
2. Marque **"Disable cache"**
3. Recarregue a página

### **Método 3: Modo Incógnito**
1. Abra uma janela **incógnita/privada**
2. Acesse: https://astroquiz-admin.vercel.app
3. Faça login
4. Teste o botão

## 🧪 Teste de Funcionamento

### **Passo 1: Verificar Login**
- ✅ Faça login com: `robertomuricy@gmail.com`
- ✅ Verifique se está logado como admin

### **Passo 2: Verificar Console**
- ✅ Abra F12 → Console
- ✅ Clique no botão "Importar Multi-idioma"
- ✅ Deve aparecer: `🔘 Botão 'Importar Multi-idioma' clicado!`

### **Passo 3: Verificar Função**
- ✅ Deve aparecer: `🔍 Função importFromMultipleSheets existe? function`
- ✅ Deve aparecer: `🚀 Função importFromMultipleSheets chamada`

### **Passo 4: Verificar Conexão**
- ✅ Deve aparecer: `🔗 Conectando com Google Sheets`
- ✅ Deve aparecer: `📊 Resposta do Google Sheets`

## 🚨 Se Ainda Não Funcionar

### **Opção 1: Verificar Erros**
1. F12 → Console
2. Procure por erros em **vermelho**
3. Me envie os erros encontrados

### **Opção 2: Verificar Network**
1. F12 → Network
2. Clique no botão
3. Verifique se há requisições para Google Sheets

### **Opção 3: Verificar Sources**
1. F12 → Sources
2. Procure por `QuestionManager.js`
3. Verifique se o código está atualizado

## 📞 Suporte

Se nenhuma solução funcionar:
1. **Screenshot** do console com erros
2. **Screenshot** da aba Network
3. **Descrição** do que acontece ao clicar no botão

---

**Última atualização**: 21/08/2025
**Versão**: 1.0
