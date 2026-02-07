/**
 * ProfileScreen
 * Tela de perfil do usuário
 */

import { Button, Card } from '@/components';
import { useApp } from '@/contexts/AppContext';
import soundService from '@/services/soundService';
import { SettingsStorage, AppSettings } from '@/utils/settingsStorage';
import { ProgressStorage } from '@/utils/progressStorage';
import { achievements, getPlayerLevel } from '@/utils/progressionSystem';
import React, { useState, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Image, Linking } from 'react-native';
// LinearGradient removido - usando background sólido
import { RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/constants/design-system';
import {
  SoundOnIcon,
  VibrateIcon,
  MusicIcon,
  BellOnIcon,
  TrophyIcon,
  LockIcon,
  InfoIcon,
  RocketIcon,
  IconSizes,
  IconColors,
} from '@/components/Icons';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNav>();
  const { user, locale, setLocale, isAuthenticated, signInWithGoogle, signOut, isLoading } = useApp();
  const { t } = useTranslation();
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
  const [currentLevel, setCurrentLevel] = useState(1);
  const [phasesCompleted, setPhasesCompleted] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

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
    setPhasesCompleted(progress.stats.phasesCompleted || 0);
    setMaxStreak(progress.stats.maxStreak || 0);
    
    const level = getPlayerLevel(progress.stats.totalXP || 0);
    setCurrentLevel(level.level);
  };

  const loadSettings = async () => {
    const saved = await SettingsStorage.getSettings();
    setSettings(saved);
  };

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const handleChangeLanguage = (newLocale: string) => {
    setLocale(newLocale);
    soundService.playTap();
    // Delay para pegar a tradução nova após mudar o locale
    setTimeout(() => {
      const langName = languages.find(l => l.code === newLocale)?.name || newLocale;
      Alert.alert(t('profile.languageChanged'), t('profile.languageChangedTo', { lang: langName }));
    }, 100);
  };

  const handleOpenLogin = () => {
    soundService.playTap();
    navigation.navigate('Login');
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
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <RocketIcon size={48} color={IconColors.primary} />
            )}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{currentLevel}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Astronauta'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'guest@astroquiz.com'}</Text>
          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>{totalXP.toLocaleString()}</Text>
              <Text style={styles.userStatLabel}>XP</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>{maxStreak}</Text>
              <Text style={styles.userStatLabel}>{t('result.maxStreak')}</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>{phasesCompleted}/50</Text>
              <Text style={styles.userStatLabel}>{t('quiz.phase')}s</Text>
            </View>
          </View>
        </View>

        {/* Conta / Login */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.accountTitle')}</Text>
          <Text style={styles.accountHint}>
            {isAuthenticated
              ? t('profile.connectedAs', { email: user?.email })
              : t('profile.progressSavedLocally')}
          </Text>

          <View style={styles.accountButtons}>
            {isAuthenticated ? (
              <Button
                title={t('profile.logout')}
                variant="danger"
                onPress={handleLogout}
                loading={authBusy || isLoading}
              />
            ) : (
              <Button
                title={t('profile.loginOrCreate')}
                onPress={handleOpenLogin}
                loading={authBusy || isLoading}
              />
            )}
          </View>
        </Card>

        {/* Conquistas */}
        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <TrophyIcon size={IconSizes.md} color={IconColors.gold} />
              <Text style={styles.sectionTitle}>{t('achievements.title')}</Text>
            </View>
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
                    {isUnlocked ? (
                      <Text style={styles.achievementIconText}>{achievement.icon}</Text>
                    ) : (
                      <LockIcon size={IconSizes.lg} color={IconColors.muted} />
                    )}
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
                      {isUnlocked ? achievement.description : t('achievements.locked')}
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
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
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
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <SoundOnIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.sound')}</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={handleToggleSound}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.soundEnabled ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#767577"
              style={styles.switch}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <VibrateIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.vibration')}</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={handleToggleVibration}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.vibrationEnabled ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#767577"
              style={styles.switch}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <MusicIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.music')}</Text>
            </View>
            <Switch
              value={settings.musicEnabled}
              onValueChange={handleToggleMusic}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.musicEnabled ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#767577"
              style={styles.switch}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <BellOnIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.notifications')}</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#767577"
              style={styles.switch}
            />
          </View>
        </Card>

        {/* Sobre */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <InfoIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.version')}</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://robertomuricy.github.io/astroquiz/terms-of-service')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <InfoIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.terms')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://robertomuricy.github.io/astroquiz/privacy-policy')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <LockIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.privacy')}</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Button
          title={t('profile.logout')}
          variant="danger"
          onPress={() => Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMessage'))}
          style={styles.logoutButton}
        />

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
    paddingHorizontal: 6,
  },
  levelBadgeText: {
    fontSize: 14,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  settingIconContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    lineHeight: 24,
  },
  settingValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  switch: {
    marginRight: -8,
  },
  logoutButton: {
    marginTop: 32,
  },
  bottomSpace: {
    height: 100,
  },
});


