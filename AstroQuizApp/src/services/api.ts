/**
 * API Service - Integração com Backend Strapi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import auth from '@react-native-firebase/auth';

import { NativeModules, Platform } from 'react-native';

// Configuração da API
// iOS Simulator usa localhost, dispositivo físico usa IP da rede
const PROD_API_BASE_URL = 'https://astroquiz-production.up.railway.app/api';

// DEV defaults
const DEV_IOS_SIM_API_BASE_URL = 'http://localhost:1337/api'; // iOS Simulator
const DEV_ANDROID_EMULATOR_API_BASE_URL = 'http://10.0.2.2:1337/api'; // Android Emulator

const API_BASE_URL_OVERRIDE_KEY = '@api_base_url_override';

/**
 * Em DEV, tenta descobrir o host do Metro (packager) para montar a URL do Strapi.
 * Isso evita deixar IP fixo e funciona tanto no simulador quanto em device físico.
 */
const getMetroHost = (): string | null => {
  try {
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    if (!scriptURL) return null;

    // Ex.: http://192.168.0.10:8081/index.bundle?platform=ios...
    const match = scriptURL.match(/^https?:\/\/([^:/]+)(?::\d+)?\//i);
    const host = match?.[1];
    if (!host) return null;
    if (host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
};

const getDevLanBaseUrl = (): string => {
  const host = getMetroHost();
  if (host) return `http://${host}:1337/api`;
  // Fallback: usa localhost (funcionará apenas em simulador)
  // Para device físico, configure via AsyncStorage override ou use produção
  return 'http://localhost:1337/api';
};

const getDefaultDevBaseUrl = () => {
  if (Platform.OS === 'ios') return DEV_IOS_SIM_API_BASE_URL;
  return DEV_ANDROID_EMULATOR_API_BASE_URL;
};

// Set to true to test production API in dev mode
const USE_PROD_IN_DEV = true;

const getInitialBaseUrl = () => {
  if (!__DEV__ || USE_PROD_IN_DEV) return PROD_API_BASE_URL;
  // Base inicial (antes de detectar/override). Será ajustada no 1º request.
  return getDefaultDevBaseUrl();
};

const API_BASE_URL = getInitialBaseUrl();
const API_TIMEOUT = 30000;

class ApiService {
  private api: AxiosInstance;
  private authToken: string | null = null;
  private resolvedBaseUrl: string | null = null;
  private resolvingBaseUrl: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Remove legacy plain-text token from previous app versions.
    AsyncStorage.removeItem('@auth_token').catch(() => {});

    // Interceptor para adicionar token
    this.api.interceptors.request.use(
      async config => {
        // Resolver baseURL (simulador vs device físico) no primeiro request em dev
        const resolvedBaseUrl = await this.ensureBaseUrlResolved();
        // IMPORTANT: axios calcula o config.baseURL ANTES do interceptor (merge de defaults).
        // Então precisamos garantir que o request atual use o baseURL resolvido.
        if (__DEV__ && !USE_PROD_IN_DEV && resolvedBaseUrl) {
          config.baseURL = resolvedBaseUrl;
        }

        // Buscar token diretamente do Firebase Auth (persistido pelo SDK
        // nativo via Keychain/EncryptedSharedPreferences). Em memória apenas.
        if (!this.authToken) {
          try {
            const fbUser = auth().currentUser;
            if (fbUser) {
              this.authToken = await fbUser.getIdToken();
            }
          } catch {
            // sem token: segue como guest
          }
        }

        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Interceptor para tratar erros (inclui refresh de token)
    this.api.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Se receber 401 e não for retry, tenta renovar o token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const user = auth().currentUser;
            if (user) {
              // Força refresh do token Firebase (persistido em memória)
              const newToken = await user.getIdToken(true);
              this.authToken = newToken;

              if (__DEV__) {
                console.log('🔄 Token refreshed automatically');
              }

              // Refaz a requisição original com o novo token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            if (__DEV__) {
              console.log('❌ Token refresh failed:', refreshError);
            }
          }
        }

        // Log de erro em desenvolvimento
        if (__DEV__) {
          const baseURL = this.api.defaults.baseURL;
          const url = error.config?.url;
          const method = (error.config?.method || '').toUpperCase();
          const code = (error as any)?.code;

          console.log('❌ API Error:', {
            message: error.message,
            code,
            baseURL,
            request: `${method} ${url}`,
            status: error.response?.status,
            data: error.response?.data,
          });
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * BaseURL atual (com /api). Útil para debug e para construir URLs absolutas.
   * Observação: em runtime, isso já estará resolvido após o primeiro request em DEV.
   */
  getBaseUrl(): string {
    return this.resolvedBaseUrl || this.api.defaults.baseURL || API_BASE_URL;
  }

  /**
   * Base URL pública do Strapi (sem o sufixo /api).
   * Ex.: https://astroquiz-production.up.railway.app
   */
  getPublicBaseUrl(): string {
    return this.getBaseUrl().replace(/\/api\/?$/, '');
  }


  /**
   * Cachear token de autenticação em memória (Firebase persiste nativamente).
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Limpar token cacheado em memória.
   */
  clearAuthToken() {
    this.authToken = null;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: any, config: AxiosRequestConfig = {}): Promise<T> {
    if (__DEV__) {
      console.log('📤 GET', endpoint, params);
    }
    const response = await this.api.get<T>(endpoint, { params, ...config });
    if (__DEV__) {
      console.log('📥 Response', endpoint, response.data);
    }
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> {
    if (__DEV__) {
      console.log('📤 POST', endpoint, data);
    }
    const response = await this.api.post<T>(endpoint, data, config);
    if (__DEV__) {
      console.log('📥 Response', endpoint, response.data);
    }
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(endpoint, data);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.api.delete<T>(endpoint);
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.get('/quiz/health');
      return response;
    } catch (error) {
      throw new Error('Backend não está respondendo');
    }
  }

  /**
   * Permite override manual do baseURL (ex: device físico)
   */
  async setApiBaseUrlOverride(baseUrl: string | null) {
    if (baseUrl) {
      await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_KEY, baseUrl);
      this.resolvedBaseUrl = baseUrl;
      this.api.defaults.baseURL = baseUrl;
    } else {
      await AsyncStorage.removeItem(API_BASE_URL_OVERRIDE_KEY);
      this.resolvedBaseUrl = null;
      this.api.defaults.baseURL = getInitialBaseUrl();
    }
  }

  private async ensureBaseUrlResolved(): Promise<string | null> {
    if (!__DEV__ || USE_PROD_IN_DEV) return null;
    if (this.resolvedBaseUrl) return this.resolvedBaseUrl;
    if (this.resolvingBaseUrl) {
      await this.resolvingBaseUrl;
      return this.resolvedBaseUrl;
    }

    this.resolvingBaseUrl = this.resolveDevBaseUrl().finally(() => {
      this.resolvingBaseUrl = null;
    });

    const baseUrl = await this.resolvingBaseUrl;
    this.resolvedBaseUrl = baseUrl;
    this.api.defaults.baseURL = baseUrl;

    if (__DEV__) {
      console.log('🌐 API baseURL resolved:', baseUrl);
    }

    return baseUrl;
  }

  private async resolveDevBaseUrl(): Promise<string> {
    // 1) Override salvo (quando o IP muda, você pode trocar sem mexer no código)
    try {
      const override = await AsyncStorage.getItem(API_BASE_URL_OVERRIDE_KEY);
      if (override) return override;
    } catch {
      // ignore
    }

    // 2) Tenta detectar automaticamente (simulador vs device)
    const probe = axios.create({ timeout: 1200 });
    const probeHealth = async (baseUrl: string) => {
      try {
        const res = await probe.get(`${baseUrl}/quiz/health`, {
          validateStatus: () => true,
        });
        return res.status >= 200 && res.status < 500;
      } catch {
        return false;
      }
    };

    const lanUrl = getDevLanBaseUrl();

    if (Platform.OS === 'ios') {
      // iOS Simulator -> localhost; iPhone físico -> LAN IP
      if (await probeHealth(DEV_IOS_SIM_API_BASE_URL)) return DEV_IOS_SIM_API_BASE_URL;
      if (await probeHealth(lanUrl)) return lanUrl;
      return lanUrl;
    }

    // Android Emulator -> 10.0.2.2; device físico -> LAN IP
    if (await probeHealth(DEV_ANDROID_EMULATOR_API_BASE_URL)) return DEV_ANDROID_EMULATOR_API_BASE_URL;
    if (await probeHealth(lanUrl)) return lanUrl;
    return lanUrl;
  }
}

export default new ApiService();

