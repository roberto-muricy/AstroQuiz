/**
 * Settings Storage
 * Gerencia as configurações do usuário
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@app_settings';

export interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  language: 'pt' | 'en' | 'es' | 'fr';
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  musicEnabled: false,
  notificationsEnabled: true,
  language: 'pt',
};

export const SettingsStorage = {
  /**
   * Carregar configurações
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Salvar configurações
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      console.log('✅ Configurações salvas:', updated);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  },

  /**
   * Resetar para padrão
   */
  async resetSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      console.log('🔄 Configurações resetadas');
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
    }
  },

  /**
   * Métodos auxiliares para configurações específicas
   */
  async setSoundEnabled(enabled: boolean): Promise<void> {
    await this.saveSettings({ soundEnabled: enabled });
  },

  async setVibrationEnabled(enabled: boolean): Promise<void> {
    await this.saveSettings({ vibrationEnabled: enabled });
  },

  async setMusicEnabled(enabled: boolean): Promise<void> {
    await this.saveSettings({ musicEnabled: enabled });
  },

  async setLanguage(language: 'pt' | 'en' | 'es' | 'fr'): Promise<void> {
    await this.saveSettings({ language });
  },
};

