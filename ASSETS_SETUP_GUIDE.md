# 📁 AstroQuiz Assets Setup Guide

## 🎯 **COMO ORGANIZAR SEUS ASSETS DO FIGMA**

### 📂 **1. Preparação das Pastas**

Baseado nas suas pastas `AstroQuiz_img` e `AstroQuiz_icon`, siga estes passos:

#### **Opção A: Mover Pastas para o Projeto**
```bash
# Mover suas pastas para o diretório do projeto
mv /caminho/para/AstroQuiz_img /Users/robertomuricy/Documents/AstroQuiz\ Project/quiz-cms/
mv /caminho/para/AstroQuiz_icon /Users/robertomuricy/Documents/AstroQuiz\ Project/quiz-cms/
```

#### **Opção B: Criar Links Simbólicos**
```bash
# Criar links para suas pastas (mantém arquivos no local original)
ln -s /caminho/para/AstroQuiz_img /Users/robertomuricy/Documents/AstroQuiz\ Project/quiz-cms/
ln -s /caminho/para/AstroQuiz_icon /Users/robertomuricy/Documents/AstroQuiz\ Project/quiz-cms/
```

### 🚀 **2. Executar Organização Automática**

```bash
# Organizar todos os assets automaticamente
npm run assets:organize

# Ou executar diretamente
node scripts/organize-assets.js
```

### 🎨 **3. Otimizar Assets (Opcional)**

```bash
# Otimizar imagens e ícones para produção
npm run assets:optimize

# Ou executar tudo de uma vez
npm run assets:all
```

## 📊 **ESTRUTURA RESULTANTE**

Após a organização, seus assets ficarão assim:

```
public/assets/
├── images/                    # Imagens do AstroQuiz_img
│   ├── backgrounds/          # Fundos e gradientes
│   │   ├── bg-stars-space.png
│   │   ├── bg-gradient-main.png
│   │   └── bg-nebula-texture.png
│   ├── levels/               # Imagens de níveis
│   │   ├── level-solar-system.png
│   │   ├── level-planets.png
│   │   └── level-galaxy.png
│   ├── achievements/         # Badges e conquistas
│   │   ├── achievement-first-quiz.png
│   │   ├── achievement-streak.png
│   │   └── achievement-expert.png
│   ├── avatars/             # Avatars de usuário
│   │   ├── avatar-astronaut.png
│   │   ├── avatar-scientist.png
│   │   └── avatar-default.png
│   └── misc/                # Outros assets
│       ├── logo-astroquiz.png
│       └── splash-screen.png
├── icons/                   # Ícones do AstroQuiz_icon
│   ├── navigation/          # Navegação
│   │   ├── nav-home.svg
│   │   ├── nav-levels.svg
│   │   ├── nav-progress.svg
│   │   └── nav-profile.svg
│   ├── actions/            # Ações
│   │   ├── action-play.svg
│   │   ├── action-pause.svg
│   │   └── action-settings.svg
│   ├── status/             # Estados
│   │   ├── status-correct.svg
│   │   ├── status-wrong.svg
│   │   └── status-star.svg
│   └── game/               # Jogo
│       ├── game-planet.svg
│       ├── game-rocket.svg
│       └── game-telescope.svg
└── optimized/              # Versões otimizadas (após otimização)
    ├── images/
    ├── icons/
    └── sprite.svg          # Sprite de ícones
```

## 🎯 **CATEGORIZAÇÃO AUTOMÁTICA**

O script categoriza automaticamente baseado no nome dos arquivos:

### 🖼️ **Imagens (PNG/JPG)**
- **backgrounds**: `bg`, `background`, `gradient`, `stars`, `space`, `nebula`
- **levels**: `level`, `sistema-solar`, `planet`, `solar`, `galaxy`
- **achievements**: `achievement`, `badge`, `trophy`, `medal`, `award`
- **avatars**: `avatar`, `profile`, `user`, `astronaut`, `scientist`
- **misc**: `logo`, `splash`, `icon`, outros

### 🎯 **Ícones (SVG)**
- **navigation**: `home`, `menu`, `tab`, `nav`, `back`
- **actions**: `play`, `pause`, `settings`, `config`
- **status**: `correct`, `wrong`, `star`, `check`, `error`
- **game**: `planet`, `rocket`, `telescope`, `galaxy`, `star`

