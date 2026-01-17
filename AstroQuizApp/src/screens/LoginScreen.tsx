import { Button } from "@/components/Button";
import { useApp } from "@/contexts/AppContext";
import { RootStackParamList } from "@/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

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
      // Login bem-sucedido: volta para ProfileScreen
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
      // Login bem-sucedido: volta para ProfileScreen
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
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>{t("login.password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.5)"
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

          <Button
            title={t("login.loginWithGoogle")}
            onPress={handleGoogleLogin}
            size="large"
            loading={isLoading || localLoading}
            style={[styles.button, styles.buttonFull]}
          />
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
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Poppins-Regular",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 167, 38, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 42,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 12,
  },
  error: {
    color: "#FF6B6B",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
  },
  buttonFull: {
    width: "100%",
    alignSelf: "stretch",
    height: 56, // Forçar altura fixa para todos os botões (large)
  },
  buttonGhostFix: {
    // Compensar borderWidth: 2 do variant ghost (2px topo + 2px baixo = 4px)
    paddingVertical: 12, // 16 - 4 = 12
  },
  helperText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    marginTop: 28,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginTop: 28,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontFamily: "Poppins-Regular",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginHorizontal: 12,
  },
});
