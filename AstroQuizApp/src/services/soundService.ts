/**
 * Sound Service
 * Manages audio playback and haptic feedback
 */

import Sound from 'react-native-sound';
import { Vibration } from 'react-native';
import { SettingsStorage, type AppSettings } from '@/utils/settingsStorage';

type SoundKey = 'tap' | 'correct' | 'incorrect' | 'warning' | 'streak' | 'phase';

const SOUND_FILES: Record<SoundKey, string> = {
  tap: 'tap.wav',
  correct: 'correct.wav',
  incorrect: 'incorrect.wav',
  warning: 'warning.wav',
  streak: 'streak.wav',
  phase: 'phase.wav',
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
  private sounds: Partial<Record<SoundKey, Sound>> = {};
  private backgroundMusic: Sound | null = null;
  private isInitialized = false;

  constructor() {
    // Enable playback in silence mode (iOS)
    try {
      Sound.setCategory('Playback');
    } catch (error) {
      console.warn('[sound] Failed to set category:', error);
    }
    this.initializeSounds();
  }

  private async initializeSounds() {
    if (this.isInitialized) return;
    
    // Load all sound effects
    for (const [key, filename] of Object.entries(SOUND_FILES)) {
      try {
        const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.warn(`[sound] Failed to load ${filename}:`, error);
            return;
          }
          this.sounds[key as SoundKey] = sound;
        });
      } catch (error) {
        console.warn(`[sound] Error loading ${filename}:`, error);
      }
    }

    // Load background music
    try {
      this.backgroundMusic = new Sound('background.wav', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.warn('[sound] Failed to load background music:', error);
          return;
        }
        this.backgroundMusic?.setNumberOfLoops(-1); // Infinite loop
        this.backgroundMusic?.setVolume(0.25);
      });
    } catch (error) {
      console.warn('[sound] Error loading background music:', error);
    }

    this.isInitialized = true;
  }

  private async ensureSettings(): Promise<AppSettings> {
    if (!this.settings) {
      this.settings = await SettingsStorage.getSettings();
    }
    return this.settings || this.defaultSettings;
  }

  private async play(key: SoundKey) {
    const settings = await this.ensureSettings();
    if (!settings.soundEnabled) return;

    const sound = this.sounds[key];
    if (!sound) {
      console.warn(`[sound] Sound not loaded: ${key}`);
      return;
    }

    try {
      sound.stop(() => {
        sound.play((success) => {
          if (!success) {
            console.warn(`[sound] Playback failed for ${key}`);
          }
        });
      });
    } catch (error) {
      console.warn(`[sound] Error playing ${key}:`, error);
    }
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
    
    if (!enabled) {
      await this.stopBackgroundMusic();
    } else {
      await this.playBackgroundMusic();
    }
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
    const settings = await this.ensureSettings();
    if (!settings.musicEnabled) return;

    if (!this.backgroundMusic) {
      console.warn('[sound] Background music not loaded');
      return;
    }

    try {
      this.backgroundMusic.setVolume(volume);
      this.backgroundMusic.play((success) => {
        if (!success) {
          console.warn('[sound] Background music playback failed');
        }
      });
    } catch (error) {
      console.warn('[sound] Error playing background music:', error);
    }
  }

  async stopBackgroundMusic() {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.stop();
    } catch (error) {
      console.warn('[sound] Error stopping background music:', error);
    }
  }

  // Cleanup method for when app unmounts
  release() {
    for (const sound of Object.values(this.sounds)) {
      if (sound) {
        sound.release();
      }
    }
    if (this.backgroundMusic) {
      this.backgroundMusic.release();
    }
  }
  // endregion
}

const soundService = new SoundService();
export default soundService;