## 💡 **RENOMEAÇÃO INTELIGENTE**

O script limpa e padroniza nomes automaticamente:

### Antes:
```
ChatGPT Image 3 de set. de 2025, 20_47_04.png
AstroQuiz_icon_home_button.svg
bg_removal [Background removed].png
```

### Depois:
```
bg-space-gradient.png
nav-home.svg
bg-removed-background.png
```

## 🚀 **COMO USAR NO CÓDIGO**

### **HTML**
```html
<!-- Imagem de fundo -->
<div style="background-image: url('/assets/images/backgrounds/bg-stars-space.png')"></div>

<!-- Ícone individual -->
<img src="/assets/icons/navigation/nav-home.svg" alt="Home">

<!-- Ícone do sprite (após otimização) -->
<svg class="icon">
  <use href="/assets/optimized/icons/sprite.svg#icon-home"></use>
</svg>
```

### **CSS**
```css
/* Background */
.stars-background {
  background-image: url('/assets/images/backgrounds/bg-stars-space.png');
}

/* Ícone como background */
.home-icon {
  background-image: url('/assets/icons/navigation/nav-home.svg');
}
```

### **React/Vue/Angular**
```javascript
// Import direto
import starsBg from '/assets/images/backgrounds/bg-stars-space.png';
import homeIcon from '/assets/icons/navigation/nav-home.svg';

// Uso dinâmico
const getAsset = (category, name) => `/assets/${category}/${name}`;
const bgImage = getAsset('images/backgrounds', 'bg-stars-space.png');
```

### **Design System Integration**
```css
/* Usar com o design system */
.level-card-main {
  background-image: url('/assets/images/levels/level-solar-system.png');
  background-size: cover;
}

.nav-icon {
  mask-image: url('/assets/icons/navigation/nav-home.svg');
  background-color: var(--primary-accent);
}
```

## 📊 **RELATÓRIOS GERADOS**

Após a organização, você terá:

### **1. assets-organization-report.json**
```json
{
  "timestamp": "2025-01-13T...",
  "summary": {
    "totalFiles": 45,
    "byType": {
      "images": 28,
      "icons": 17
    }
  },
  "files": [...]
}
```

### **2. public/assets/README.md**
- Lista completa de assets
- Como usar cada categoria
- Exemplos de código

### **3. optimization-report.json** (após otimização)
```json
{
  "summary": {
    "totalSavings": "35.2%",
    "totalOriginalSize": 2048576,
    "totalOptimizedSize": 1327104
  }
}
```

## 🛠️ **COMANDOS DISPONÍVEIS**

```bash
# Organizar assets das pastas do Figma
npm run assets:organize

# Otimizar assets para produção
npm run assets:optimize

# Fazer tudo de uma vez
npm run assets:all

# Ver estrutura criada
ls -la public/assets/

# Ver relatório
cat assets-organization-report.json
```

## 🎯 **PRÓXIMOS PASSOS**

1. **Mover/Linkar** suas pastas `AstroQuiz_img` e `AstroQuiz_icon`
2. **Executar** `npm run assets:organize`
3. **Verificar** a estrutura em `public/assets/`
4. **Otimizar** com `npm run assets:optimize` (opcional)
5. **Usar** os assets no seu código

## 🔧 **CUSTOMIZAÇÃO**

Se precisar ajustar a categorização, edite o arquivo `scripts/organize-assets.js`:

```javascript
// Adicionar novas categorias
this.categoryMappings = {
  images: {
    // Sua nova categoria
    characters: ['character', 'person', 'alien', 'robot'],
    // ...
  }
};
```

## 📱 **INTEGRAÇÃO COM DESIGN SYSTEM**

Os assets organizados funcionam perfeitamente com o Design System:

```html
<!-- Card com background personalizado -->
<div class="level-card-main" style="background-image: url('/assets/images/levels/level-solar-system.png')">
  <div class="card-title">Sistema Solar</div>
</div>

<!-- Botão com ícone -->
<button class="btn btn-primary-large">
  <img src="/assets/icons/actions/action-play.svg" class="icon" alt="">
  Jogar
</button>
```

---

🎨 **Assets organizados e prontos para uso no AstroQuiz!** 🚀

