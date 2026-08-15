/**
 * Sound Service
 * Efeitos sonoros do quiz + feedback tátil (vibração).
 *
 * NOTA IMPORTANTE: falamos DIRETO com o módulo nativo `RNSound`, sem usar o
 * wrapper JS do pacote react-native-sound. O wrapper (sound.js) faz
 * `require('react-native/Libraries/Image/resolveAssetSource')` esperando uma
 * função, mas no React Native 0.81 esse módulo usa `export default` e o require
 * devolve um objeto — o construtor quebra com "Object is not a function" e o
 * áudio falha silenciosamente. O módulo nativo em si funciona normalmente.
 */

import { NativeModules, Vibration } from 'react-native';
import { SettingsStorage, type AppSettings } from '@/utils/settingsStorage';

const RNSound: any = NativeModules?.RNSound ?? null;
const isSoundAvailable = !!RNSound && typeof RNSound.prepare === 'function';

type SoundKey = 'correct' | 'incorrect' | 'tap' | 'warning' | 'streak' | 'phase';

// Arquivos copiados para o bundle nativo por `react-native-asset`
// (ver assets/sounds + react-native.config.js).
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

// Cada som carregado no nativo é identificado por uma chave numérica.
const KEYS: Record<SoundKey, number> = {
  correct: 1,
  incorrect: 2,
  tap: 3,
  warning: 4,
  streak: 5,
  phase: 6,
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
  private loaded: Partial<Record<SoundKey, boolean>> = {};
  private preloaded = false;

  constructor() {
    if (isSoundAvailable) {
      try {
        // 'Playback' toca mesmo com o botão lateral de silencioso ligado;
        // mixWithOthers=true não interrompe música que o usuário esteja ouvindo.
        RNSound.setCategory('Playback', true);
      } catch (error) {
        // segue sem categoria explícita
      }
    }
  }

  /** Carrega os efeitos no nativo (chamar uma vez, no início do app). */
  preload() {
    if (!isSoundAvailable || this.preloaded) return;
    this.preloaded = true;
    (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => this.load(key));
  }

  private load(key: SoundKey, playWhenReady = false) {
    if (!isSoundAvailable) return;

    const path = `${RNSound.MainBundlePath}/${SOUND_FILES[key]}`;
    try {
      RNSound.prepare(path, KEYS[key], {}, (error: any) => {
        if (error) {
          this.loaded[key] = false;
          return;
        }
        this.loaded[key] = true;
        try {
          RNSound.setVolume(KEYS[key], VOLUMES[key]);
        } catch (e) {
          // volume é opcional
        }
        if (playWhenReady) this.start(key);
      });
    } catch (error) {
      this.loaded[key] = false;
    }
  }

  private start(key: SoundKey) {
    try {
      // Rebobina para permitir repetições rápidas (acertos seguidos).
      RNSound.setCurrentTime(KEYS[key], 0);
      RNSound.play(KEYS[key], () => {});
    } catch (error) {
      // áudio nunca deve quebrar o fluxo do quiz
    }
  }

  private play(key: SoundKey) {
    if (!isSoundAvailable) return;
    if (!this.settings?.soundEnabled) return;

    if (!this.preloaded) this.preload();

    if (this.loaded[key]) {
      this.start(key);
    } else {
      // Ainda não carregou (ou falhou): carrega agora e toca quando estiver pronto.
      this.load(key, true);
    }
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

  // region efeitos públicos
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
    // Música de fundo permanece desativada (apenas efeitos sonoros).
  }

  async stopBackgroundMusic() {
    // Música de fundo permanece desativada (apenas efeitos sonoros).
  }

  /** Diagnóstico do subsistema de áudio (usado em verificação manual). */
  getDiagnostics(): string {
    if (!isSoundAvailable) return 'SND: modulo nativo indisponivel';
    const keys = Object.keys(SOUND_FILES) as SoundKey[];
    const ok = keys.filter((k) => this.loaded[k]).length;
    return `carregados=${ok}/${keys.length} som=${this.settings?.soundEnabled}`;
  }

  /** Libera os players nativos. */
  release() {
    if (!isSoundAvailable) return;
    (Object.keys(KEYS) as SoundKey[]).forEach((key) => {
      try {
        RNSound.release(KEYS[key]);
      } catch (error) {
        // ignora
      }
      this.loaded[key] = false;
    });
    this.preloaded = false;
  }
  // endregion
}

const soundService = new SoundService();
export default soundService;
