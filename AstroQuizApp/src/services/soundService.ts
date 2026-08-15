/**
 * Sound Service
 * Manages sound effects (react-native-sound) and haptic feedback
 */

import { Vibration } from 'react-native';
import { SettingsStorage, type AppSettings } from '@/utils/settingsStorage';

// Importação segura: se o módulo nativo não estiver disponível, o app
// continua funcionando apenas com vibração.
let Sound: any = null;
let isSoundAvailable = false;

try {
  // react-native-sound exporta via CommonJS (module.exports = Sound),
  // então o construtor vem direto do require.
  const mod = require('react-native-sound');
  Sound = typeof mod === 'function' ? mod : mod?.default;
  isSoundAvailable = typeof Sound === 'function';
  if (isSoundAvailable) {
    // Toca junto com outros áudios e respeita o botão físico de silencioso.
    Sound.setCategory('Ambient', true);
  }
} catch (error) {
  Sound = null;
  isSoundAvailable = false;
}

type SoundKey =
  | 'correct'
  | 'incorrect'
  | 'tap'
  | 'warning'
  | 'streak'
  | 'phase';

// Os arquivos são copiados para o bundle nativo por `react-native-asset`
// (ver assets/sounds e react-native.config.js).
const SOUND_FILES: Record<SoundKey, string> = {
  correct: 'correct.wav',
  incorrect: 'incorrect.wav',
  tap: 'tap.wav',
  warning: 'warning.wav',
  streak: 'streak.wav',
  phase: 'phase.wav',
};

const VOLUMES: Record<SoundKey, number> = {
  correct: 0.7,
  incorrect: 0.7,
  tap: 0.3,
  warning: 0.6,
  streak: 0.7,
  phase: 0.8,
};

class SoundService {
  private readonly defaultSettings: AppSettings = {
    soundEnabled: true,
    vibrationEnabled: true,
    musicEnabled: false,
    notificationsEnabled: true,
    language: 'pt',
  };
  private settings: AppSettings | null = this.defaultSettings;
  private players: Partial<Record<SoundKey, any>> = {};
  private preloaded = false;

  /**
   * Pré-carrega os efeitos sonoros. Chamar uma vez na inicialização do app
   * evita atraso na primeira reprodução.
   */
  preload() {
    if (!isSoundAvailable || this.preloaded) return;
    this.preloaded = true;

    (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => {
      try {
        const player = new Sound(SOUND_FILES[key], Sound.MAIN_BUNDLE, (error: any) => {
          if (error) {
            this.players[key] = undefined;
            return;
          }
          player.setVolume(VOLUMES[key]);
        });
        this.players[key] = player;
      } catch (error) {
        this.players[key] = undefined;
      }
    });
  }

  private play(key: SoundKey) {
    if (!isSoundAvailable) return;
    if (!this.settings?.soundEnabled) return;

    if (!this.preloaded) this.preload();

    const player = this.players[key];
    if (!player) return;

    // Rebobina antes de tocar para permitir repetições rápidas.
    player.stop(() => player.play());
  }

  private async ensureSettings(): Promise<AppSettings> {
    if (!this.settings) {
      this.settings = await SettingsStorage.getSettings();
    }
    return this.settings || this.defaultSettings;
  }

  private vibrate(pattern: number | number[] = 30) {
    if (!this.settings?.vibrationEnabled) return;
    Vibration.vibrate(pattern, false);
  }

  async getSettings() {
    return this.ensureSettings();
  }

  async setSoundEnabled(enabled: boolean) {
    await SettingsStorage.setSoundEnabled(enabled);
    this.settings = { ...(this.settings ?? (await SettingsStorage.getSettings())), soundEnabled: enabled };
  }

  async setVibrationEnabled(enabled: boolean) {
    await SettingsStorage.setVibrationEnabled(enabled);
    this.settings = { ...(this.settings ?? (await SettingsStorage.getSettings())), vibrationEnabled: enabled };
  }

  async setMusicEnabled(enabled: boolean) {
    await SettingsStorage.setMusicEnabled(enabled);
    this.settings = { ...(this.settings ?? (await SettingsStorage.getSettings())), musicEnabled: enabled };
  }

  // region public sound cues
  playTap() {
    this.play('tap');
    this.vibrate(15);
  }

  playSelect() {
    this.play('tap');
    this.vibrate(15);
  }

  playCorrect() {
    this.play('correct');
    this.vibrate([0, 25]);
  }

  playIncorrect() {
    this.play('incorrect');
    this.vibrate([0, 35]);
  }

  playWarning() {
    this.play('warning');
    this.vibrate([0, 45]);
  }

  playStreak(streakCount?: number) {
    this.play('streak');
    this.vibrate([0, 20]);
  }

  playPhaseComplete(isPerfect?: boolean) {
    this.play('phase');
    this.vibrate(isPerfect ? [0, 30, 40, 30] : [0, 30]);
  }

  playUnlock() {
    this.play('phase');
    this.vibrate([0, 30, 40, 30]);
  }

  async playBackgroundMusic(volume = 0.25) {
    // Música de fundo permanece desativada (apenas efeitos sonoros por enquanto).
  }

  async stopBackgroundMusic() {
    // Música de fundo permanece desativada (apenas efeitos sonoros por enquanto).
  }

  /** Libera os players (usar ao encerrar o app, se necessário). */
  release() {
    (Object.keys(this.players) as SoundKey[]).forEach((key) => {
      this.players[key]?.release?.();
      this.players[key] = undefined;
    });
    this.preloaded = false;
  }
  // endregion
}

const soundService = new SoundService();
export default soundService;
