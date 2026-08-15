/**
 * AstroQuiz App
 * Arquivo principal da aplicação
 */

import { AppProvider } from "@/contexts/AppContext";
import { AdsProvider } from "@/contexts/AdsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { NavigationContainer } from "@react-navigation/native";
import React, { useEffect } from "react";
import { StatusBar, AppState } from "react-native";
import firebase from '@react-native-firebase/app';

// Sentry - Crash Reporting
import { initSentry, SentryWrap } from "@/config/sentry";

// AdMob + ATT (App Tracking Transparency) - iOS 14.5+
import { requestTrackingPermission, loadInterstitialAd, loadAllRewardedAds } from "@/services/adService";

// Importar configuração de i18n (deve ser antes do App)
import '@/i18n';

// Inicializa Sentry antes de qualquer coisa
initSentry();

const App = () => {
  useEffect(() => {
    initializeFirebase();
    checkBackendConnection();

    // IMPORTANTE (Apple Guideline 2.1 - ATT): o iOS só exibe o pop-up de
    // App Tracking Transparency quando o app está em primeiro plano e ATIVO.
    // Se pedirmos durante o launch (app ainda inativo), o iOS engole o pedido
    // silenciosamente e o alerta nunca aparece (foi o motivo da rejeição).
    // Por isso, só disparamos o ATT depois que o app fica "active".
    let didRequestTracking = false;
    const runTracking = () => {
      if (didRequestTracking) return;
      didRequestTracking = true;
      // pequeno atraso para garantir que a cena está ativa e a UI estabilizou
      setTimeout(() => {
        initializeAdsWithTracking();
      }, 800);
    };

    if (AppState.currentState === "active") {
      runTracking();
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runTracking();
    });
    return () => sub.remove();
  }, []);

  /**
   * Solicitar permissão ATT (iOS 14.5+) e inicializar AdMob SDK.
   *
   * IMPORTANTE: o prompt do ATT precisa ser disparado ANTES do AdMob carregar
   * qualquer anúncio personalizado. Esta função é exigida pelo Apple Review
   * (Guideline 2.1 - Information Needed) para apps que usam o framework
   * AppTrackingTransparency.
   */
  const initializeAdsWithTracking = async () => {
    try {
      // 1. Pede permissão de tracking (ATT) - só faz algo no iOS 14.5+
      await requestTrackingPermission();

      // 2. Pré-carrega ads para uso futuro
      loadInterstitialAd();
      loadAllRewardedAds();
    } catch (error) {
      // Falhas aqui não devem quebrar o app
      if (__DEV__) {
        console.log('[App] Ads init error (non-fatal):', error);
      }
    }
  };

  /**
   * Inicializar Firebase
   */
  const initializeFirebase = async () => {
    try {
      if (!firebase.apps.length) {
        console.log('⚠️ Firebase não auto-inicializou, tentando inicializar...');
        // Se chegou aqui, há um problema - Firebase deveria auto-inicializar
      } else {
        console.log('✅ Firebase inicializado:', firebase.app().name);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar Firebase:', error);
    }
  };

  /**
   * Verificar conexão com backend
   */
  const checkBackendConnection = async () => {
    try {
      // Comentado temporariamente para não bloquear a UI
      // await api.healthCheck();
      console.log("⚠️ Health check desativado temporariamente");
    } catch (error) {
      console.error("❌ Erro ao conectar com backend:", error);
      // Não mostrar alert para não atrapalhar desenvolvimento
      console.warn(
        "Backend não está respondendo, mas o app continuará funcionando"
      );
    }
  };

  return (
    <AppProvider>
      <AdsProvider>
        <SubscriptionProvider>
          <NavigationContainer>
            <StatusBar
              barStyle="light-content"
              backgroundColor="transparent"
              translucent
            />
            <RootNavigator />
          </NavigationContainer>
        </SubscriptionProvider>
      </AdsProvider>
    </AppProvider>
  );
};

// Wrap com Sentry para capturar crashes não tratados
export default SentryWrap(App);
