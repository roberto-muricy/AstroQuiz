/**
 * ProfileScreen
 * Tela de perfil do usuário
 */

import { Button, Card } from '@/components';
import { useApp } from '@/contexts/AppContext';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const ProfileScreen = () => {
  const { user, locale, setLocale } = useApp();

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const handleChangeLanguage = (newLocale: string) => {
    setLocale(newLocale);
    Alert.alert('Idioma alterado', `Idioma alterado para ${newLocale}`);
  };

  return (
    <LinearGradient colors={['#1A1A2E', '#3D3D6B', '#4A4A7C']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🚀</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>7</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Astronauta'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'astronauta@astroquiz.com'}</Text>
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
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>🔔 Notificações</Text>
            <Text style={styles.settingValue}>Ativadas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>🎵 Som</Text>
            <Text style={styles.settingValue}>Ativado</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>🌙 Modo Escuro</Text>
            <Text style={styles.settingValue}>Sempre</Text>
          </TouchableOpacity>
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
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
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


