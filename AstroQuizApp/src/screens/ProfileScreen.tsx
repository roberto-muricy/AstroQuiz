/**
 * ProfileScreen
 * Tela de perfil do usuário
 */

import { Button, Card, Toast } from '@/components';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import soundService from '@/services/soundService';
import { SettingsStorage, AppSettings } from '@/utils/settingsStorage';
import { ProgressStorage } from '@/utils/progressStorage';
import { getPlayerLevel } from '@/utils/progressionSystem';
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Animated, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Image, Linking } from 'react-native';
// LinearGradient removido - usando background sólido
import { RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/constants/design-system';
import { Crown, Sparkles, ChevronRight } from 'lucide-react-native';
import {
  SoundOnIcon,
  VibrateIcon,
  MusicIcon,
  BellOnIcon,
  LockIcon,
  InfoIcon,
  RocketIcon,
  IconSizes,
  IconColors,
} from '@/components/Icons';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNav>();
  const { user, locale, setLocale, isAuthenticated, signInWithGoogle, signOut, deleteAccount, isLoading } = useApp();
  const { isPro } = useSubscription();
  const { t } = useTranslation();
  const proGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPro) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(proGlowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(proGlowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [isPro, proGlowAnim]);
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    vibrationEnabled: true,
    musicEnabled: false,
    notificationsEnabled: true,
    language: 'pt',
  });
  const [totalXP, setTotalXP] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [phasesCompleted, setPhasesCompleted] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
      setToastMessage(t('profile.languageChangedTo', { lang: langName }));
      setToastVisible(true);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountConfirmTitle'),
      t('profile.deleteAccountConfirmMessage'),
      [
        { text: t('common.cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            setAuthBusy(true);
            try {
              await deleteAccount();
            } catch (err: any) {
              const isReauthError = err?.code === 'auth/requires-recent-login';
              Alert.alert(
                'Erro',
                isReauthError
                  ? t('profile.deleteAccountReauthError')
                  : t('profile.deleteAccountError'),
              );
            } finally {
              setAuthBusy(false);
            }
          },
        },
      ],
    );
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
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onHide={() => setToastVisible(false)}
      />
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
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage as any} />
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

        {/* Pro Banner */}
        {!isPro && (
          <TouchableOpacity
            style={styles.proBanner}
            onPress={() => {
              soundService.playTap();
              navigation.navigate('Upgrade');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.proBannerLeft}>
              <View style={styles.proCrownContainer}>
                <Crown size={24} color="#FFD700" fill="#FFD700" />
                <Sparkles size={14} color="#FFA726" style={{ position: 'absolute', top: -4, right: -6 }} />
              </View>
              <View style={styles.proBannerText}>
                <Text style={styles.proBannerTitle}>{t('subscription.title')}</Text>
                <Text style={styles.proBannerSubtitle}>{t('subscription.benefits.noAds')} • {t('subscription.benefits.unlimitedSkips')}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#FFA726" />
          </TouchableOpacity>
        )}

        {/* Pro Status (se já é Pro) */}
        {isPro && (
          <TouchableOpacity
            style={styles.proStatusBanner}
            onPress={() => {
              soundService.playTap();
              navigation.navigate('Upgrade');
            }}
            activeOpacity={0.85}
          >
            <Crown size={20} color="#FFD700" fill="#FFD700" />
            <Text style={styles.proStatusText}>{t('subscription.title')} — {t('subscription.status.active')}</Text>
            <Text style={styles.proManageText}>{t('subscription.status.manageSubscription')}</Text>
          </TouchableOpacity>
        )}

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
              <>
                <Button
                  title={t('profile.logout')}
                  variant="danger"
                  onPress={handleLogout}
                  loading={authBusy || isLoading}
                />
                <Button
                  title={t('profile.deleteAccount')}
                  variant="ghost"
                  onPress={handleDeleteAccount}
                  loading={authBusy || isLoading}
                  style={styles.deleteAccountButton}
                />
              </>
            ) : (
              <Button
                title={t('profile.loginOrCreate')}
                onPress={handleOpenLogin}
                loading={authBusy || isLoading}
              />
            )}
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
            <View style={styles.switchContainer}>
              <Switch
                value={settings.soundEnabled}
                onValueChange={handleToggleSound}
                trackColor={{ false: '#3A3A3C', true: '#4CAF50' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3A3A3C"
                style={styles.switch}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <VibrateIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.vibration')}</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={handleToggleVibration}
                trackColor={{ false: '#3A3A3C', true: '#4CAF50' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3A3A3C"
                style={styles.switch}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <MusicIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.music')}</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.musicEnabled}
                onValueChange={handleToggleMusic}
                trackColor={{ false: '#3A3A3C', true: '#4CAF50' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3A3A3C"
                style={styles.switch}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <BellOnIcon size={IconSizes.md} color={IconColors.white} />
              </View>
              <Text style={styles.settingText}>{t('profile.notifications')}</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#3A3A3C', true: '#4CAF50' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3A3A3C"
                style={styles.switch}
              />
            </View>
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
    gap: 8,
  },
  deleteAccountButton: {
    marginTop: 4,
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
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 167, 38, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 167, 38, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  proBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proCrownContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  proBannerText: {
    flex: 1,
  },
  proBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
  },
  proBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  proStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  proStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
  },
  proManageText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
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
  switchContainer: {
    width: 51,
    height: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  logoutButton: {
    marginTop: 32,
  },
  bottomSpace: {
    height: 100,
  },
});


