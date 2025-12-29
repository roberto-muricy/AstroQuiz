/**
 * Sound Service
 * Gerencia todos os sons do jogo
 */

// import Sound from 'react-native-sound'; // Desabilitado temporariamente
import { Vibration } from 'react-native';
import { SettingsStorage } from '@/utils/settingsStorage';

// Habilitar reprodução em modo silencioso (iOS)
// Sound.setCategory('Playback');

class SoundService {
  private sounds: { [key: string]: any } = {};
  private backgroundMusic: any = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;
  private musicEnabled: boolean = false;

  constructor() {
    this.loadSounds();
    this.loadSettings();
  }

  /**
   * Carregar configurações salvas
   */
  private async loadSettings() {
    try {
      const settings = await SettingsStorage.getSettings();
      this.soundEnabled = settings.soundEnabled;
      this.vibrationEnabled = settings.vibrationEnabled;
      this.musicEnabled = settings.musicEnabled;
      console.log('🔊 Settings loaded - Sound:', this.soundEnabled, 'Vibration:', this.vibrationEnabled, 'Music:', this.musicEnabled);
      
      // Iniciar música se habilitada
      if (this.musicEnabled) {
        this.playBackgroundMusic();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de som:', error);
    }
  }

  /**
   * Carregar todos os sons
   */
  private loadSounds() {
    try {
      // Sons usando tons gerados (sem necessidade de arquivos)
      // Vamos usar Vibration patterns por enquanto até adicionar arquivos de som
      console.log('🎵 Sound service initialized');
    } catch (error) {
      console.error('Erro ao carregar sons:', error);
    }
  }

  /**
   * Ativar/desativar sons
   */
  async setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    await SettingsStorage.setSoundEnabled(enabled);
  }

  /**
   * Ativar/desativar vibrações
   */
  async setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
    await SettingsStorage.setVibrationEnabled(enabled);
  }

  /**
   * Ativar/desativar música de fundo
   */
  async setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    await SettingsStorage.setMusicEnabled(enabled);
    
    if (enabled) {
      this.playBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  /**
   * Obter status das configurações
   */
  getSettings() {
    return {
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled,
      musicEnabled: this.musicEnabled,
    };
  }

  /**
   * Tocar música de fundo em loop
   */
  playBackgroundMusic() {
    if (!this.musicEnabled) return;
    
    // TODO: Adicionar arquivo de música de fundo
    // Quando adicionar o arquivo background-music.mp3:
    /*
    if (!this.backgroundMusic) {
      this.backgroundMusic = new Sound('background-music.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('Erro ao carregar música de fundo:', error);
          return;
        }
        
        this.backgroundMusic?.setVolume(0.3); // Volume baixo (30%)
        this.backgroundMusic?.setNumberOfLoops(-1); // Loop infinito
        this.backgroundMusic?.play();
        console.log('🎼 Música de fundo iniciada');
      });
    } else {
      this.backgroundMusic.play();
    }
    */
    
    console.log('🎼 Música de fundo: Adicione o arquivo background-music.mp3 para ativar');
  }

  /**
   * Parar música de fundo
   */
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      console.log('⏸️ Música de fundo pausada');
    }
  }

  /**
   * Pausar temporariamente a música (durante quiz)
   */
  pauseMusic() {
    if (this.backgroundMusic && this.musicEnabled) {
      this.backgroundMusic.setVolume(0.1); // Reduzir volume durante quiz
    }
  }

  /**
   * Retomar volume normal da música
   */
  resumeMusic() {
    if (this.backgroundMusic && this.musicEnabled) {
      this.backgroundMusic.setVolume(0.3); // Volume normal
    }
  }

  /**
   * Som de seleção de resposta (leve)
   */
  playSelect() {
    if (!this.vibrationEnabled) return;
    Vibration.vibrate(10);
  }

  /**
   * Som de resposta correta
   */
  playCorrect() {
    if (this.vibrationEnabled) {
      // Padrão de vibração alegre
      Vibration.vibrate([0, 50, 50, 100]);
    }
    
    if (this.soundEnabled) {
      // TODO: Adicionar arquivo de som
      // this.playSound('correct');
    }
  }

  /**
   * Som de resposta incorreta
   */
  playIncorrect() {
    if (this.vibrationEnabled) {
      // Padrão de vibração de erro
      Vibration.vibrate([0, 100, 50, 100, 50, 100]);
    }
    
    if (this.soundEnabled) {
      // TODO: Adicionar arquivo de som
      // this.playSound('incorrect');
    }
  }

  /**
   * Som de countdown crítico (últimos 10s)
   */
  playWarning() {
    if (this.vibrationEnabled) {
      Vibration.vibrate(30);
    }
    
    if (this.soundEnabled) {
      // TODO: Adicionar arquivo de som
      // this.playSound('warning');
    }
  }

  /**
   * Som de fase completada
   */
  playPhaseComplete(isPerfect: boolean = false) {
    if (this.vibrationEnabled) {
      if (isPerfect) {
        // Vibração especial para perfect score
        Vibration.vibrate([0, 100, 50, 100, 50, 200]);
      } else {
        // Vibração normal de conclusão
        Vibration.vibrate([0, 100, 100, 100]);
      }
    }
    
    if (this.soundEnabled) {
      // TODO: Adicionar arquivo de som
      // this.playSound(isPerfect ? 'perfect' : 'complete');
    }
  }

  /**
   * Som de desbloqueio de fase
   */
  playUnlock() {
    if (this.vibrationEnabled) {
      Vibration.vibrate([0, 50, 30, 70, 30, 100]);
    }
    
    if (this.soundEnabled) {
      // TODO: Adicionar arquivo de som
      // this.playSound('unlock');
    }
  }

  /**
   * Som de streak (ao manter sequência)
   */
  playStreak(streakCount: number) {
    if (this.vibrationEnabled) {
      // Vibração mais intensa conforme streak aumenta
      const intensity = Math.min(streakCount * 10, 100);
      Vibration.vibrate(intensity);
    }
    
    if (this.soundEnabled) {
      // TODO: Adicionar arquivo de som
      // this.playSound('streak');
    }
  }

  /**
   * Som de click/tap genérico
   */
  playTap() {
    if (this.vibrationEnabled) {
      Vibration.vibrate(5);
    }
  }

  /**
   * Reproduzir um som específico (quando adicionar arquivos)
   */
  private playSound(soundName: string) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.stop(() => {
        sound.play();
      });
    }
  }

  /**
   * Limpar recursos ao sair
   */
  release() {
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        sound.release();
      }
    });
  }
}

export default new SoundService();

