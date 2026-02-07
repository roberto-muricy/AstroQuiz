/**
 * LoginScreen - Refatorada
 * Tela de login/cadastro
 *
 * Refatoração: Usa design-system para consistência
 */

import { Button } from "@/components/Button";
import { useApp } from "@/contexts/AppContext";
import { RootStackParamList } from "@/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SIZES,
} from "@/constants/design-system";

type LoginNav = NativeStackNavigationProp<RootStackParamList, "Login">;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNav>();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isAuthenticated, setUser, isLoading } = useApp();
  const { t } = useTranslation();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleGoogleLogin = async () => {
    setError(null);
    setLocalLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        setError(result.message || t("login.errors.googleLoginFailed"));
        return;
      }
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || t("login.errors.googleLoginUnexpected"));
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    setError(null);
    setLocalLoading(true);
    try {
      if (!email || !password) {
        setError(t("login.errors.fillEmailPassword"));
        return;
      }
      const action = mode === "login" ? signInWithEmail : signUpWithEmail;
      const result = await action(email, password);
      if (!result.ok) {
        setError(result.message || t("login.errors.authFailed"));
        return;
      }
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || t("login.errors.authUnexpected"));
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🚀</Text>
          </View>
          <Text style={styles.title}>{t("login.saveProgressTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("login.saveProgressSubtitle")}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === "login" ? t("login.login") : t("login.signup")}</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <Text style={styles.label}>{t("login.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("login.emailPlaceholder")}
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>{t("login.password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor={COLORS.textTertiary}
            secureTextEntry
            style={styles.input}
          />
          <Button
            title={mode === "login" ? t("login.loginWithEmail") : t("login.createAccount")}
            onPress={handleEmailSubmit}
            size="large"
            loading={isLoading || localLoading}
            style={[styles.button, styles.buttonFull]}
          />
          <Button
            title={mode === "login" ? t("login.createAccountCta") : t("login.alreadyHaveAccount")}
            variant="ghost"
            onPress={() => setMode(mode === "login" ? "signup" : "login")}
            size="large"
            disabled={isLoading || localLoading}
            style={[styles.button, styles.buttonFull, styles.buttonGhostFix]}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("login.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isLoading || localLoading}
            style={styles.googleButton}
            activeOpacity={0.8}
          >
            {(isLoading || localLoading) ? (
              <ActivityIndicator color="#1F1F1F" />
            ) : (
              <>
                <View style={styles.googleLogoContainer}>
                  <Text style={styles.googleLogoG}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>{t("login.loginWithGoogle")}</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.helperText}>
            {t("login.syncHelper")}
          </Text>
        </View>

        <Text style={styles.footerText}>{t("login.readyToLaunch")}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1021",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: SIZES.screenPadding,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    fontFamily: "Poppins-Regular",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 80,
    paddingBottom: SPACING.xl,
  },
  hero: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 167, 38, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  logoEmoji: {
    fontSize: 42,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.backgroundMuted,
    borderRadius: RADIUS.lg,
    padding: SIZES.screenPadding,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  error: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  button: {
    marginTop: SPACING.md,
  },
  buttonFull: {
    width: "100%",
    alignSelf: "stretch",
    height: SIZES.buttonHeight,
  },
  buttonGhostFix: {
    paddingVertical: SPACING.md,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: "center",
    lineHeight: 18,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: SPACING.xl,
    fontFamily: "Poppins-Medium",
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontFamily: "Poppins-Medium",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm - 2,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontFamily: "Poppins-Regular",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SIZES.screenPadding,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.backgroundHighlight,
  },
  dividerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.lg,
    height: SIZES.buttonHeight,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: "#DADCE0",
  },
  googleLogoContainer: {
    width: 24,
    height: 24,
    marginRight: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  googleLogoG: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4285F4",
    fontFamily: "Poppins-Bold",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F1F1F",
    fontFamily: "Poppins-Medium",
  },
});
