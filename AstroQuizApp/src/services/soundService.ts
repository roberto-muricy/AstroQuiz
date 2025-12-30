/**
 * Sound Service (Vibration-only fallback)
 * Temporarily using only vibrations until we configure audio properly
 */

import { Vibration } from 'react-native';
import { SettingsStorage, type AppSettings } from '@/utils/settingsStorage';

class SoundService {
  private readonly defaultSettings: AppSettings = {
    soundEnabled: true,
    vibrationEnabled: true,
    musicEnabled: false,
    notificationsEnabled: true,
    language: 'pt',
  };
  private settings: AppSettings | null = this.defaultSettings;

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

  // region public sound cues (vibration-only for now)
  playTap() {
    this.vibrate(15);
  }

  playSelect() {
    this.vibrate(15);
  }

  playCorrect() {
    this.vibrate([0, 25]);
  }

  playIncorrect() {
    this.vibrate([0, 35]);
  }

  playWarning() {
    this.vibrate([0, 45]);
  }

  playStreak(streakCount?: number) {
    this.vibrate([0, 20]);
  }

  playPhaseComplete(isPerfect?: boolean) {
    this.vibrate(isPerfect ? [0, 30, 40, 30] : [0, 30]);
  }

  playUnlock() {
    this.vibrate([0, 30, 40, 30]);
  }

  async playBackgroundMusic(volume = 0.25) {
    // Temporarily disabled
  }

  async stopBackgroundMusic() {
    // Temporarily disabled
  }
  // endregion
}

const soundService = new SoundService();
export default soundService;
