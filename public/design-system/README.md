# 🎨 AstroQuiz Design System

Sistema de design completo do AstroQuiz com valores exatos extraídos do Figma.

## 📋 Índice

- [🚀 Início Rápido](#-início-rápido)
- [🎨 Sistema de Cores](#-sistema-de-cores)
- [📝 Tipografia](#-tipografia)
- [🧱 Componentes](#-componentes)
- [📱 Layout](#-layout)
- [🎮 JavaScript](#-javascript)
- [♿ Acessibilidade](#-acessibilidade)
- [📱 Responsividade](#-responsividade)
- [🎭 Animações](#-animações)

## 🚀 Início Rápido

### Instalação

1. **Incluir CSS:**
```html
<link rel="stylesheet" href="css/astroquiz-design-system.css">
```

2. **Incluir JavaScript (opcional):**
```html
<script src="js/astroquiz-components.js"></script>
```

3. **Estrutura HTML básica:**
```html
<body class="stars-background">
    <div class="main-container">
        <div class="content-container">
            <!-- Seu conteúdo aqui -->
        </div>
    </div>
</body>
```

### Exemplo Básico

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AstroQuiz App</title>
    <link rel="stylesheet" href="css/astroquiz-design-system.css">
</head>
<body class="stars-background">
    <div class="main-container">
        <div class="content-container">
            <h1 class="text-header-24">Bem-vindo ao AstroQuiz</h1>
            <button class="btn btn-primary-large">Começar Quiz</button>
        </div>
    </div>
    <script src="js/astroquiz-components.js"></script>
</body>
</html>
```

## 🎨 Sistema de Cores

### Cores Principais

```css
/* Gradientes Primários */
--primary-gradient: linear-gradient(90deg, #FFA726 0%, #FFB74D 100%);
--secondary-gradient: linear-gradient(90deg, #0FB57E 0%, #06996B 100%);

/* Cores Sólidas */
--primary-accent: #F6A510;
--success-green: #0FB57E;
--warning-yellow: #FBF024;
--purple-accent: #8C5CF5;
--white: #FEFEFE;
--black-text: #1E1E1E;
```

### Backgrounds

```css
/* Background Principal */
--bg-primary-gradient: linear-gradient(180deg, #1A1A2E 0%, #3D3D6B 54%, #4A4A7C 96%);

/* Cards */
--bg-card-gradient: linear-gradient(134deg, rgba(94, 74, 139, 0.30) 0%, rgba(123, 107, 168, 0.30) 100%);

/* Daily Challenge */
--bg-daily-challenge: linear-gradient(134deg, rgba(222, 47, 36, 0.30) 0%, rgba(243, 150, 12, 0.30) 100%);
```

### Uso das Cores

```html
<!-- Texto com cores -->
<p class="text-white">Texto branco</p>
<p class="text-primary">Texto primário</p>
<p class="text-secondary">Texto secundário</p>

<!-- Elementos com gradientes -->
<div style="background: var(--primary-gradient);">Gradiente primário</div>
<div style="background: var(--bg-card-gradient);">Background de card</div>
```

## 📝 Tipografia

### Hierarquia Tipográfica

O sistema usa **Poppins** como fonte principal e **SF Pro** para elementos do sistema:

```css
/* Headers */
.text-header-24        /* 24px, Bold - Títulos principais */
.text-title-section-20 /* 20px, Bold - Títulos de seção */

/* Conteúdo */
.text-main-content-16     /* 16px, Bold - Conteúdo principal */
.text-secondary-content-14 /* 14px, Bold - Conteúdo secundário */
.text-auxiliar-14         /* 14px, Medium - Texto auxiliar */
.text-minimum-10          /* 10px, Medium - Texto mínimo */

/* Sistema */
.text-system-17 /* 17px, SF Pro - Elementos do sistema */
```

### Exemplos de Uso

```html
<h1 class="text-header-24">Título Principal</h1>
<h2 class="text-title-section-20">Seção</h2>
<p class="text-main-content-16">Conteúdo principal do parágrafo.</p>
<small class="text-auxiliar-14">Texto auxiliar</small>
<span class="text-minimum-10">Texto pequeno</span>
```

## 🧱 Componentes

### 🔘 Botões

#### Tipos de Botões

```html
<!-- Botão Principal -->
<button class="btn btn-primary-large">Continuar</button>

<!-- Botão Secundário -->
<button class="btn btn-secondary">🔥 Streak 7</button>

<!-- Botão Ghost -->
<button class="btn btn-ghost">Ghost Button</button>

<!-- Botão Purple -->
<button class="btn btn-purple">Purple Action</button>

<!-- Botão Danger -->
<button class="btn btn-danger">Danger Zone</button>
```

#### Tamanhos

```html
<button class="btn btn-primary-large btn-xs">Extra Small</button>
<button class="btn btn-primary-large btn-sm">Small</button>
<button class="btn btn-primary-large btn-md">Medium</button>
<button class="btn btn-primary-large btn-lg">Large</button>
<button class="btn btn-primary-large btn-xl">Extra Large</button>
```

#### Estados

```html
<!-- Desabilitado -->
<button class="btn btn-primary-large" disabled>Disabled</button>

<!-- Loading -->
<button class="btn btn-primary-large btn-loading">Loading...</button>

<!-- Com ícone -->
<button class="btn btn-primary-large btn-icon-left">
    <span class="icon">🚀</span>
    Com Ícone
</button>
```

### 🃏 Cards

#### Level Card Principal

```html
<div class="level-card-main">
    <div class="card-header">
        <div>
            <div class="card-title">Nível Iniciante</div>
            <div class="card-subtitle">Fundamentos da Astronomia</div>
        </div>
        <div class="level-indicator">
            <div class="level-icon">1</div>
            <span class="level-text">Nível 1</span>
        </div>
    </div>
    <div class="card-content">
        <!-- Conteúdo do card -->
    </div>
    <div class="card-footer">
        <button class="btn btn-secondary">Continuar</button>
    </div>
</div>
```

#### Cards Individuais

```html
<!-- Card Ativo -->
<div class="level-card-individual level-card-active" tabindex="0">
    <div class="card-title">Sistema Solar</div>
    <div class="card-subtitle">15 questões</div>
</div>

<!-- Card Completo -->
<div class="level-card-individual level-card-completed" tabindex="0">
    <div class="card-title">Planetas</div>
    <div class="card-subtitle">20 questões</div>
</div>

<!-- Card Bloqueado -->
<div class="level-card-individual level-card-locked">
    <div class="card-title">Galáxias</div>
    <div class="card-subtitle">25 questões</div>
</div>
```

#### Daily Challenge Card

```html
<div class="daily-challenge-card">
    <div class="challenge-icon">🌟</div>
    <div class="challenge-content">
        <div class="challenge-title">Desafio Diário</div>
        <div class="challenge-subtitle">Complete 5 questões sobre estrelas</div>
    </div>
    <div class="challenge-reward">
        <span>+50</span> ⭐
    </div>
</div>
```

### 📊 Progress Components

#### Progress Bar

```html
<div class="progress-bar-labeled">
    <div class="progress-bar-label">
        <span class="progress-bar-title">Progresso</span>
        <span class="progress-bar-percentage">75%</span>
    </div>
    <div class="progress-bar-container" data-progress="75">
        <div class="progress-bar-fill">
            <div class="progress-bar-thumb"></div>
        </div>
    </div>
</div>
```

#### Circular Progress

```html
<div class="circular-progress" data-progress="75">
    <svg class="circular-progress-svg" viewBox="0 0 80 80">
        <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#FFA726"/>
                <stop offset="100%" style="stop-color:#FFB74D"/>
            </linearGradient>
        </defs>
        <circle class="circular-progress-track" cx="40" cy="40" r="37"/>
        <circle class="circular-progress-fill" cx="40" cy="40" r="37"/>
    </svg>
    <div class="circular-progress-text">75%</div>
</div>
```

#### Avatar com Badge

```html
<div class="avatar-circle">
    <div class="avatar-initials">JD</div>
    <div class="avatar-level-badge">15</div>
</div>

<!-- Com imagem -->
<div class="avatar-circle">
    <img src="avatar.jpg" alt="Avatar do usuário">
    <div class="avatar-level-badge">15</div>
</div>
```

#### Rating Stars

```html
<!-- Interativo -->
<div class="rating-stars" data-rating="0">
    <div class="rating-star"></div>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
</div>

<!-- Somente leitura -->
<div class="rating-stars" data-rating="4" readonly>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
    <div class="rating-star"></div>
</div>
```

### 📝 Question Card

```html
<div class="question-card">
    <div class="question-header">
        <div class="question-number">Questão 1</div>
        <div class="question-difficulty">
            <div class="difficulty-star active"></div>
            <div class="difficulty-star active"></div>
            <div class="difficulty-star active"></div>
            <div class="difficulty-star"></div>
            <div class="difficulty-star"></div>
        </div>
    </div>
    <div class="question-text">
        Qual é o planeta mais próximo do Sol?
    </div>
    <div class="question-options">
        <div class="option" data-option="a">
            <div class="option-letter">A</div>
            <div class="option-text">Mercúrio</div>
        </div>
        <div class="option" data-option="b">
            <div class="option-letter">B</div>
            <div class="option-text">Vênus</div>
        </div>
        <!-- Mais opções... -->
    </div>
</div>
```

## 📱 Layout

### Estrutura Principal

```html
<body class="stars-background">
    <!-- Status Bar -->
    <div class="status-bar">
        <div class="status-time">9:41</div>
        <div class="status-indicators">
            <div class="status-signal"></div>
            <div class="status-wifi"></div>
            <div class="status-battery"></div>
        </div>
    </div>

    <!-- Main Container -->
    <div class="main-container">
        <div class="content-container">
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Título da Página</h1>
                    <p class="page-subtitle">Subtítulo</p>
                </div>
                <div class="header-actions">
                    <!-- Ações do header -->
                </div>
            </div>

            <!-- Content -->
            <main id="main-content">
                <!-- Seu conteúdo aqui -->
            </main>
        </div>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar">
        <div class="tab-item tab-item-active" data-tab="home">
            <div class="tab-icon">🏠</div>
            <div class="tab-label">Home</div>
        </div>
        <!-- Mais tabs... -->
    </div>
</body>
```

### Grid Layouts

```html
<!-- Grid básico -->
<div class="grid grid-2">
    <div>Item 1</div>
    <div>Item 2</div>
</div>

<!-- Grid de cards -->
<div class="grid-cards">
    <div class="level-card-individual">Card 1</div>
    <div class="level-card-individual">Card 2</div>
    <div class="level-card-individual">Card 3</div>
</div>

<!-- Stack layouts -->
<div class="stack stack-lg">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
</div>

<div class="hstack hstack-md">
    <div>Item A</div>
    <div>Item B</div>
    <div>Item C</div>
</div>
```

### Tab Bar

```html
<div class="tab-bar">
    <div class="tab-item tab-item-active" data-tab="home" tabindex="0">
        <div class="tab-icon">🏠</div>
        <div class="tab-label">Home</div>
    </div>
    <div class="tab-item" data-tab="levels" tabindex="0">
        <div class="tab-icon">🎯</div>
        <div class="tab-label">Níveis</div>
    </div>
    <div class="tab-item" data-tab="progress" tabindex="0">
        <div class="tab-icon">📊</div>
        <div class="tab-label">Progresso</div>
        <div class="tab-badge">2</div>
    </div>
</div>
```

## 🎮 JavaScript

### Inicialização

O JavaScript é inicializado automaticamente quando o DOM está pronto:

```javascript
// Acesso à instância global
window.AstroQuiz

// Métodos disponíveis
window.AstroQuiz.updateProgress('.my-progress', 85);
window.AstroQuiz.showNotification('Sucesso!', 'success');
window.AstroQuiz.triggerCelebration();
```

### Eventos Personalizados

```javascript
// Mudança de tab
document.addEventListener('tabChanged', (e) => {
    console.log('Tab ativa:', e.detail.activeTab);
});

// Opção selecionada
document.addEventListener('optionSelected', (e) => {
    console.log('Opção:', e.detail.option);
});

// Rating alterado
document.addEventListener('ratingChanged', (e) => {
    console.log('Rating:', e.detail.rating);
});
```

### Métodos Úteis

```javascript
// Atualizar progress bar
window.AstroQuiz.updateProgress('#my-progress', 75);

// Mostrar resposta correta
window.AstroQuiz.showCorrectAnswer(optionElement);

// Mostrar resposta errada
window.AstroQuiz.showWrongAnswer(wrongElement, correctElement);

// Desbloquear nível
window.AstroQuiz.unlockLevel(levelCardElement);

// Mostrar notificação
window.AstroQuiz.showNotification('Mensagem', 'success|error|info|warning');

// Celebração
window.AstroQuiz.triggerCelebration();

// Definir botão como loading
window.AstroQuiz.setButtonLoading(buttonElement, true);
```

## ♿ Acessibilidade

### Recursos Implementados

- **Navegação por teclado** completa
- **ARIA labels** automáticos
- **Focus management** inteligente
- **Skip links** para navegação rápida
- **Screen reader** support
- **High contrast** mode support
- **Reduced motion** support

### Boas Práticas

```html
<!-- Sempre use labels apropriados -->
<button class="btn btn-primary-large" aria-label="Iniciar quiz de astronomia">
    Começar
</button>

<!-- Progress bars com ARIA -->
<div class="progress-bar-container" 
     role="progressbar" 
     aria-valuenow="75" 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label="Progresso do nível: 75%">
    <!-- ... -->
</div>

<!-- Cards interativos -->
<div class="level-card-individual" 
     tabindex="0" 
     role="button"
     aria-label="Sistema Solar - 15 questões disponíveis">
    <!-- ... -->
</div>
```

### Navegação por Teclado

- **Tab**: Navegar entre elementos focáveis
- **Enter/Space**: Ativar botões e cards
- **Arrow Keys**: Navegar entre tabs
- **Escape**: Fechar modais/overlays

## 📱 Responsividade

### Breakpoints

```css
/* Mobile First */
@media (max-width: 480px) { /* Smartphones */ }
@media (max-width: 360px) { /* Smartphones pequenos */ }
@media (min-width: 768px) { /* Tablets */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### Classes Utilitárias

```html
<!-- Mostrar/esconder por tamanho -->
<div class="show-mobile">Visível apenas no mobile</div>
<div class="hide-mobile">Oculto no mobile</div>

<!-- Texto responsivo -->
<h1 class="text-header-24 text-responsive-lg">Título Responsivo</h1>

<!-- Botões responsivos -->
<button class="btn btn-primary-large btn-responsive">
    Botão que ocupa toda a largura no mobile
</button>
```

### Adaptações Automáticas

- **Cards** se ajustam automaticamente
- **Grid layouts** se reorganizam
- **Tab bar** se adapta à largura da tela
- **Progress bars** mantêm proporções
- **Typography** se ajusta para legibilidade

## 🎭 Animações

### Classes de Animação

```html
<!-- Fade animations -->
<div class="fade-in">Fade in</div>
<div class="fade-in-up">Fade in up</div>
<div class="fade-in-down">Fade in down</div>
<div class="fade-in-left">Fade in left</div>
<div class="fade-in-right">Fade in right</div>

<!-- Scale animations -->
<div class="scale-in">Scale in</div>
<div class="scale-in-bounce">Scale in bounce</div>

<!-- Slide animations -->
<div class="slide-in-up">Slide in up</div>
<div class="slide-in-down">Slide in down</div>

<!-- Stagger animations -->
<div class="stagger-children">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
</div>
```

### Animações de Game

```html
<!-- Resposta correta -->
<div class="option answer-correct">Opção correta</div>

<!-- Resposta errada -->
<div class="option answer-wrong">Opção errada</div>

<!-- Nível desbloqueado -->
<div class="level-card-individual level-unlock">Nível desbloqueado</div>
```

### Controle de Animações

```css
/* Desabilitar animações globalmente */
.theme-reduced-motion * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
}

/* Respeitar preferências do usuário */
@media (prefers-reduced-motion: reduce) {
    /* Animações são automaticamente desabilitadas */
}
```

## 🎨 Customização

### Variáveis CSS

Você pode customizar o design system alterando as variáveis CSS:

```css
:root {
    /* Cores personalizadas */
    --primary-gradient: linear-gradient(90deg, #FF6B6B 0%, #FF8E53 100%);
    --secondary-gradient: linear-gradient(90deg, #4ECDC4 0%, #44A08D 100%);
    
    /* Espaçamentos personalizados */
    --spacing-custom: 18px;
    
    /* Bordas personalizadas */
    --radius-custom: 20px;
    
    /* Fontes personalizadas */
    --font-custom: 'Inter', sans-serif;
}
```

### Temas

```css
/* Tema claro */
.theme-light {
    --bg-primary-gradient: linear-gradient(180deg, #F8F9FA 0%, #E9ECEF 54%, #DEE2E6 96%);
    --white: #212529;
    --black-text: #FFFFFF;
}

/* Alto contraste */
.theme-high-contrast {
    --primary-gradient: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
    --secondary-gradient: linear-gradient(90deg, #00FF00 0%, #32CD32 100%);
}
```

### Componentes Personalizados

```css
/* Estender componentes existentes */
.meu-botao-especial {
    @extend .btn, .btn-primary-large;
    
    /* Customizações adicionais */
    border-radius: 30px;
    font-size: 18px;
    padding: 12px 48px;
}

/* Criar novos componentes usando o sistema */
.minha-card-especial {
    background: var(--bg-card-gradient);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-2xl);
    padding: var(--spacing-xl);
    color: var(--white);
    font-family: var(--font-primary);
    transition: all var(--transition-normal);
}
```

## 🔧 Desenvolvimento

### Estrutura de Arquivos

```
design-system/
├── css/
│   ├── variables.css      # Variáveis CSS
│   ├── buttons.css        # Componentes de botões
│   ├── cards.css          # Componentes de cards
│   ├── progress.css       # Componentes de progresso
│   ├── layout.css         # Layout e containers
│   └── astroquiz-design-system.css  # CSS principal
├── js/
│   └── astroquiz-components.js      # JavaScript interativo
├── demo/
│   └── index.html         # Página de demonstração
└── README.md              # Esta documentação
```

### Build e Deploy

O design system é construído com CSS puro e JavaScript vanilla, não requerendo build tools específicos. Para usar em produção:

1. **Minificar CSS e JS** para melhor performance
2. **Otimizar imagens** se houver
3. **Configurar CDN** para assets estáticos
4. **Habilitar compressão gzip** no servidor

### Contribuição

Para contribuir com o design system:

1. **Mantenha consistência** com os valores do Figma
2. **Teste acessibilidade** em todos os componentes
3. **Documente mudanças** no README
4. **Teste responsividade** em diferentes dispositivos
5. **Valide HTML/CSS** antes do commit

## 📞 Suporte

Para dúvidas, sugestões ou problemas:

- **Documentação**: Consulte este README
- **Demo**: Acesse `demo/index.html` para exemplos
- **Código**: Veja os arquivos CSS/JS comentados
- **Issues**: Reporte problemas no repositório

---

🎨 **AstroQuiz Design System v1.0.0** - Sistema de design fiel ao Figma com componentes reutilizáveis e acessíveis.
