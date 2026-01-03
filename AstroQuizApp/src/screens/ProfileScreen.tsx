/**
 * ProfileScreen
 * Tela de perfil do usuário
 */

import { Button, Card } from '@/components';
import { useApp } from '@/contexts/AppContext';
import soundService from '@/services/soundService';
import { SettingsStorage, AppSettings } from '@/utils/settingsStorage';
import { ProgressStorage } from '@/utils/progressStorage';
import { achievements } from '@/utils/progressionSystem';
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const ProfileScreen = () => {
  const { user, locale, setLocale, isAuthenticated, signInWithGoogle, signOut, isLoading } = useApp();
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    vibrationEnabled: true,
    musicEnabled: false,
    notificationsEnabled: true,
    language: 'pt',
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const progress = await ProgressStorage.getProgress();
    setUnlockedAchievements(progress.stats.achievements || []);
    setTotalXP(progress.stats.totalXP || 0);
  };

  const loadSettings = async () => {
    const saved = await SettingsStorage.getSettings();
    setSettings(saved);
  };

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const handleChangeLanguage = (newLocale: string) => {
    setLocale(newLocale);
    soundService.playTap();
    Alert.alert('Idioma alterado', `Idioma alterado para ${newLocale}`);
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    try {
      const res = await signInWithGoogle();
      if (!res.ok) {
        Alert.alert(
          'Login',
          `Não foi possível entrar com Google.\n\nMotivo: ${res.message}`
        );
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await signOut();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleToggleSound = async (value: boolean) => {
    setSettings({ ...settings, soundEnabled: value });
    await soundService.setSoundEnabled(value);
    if (value) soundService.playTap();
  };

  const handleToggleVibration = async (value: boolean) => {
    // Testar vibração antes de desligar
    if (value) {
      soundService.playTap();
    }
    setSettings({ ...settings, vibrationEnabled: value });
    await soundService.setVibrationEnabled(value);
  };

  const handleToggleMusic = async (value: boolean) => {
    setSettings({ ...settings, musicEnabled: value });
    await soundService.setMusicEnabled(value);
    if (settings.vibrationEnabled) soundService.playTap();
  };

  const handleToggleNotifications = async (value: boolean) => {
    setSettings({ ...settings, notificationsEnabled: value });
    await SettingsStorage.saveSettings({ notificationsEnabled: value });
    if (settings.vibrationEnabled) soundService.playTap();
  };

  return (
    <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🚀</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>7</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Astronauta'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'guest@astroquiz.com'}</Text>
          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>2.450</Text>
              <Text style={styles.userStatLabel}>XP</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>12</Text>
              <Text style={styles.userStatLabel}>Sequência</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>#20</Text>
              <Text style={styles.userStatLabel}>Ranking</Text>
            </View>
          </View>
        </View>

        {/* Conta / Login */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Text style={styles.accountHint}>
            {isAuthenticated
              ? 'Conectado via Google (Facebook depois).'
              : 'Você está como convidado. Entre com Google para salvar na nuvem (em breve).'}
          </Text>

          <View style={styles.accountButtons}>
            {isAuthenticated ? (
              <Button
                title="Sair"
                variant="ghost"
                onPress={handleLogout}
                loading={authBusy || isLoading}
              />
            ) : (
              <Button
                title="Entrar com Google"
                onPress={handleGoogleLogin}
                loading={authBusy || isLoading}
              />
            )}
          </View>
        </Card>

        {/* Conquistas */}
        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🏆 Conquistas</Text>
            <Text style={styles.achievementCount}>
              {unlockedAchievements.length}/{achievements.length}
            </Text>
          </View>
          
          <View style={styles.achievementsList}>
            {achievements.map(achievement => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementItem,
                    !isUnlocked && styles.achievementLocked,
                  ]}
                >
                  <View style={styles.achievementIcon}>
                    <Text style={styles.achievementIconText}>
                      {isUnlocked ? achievement.icon : '🔒'}
                    </Text>
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text
                      style={[
                        styles.achievementName,
                        !isUnlocked && styles.achievementTextLocked,
                      ]}
                    >
                      {isUnlocked ? achievement.name : '???'}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDescription,
                        !isUnlocked && styles.achievementTextLocked,
                      ]}
                    >
                      {isUnlocked ? achievement.description : 'Conquista bloqueada'}
                    </Text>
                  </View>
                  {isUnlocked && (
                    <View style={styles.achievementXP}>
                      <Text style={styles.achievementXPText}>+{achievement.xpReward}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Idioma */}
        <Card>
          <Text style={styles.sectionTitle}>Idioma do Quiz</Text>
          <View style={styles.languageList}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleChangeLanguage(lang.code)}
                style={[
                  styles.languageItem,
                  locale === lang.code && styles.languageItemActive,
                ]}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
                {locale === lang.code && (
                  <Text style={styles.languageCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Configurações */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🎵</Text>
              <Text style={styles.settingText}>Sons do Jogo</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingStatus, settings.soundEnabled && styles.settingStatusActive]}>
                {settings.soundEnabled ? 'Ligado' : 'Desligado'}
              </Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={handleToggleSound}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.soundEnabled ? '#FFFFFF' : '#f4f3f4'}
                ios_backgroundColor="#767577"
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>📳</Text>
              <Text style={styles.settingText}>Vibração</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingStatus, settings.vibrationEnabled && styles.settingStatusActive]}>
                {settings.vibrationEnabled ? 'Ligado' : 'Desligado'}
              </Text>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={handleToggleVibration}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.vibrationEnabled ? '#FFFFFF' : '#f4f3f4'}
                ios_backgroundColor="#767577"
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🎼</Text>
              <Text style={styles.settingText}>Música de Fundo</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingStatus, settings.musicEnabled && styles.settingStatusActive]}>
                {settings.musicEnabled ? 'Ligado' : 'Desligado'}
              </Text>
              <Switch
                value={settings.musicEnabled}
                onValueChange={handleToggleMusic}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.musicEnabled ? '#FFFFFF' : '#f4f3f4'}
                ios_backgroundColor="#767577"
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🔔</Text>
              <Text style={styles.settingText}>Notificações</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingStatus, settings.notificationsEnabled && styles.settingStatusActive]}>
                {settings.notificationsEnabled ? 'Ligado' : 'Desligado'}
              </Text>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={settings.notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
                ios_backgroundColor="#767577"
              />
            </View>
          </View>
        </Card>

        {/* Sobre */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>ℹ️ Versão</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>📖 Termos de Uso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>🔒 Privacidade</Text>
          </TouchableOpacity>
        </Card>

        <Button
          title="Sair"
          variant="danger"
          onPress={() => Alert.alert('Sair', 'Deseja realmente sair?')}
          style={styles.logoutButton}
        />

        <View style={styles.bottomSpace} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120, // Extra espaço para bottom tab bar
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  accountHint: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginTop: 8,
    lineHeight: 20,
  },
  accountButtons: {
    marginTop: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1A1A2E',
  },
  levelBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 20,
  },
  userStats: {
    flexDirection: 'row',
    gap: 32,
  },
  userStat: {
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  userStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  card: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementCount: {
    fontSize: 16,
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  achievementLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIconText: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  achievementTextLocked: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  achievementXP: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  achievementXPText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  languageList: {
    gap: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    borderColor: '#FFA726',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    flex: 1,
  },
  languageCheck: {
    fontSize: 20,
    color: '#FFA726',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 60,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingEmoji: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    lineHeight: 24,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Medium',
    minWidth: 75,
    textAlign: 'right',
    lineHeight: 20,
  },
  settingStatusActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  logoutButton: {
    marginTop: 32,
  },
  bottomSpace: {
    height: 100,
  },
});


