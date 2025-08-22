#!/usr/bin/env node

/**
 * Script para limpar cache do painel admin
 * Execute este script quando houver problemas de cache
 */

console.log('🧹 Limpando cache do painel admin...');

// Instruções para o usuário
console.log(`
📋 INSTRUÇÕES PARA LIMPAR CACHE:

1. 🖥️ NO NAVEGADOR (Chrome/Edge):
   - Pressione Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
   - Ou vá em F12 → Application → Storage → Clear storage

2. 🧹 LIMPAR CACHE LOCAL:
   - Vá em F12 → Application → Storage
   - Clique em "Clear site data"
   - Recarregue a página

3. 🔄 FORÇAR ATUALIZAÇÃO:
   - Pressione Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)
   - Ou vá em F12 → Network → Disable cache

4. 🗑️ LIMPAR DADOS DO SITE:
   - Vá em Configurações do Chrome
   - Privacidade e segurança → Cookies e dados do site
   - Encontre "astroquiz-admin.vercel.app"
   - Clique em "Remover"

5. 🔍 VERIFICAR CONSOLE:
   - Pressione F12 → Console
   - Clique no botão "Importar Multi-idioma"
   - Veja se aparece: "🚀 Função importFromMultipleSheets chamada"

6. 🚀 TESTE FINAL:
   - Acesse: https://astroquiz-admin.vercel.app
   - Faça login com: robertomuricy@gmail.com
   - Clique em "Importar Multi-idioma"
   - Deve conectar diretamente com Google Sheets (sem upload)
`);

console.log('✅ Instruções exibidas. Siga os passos acima para limpar o cache.');
