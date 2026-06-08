/**
 * ImageCreditsScreen
 * Lista de créditos e licenças das imagens usadas no app.
 */

import { Card } from '@/components';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/design-system';
import { IMAGE_CREDITS, LICENSE_LABEL, LicenseCode } from '@/data/imageCredits';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

type Loc = 'pt' | 'en' | 'es' | 'fr';

export const ImageCreditsScreen = () => {
  const navigation = useNavigation();
  const { locale } = useApp();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const lang: Loc = (['pt', 'en', 'es', 'fr'].includes(locale as string) ? locale : 'en') as Loc;

  const licenseLabel = (code: LicenseCode): string =>
    code === 'pd' ? t('imageCredits.publicDomain') : LICENSE_LABEL[code];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back') || 'Back'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('imageCredits.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{t('imageCredits.intro')}</Text>

        <Card style={styles.card}>
          {IMAGE_CREDITS.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.row, idx < IMAGE_CREDITS.length - 1 && styles.rowDivider]}
            >
              <Text style={styles.subject}>{item.subject[lang]}</Text>
              <Text style={styles.meta}>
                {item.author} · {licenseLabel(item.license)}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={styles.footer}>{t('imageCredits.footer')}</Text>
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 18, fontFamily: 'Poppins-SemiBold', flex: 1, textAlign: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  intro: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Poppins-Regular', lineHeight: 20, marginBottom: 16 },
  card: { padding: 4 },
  row: { paddingVertical: 12, paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  subject: { color: COLORS.text, fontSize: 15, fontFamily: 'Poppins-Medium', marginBottom: 2 },
  meta: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Poppins-Regular', lineHeight: 18 },
  footer: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Poppins-Regular', lineHeight: 18, marginTop: 16 },
  bottomSpace: { height: 40 },
});
