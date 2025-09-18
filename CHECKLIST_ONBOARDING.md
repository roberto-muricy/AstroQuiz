# ✅ Checklist de Onboarding - AstroQuiz

## 🎯 **Setup Inicial (15 minutos)**

### **Pré-requisitos:**
- [ ] Node.js 18+ instalado
- [ ] npm 8+ instalado
- [ ] Git configurado
- [ ] Editor de código (VS Code recomendado)

### **Clone e Setup:**
- [ ] Clonar repositório
- [ ] Navegar para `quiz-cms/`
- [ ] Executar `npm install`
- [ ] Verificar se não há erros de dependências

### **Primeiro Teste:**
- [ ] Executar `npm run develop`
- [ ] Aguardar servidor inicializar (2-3 minutos)
- [ ] Acessar http://localhost:1337/admin
- [ ] Criar conta de administrador
- [ ] Acessar http://localhost:1337/design-system/home-screen.html

## 🧪 **Testes Básicos (10 minutos)**

### **API Tests:**
- [ ] Executar `npm run test:api`
- [ ] Verificar se todos os testes passam
- [ ] Testar API manualmente: `curl http://localhost:1337/api/questions?pagination[pageSize]=1`

### **Interface Tests:**
- [ ] Verificar se ícones aparecem corretamente
- [ ] Testar navegação entre tabs
- [ ] Verificar responsividade (redimensionar janela)
- [ ] Testar diferentes idiomas na API

### **Performance Tests:**
- [ ] Executar `npm run test:performance`
- [ ] Verificar métricas de performance
- [ ] Testar carregamento de páginas

## 🎨 **Exploração do Design System (15 minutos)**

### **Estrutura de Arquivos:**
- [ ] Explorar `public/design-system/`
- [ ] Verificar `css/variables.css`
- [ ] Examinar `home-screen.html`
- [ ] Testar `test-icons.html`

### **Customização Básica:**
- [ ] Alterar uma cor no `variables.css`
- [ ] Modificar um texto no `home-screen.html`
- [ ] Testar mudança de fonte
- [ ] Verificar se alterações aparecem no navegador

## 🌍 **Sistema Multilíngue (10 minutos)**

### **Teste de Idiomas:**
- [ ] Testar API em português: `?locale=pt`
- [ ] Testar API em inglês: `?locale=en`
- [ ] Testar API em espanhol: `?locale=es`
- [ ] Testar API em francês: `?locale=fr`

### **Admin Panel:**
- [ ] Acessar Content Manager
- [ ] Verificar perguntas existentes
- [ ] Testar criação de nova pergunta
- [ ] Verificar traduções

## 🛠️ **Desenvolvimento (20 minutos)**

### **Backend (Strapi):**
- [ ] Explorar `src/api/`
- [ ] Verificar middlewares em `src/middlewares/`
- [ ] Examinar plugins em `src/plugins/`
- [ ] Entender estrutura de content types

### **Frontend:**
- [ ] Modificar um componente
- [ ] Adicionar novo estilo CSS
- [ ] Testar responsividade
- [ ] Verificar compatibilidade

### **Integração:**
- [ ] Testar comunicação frontend-backend
- [ ] Verificar APIs funcionando
- [ ] Testar sistema de cache
- [ ] Verificar logs do sistema

## 🐛 **Troubleshooting (10 minutos)**

### **Problemas Comuns:**
- [ ] Servidor não inicia → Verificar porta 1337
- [ ] Ícones não aparecem → Usar servidor Strapi
- [ ] Erro de dependências → Reinstalar node_modules
- [ ] Cache issues → Limpar cache do navegador

### **Comandos de Diagnóstico:**
- [ ] `ps aux | grep strapi` - Verificar processo
- [ ] `lsof -i :1337` - Verificar porta
- [ ] `tail -f strapi.log` - Ver logs
- [ ] `npm run test:api` - Testar API

## 📚 **Documentação (5 minutos)**

### **Arquivos Importantes:**
- [ ] Ler `README.md`
- [ ] Consultar `QUICK_START.md`
- [ ] Examinar `docs/` folder
- [ ] Verificar `ONBOARDING_DEVELOPERS.md`

### **Recursos Externos:**
- [ ] Documentação Strapi: https://docs.strapi.io
- [ ] Google Fonts: https://fonts.google.com
- [ ] CSS Variables: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties

## 🎯 **Próximos Passos**

### **Para Frontend:**
- [ ] Customizar design system
- [ ] Adicionar novos componentes
- [ ] Implementar animações
- [ ] Otimizar performance

### **Para Backend:**
- [ ] Criar novas APIs
- [ ] Implementar autenticação
- [ ] Adicionar middlewares
- [ ] Configurar banco de dados

### **Para Full-Stack:**
- [ ] Integrar frontend-backend
- [ ] Implementar testes E2E
- [ ] Configurar CI/CD
- [ ] Deploy em produção

## ✅ **Finalização**

### **Checklist Final:**
- [ ] Projeto rodando localmente
- [ ] Todos os testes passando
- [ ] Interface funcionando
- [ ] APIs respondendo
- [ ] Documentação lida
- [ ] Pronto para desenvolvimento

---

**🎉 Parabéns! Você está pronto para contribuir com o AstroQuiz!**

**📞 Em caso de dúvidas, consulte a documentação ou entre em contato com a equipe.**
