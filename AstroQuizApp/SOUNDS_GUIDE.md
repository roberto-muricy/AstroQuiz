# 🎵 Guia de Sons do AstroQuiz

## 📁 Estrutura de Arquivos de Som

Crie a pasta `src/assets/sounds/` e adicione os seguintes arquivos:

```
src/assets/sounds/
├── correct.mp3           # Som de acerto (positivo, alegre)
├── incorrect.mp3         # Som de erro (negativo)
├── select.mp3            # Som de seleção (clique sutil)
├── warning.mp3           # Som de aviso (últimos 10s)
├── complete.mp3          # Som de fase completada
├── perfect.mp3           # Som de perfect score
├── unlock.mp3            # Som de fase desbloqueada
├── streak.mp3            # Som de streak (opcional)
└── background-music.mp3  # Música de fundo ambiente (loop)
```

## 🎼 Onde Encontrar Sons Gratuitos

### **Opção 1: Freesound.org**
- https://freesound.org
- Busque por: "success", "error", "click", "achievement"
- Licença: Creative Commons (livre para uso)

### **Opção 2: Zapsplat.com**
- https://www.zapsplat.com
- Categoria: Game Sounds > UI
- Formato: MP3 ou WAV

### **Opção 3: Mixkit.co**
- https://mixkit.co/free-sound-effects/
- Sons de alta qualidade
- Licença gratuita

## 💡 Recomendações de Sons

### ✅ **correct.mp3**
- Tom: Alegre, positivo (C major chord)
- Duração: 0.3-0.5s
- Palavras-chave: "success", "correct", "positive beep"

### ❌ **incorrect.mp3**
- Tom: Grave, negativo (buzz)
- Duração: 0.4-0.6s
- Palavras-chave: "error", "wrong", "buzz"

### 🎯 **select.mp3**
- Tom: Neutro, sutil (tick)
- Duração: 0.1-0.2s
- Palavras-chave: "click", "tap", "select"

### ⚠️ **warning.mp3**
- Tom: Urgente (beep beep)
- Duração: 0.3s
- Palavras-chave: "warning", "alert", "beep"

### 🎉 **complete.mp3**
- Tom: Celebração
- Duração: 1-2s
- Palavras-chave: "level complete", "achievement"

### 👑 **perfect.mp3**
- Tom: Vitória épica
- Duração: 2-3s
- Palavras-chave: "victory", "fanfare", "triumph"

### 🔓 **unlock.mp3**
- Tom: Mágico, desbloqueio
- Duração: 0.8-1.2s
- Palavras-chave: "unlock", "achievement", "power up"

### 🎼 **background-music.mp3**
- Tom: Ambiente espacial, calmo
- Duração: 60-120s (loop)
- Palavras-chave: "ambient space", "game music", "calm background"
- Volume: Baixo (30%) para não distrair
- Recomendação: Música instrumental/eletrônica suave com tema espacial

## 🔧 Como Adicionar Os Sons

### Passo 1: Baixar os arquivos de som

### Passo 2: Colocar na pasta
```bash
mkdir -p src/assets/sounds
# Copiar arquivos .mp3 para esta pasta
```

### Passo 3: Atualizar o soundService.ts

Descomente e atualize a função `loadSounds()`:

```typescript
private loadSounds() {
  try {
    this.sounds.correct = new Sound('correct.mp3', Sound.MAIN_BUNDLE);
    this.sounds.incorrect = new Sound('incorrect.mp3', Sound.MAIN_BUNDLE);
    this.sounds.select = new Sound('select.mp3', Sound.MAIN_BUNDLE);
    this.sounds.warning = new Sound('warning.mp3', Sound.MAIN_BUNDLE);
    this.sounds.complete = new Sound('complete.mp3', Sound.MAIN_BUNDLE);
    this.sounds.perfect = new Sound('perfect.mp3', Sound.MAIN_BUNDLE);
    this.sounds.unlock = new Sound('unlock.mp3', Sound.MAIN_BUNDLE);
    this.sounds.streak = new Sound('streak.mp3', Sound.MAIN_BUNDLE);
    
    console.log('🎵 Sons carregados com sucesso!');
  } catch (error) {
    console.error('Erro ao carregar sons:', error);
  }
}
```

### Passo 4: Rebuild do app
```bash
# iOS
cd ios && pod install && cd ..
npm run ios

# Android  
npm run android
```

## 🎚️ Controle de Volume

Por enquanto, os sons usam o volume do sistema. Para adicionar controle no app:

```typescript
// Em Settings/Profile
soundService.setEnabled(false); // Desligar sons
soundService.setEnabled(true);  // Ligar sons
```

## ⚡ Status Atual

✅ **Haptic Feedback implementado** (vibrações)
✅ **Sistema de configurações** (sons/vibração ligam/desligam)
✅ **Música de fundo** (pronta para adicionar arquivo)
⏳ **Arquivos de som** (adicionar MP3s)

**Enquanto não adicionar os arquivos**, o app usa apenas **vibrações táteis** que já funcionam muito bem!

## 🎛️ Configurações Disponíveis

Na aba **Perfil**, o usuário pode:
- 🎵 **Ligar/Desligar Sons** - Efeitos sonoros do jogo
- 📳 **Ligar/Desligar Vibração** - Feedback tátil
- 🎼 **Ligar/Desligar Música** - Música ambiente de fundo
- 🔔 **Ligar/Desligar Notificações** - Alertas do app

**Todas as configurações são salvas automaticamente!**

## 🎮 Padrões de Vibração Atuais

- **Select**: 10ms (tap sutil)
- **Correct**: [50ms, pausa 50ms, 100ms] (alegre)
- **Incorrect**: [100ms, pausa 50ms, 100ms, pausa 50ms, 100ms] (erro triplo)
- **Warning**: 30ms (alerta)
- **Streak**: Intensidade aumenta com streak
- **Complete**: [100ms, pausa 100ms, 100ms] (celebração)
- **Perfect**: [100ms, pausa 50ms, 100ms, pausa 50ms, 200ms] (vitória)
- **Unlock**: [50ms, pausa 30ms, 70ms, pausa 30ms, 100ms] (mágico)

