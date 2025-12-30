/**
 * API Service - Integração com Backend Strapi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';

import { Platform } from 'react-native';

// Configuração da API
// iOS Simulator usa localhost, dispositivo físico usa IP da rede
const PROD_API_BASE_URL = 'https://sua-api-producao.com/api';

// DEV defaults
const DEV_LAN_API_BASE_URL = 'http://192.168.68.110:1337/api'; // Mac na mesma rede do iPhone (ajuste quando o IP mudar)
const DEV_IOS_SIM_API_BASE_URL = 'http://localhost:1337/api'; // iOS Simulator
const DEV_ANDROID_EMULATOR_API_BASE_URL = 'http://10.0.2.2:1337/api'; // Android Emulator

const API_BASE_URL_OVERRIDE_KEY = '@api_base_url_override';

// Preferir sempre o IP da rede local em dev (funciona no device físico e também no simulador).
const getDefaultDevBaseUrl = () => DEV_LAN_API_BASE_URL;

const getInitialBaseUrl = () => {
  if (!__DEV__) return PROD_API_BASE_URL;
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

    // Interceptor para adicionar token
    this.api.interceptors.request.use(
      async config => {
        // Resolver baseURL (simulador vs device físico) no primeiro request em dev
        const resolvedBaseUrl = await this.ensureBaseUrlResolved();
        // IMPORTANT: axios calcula o config.baseURL ANTES do interceptor (merge de defaults).
        // Então precisamos garantir que o request atual use o baseURL resolvido.
        if (__DEV__ && resolvedBaseUrl) {
          config.baseURL = resolvedBaseUrl;
        }

        // Tentar carregar token na hora da requisição
        if (!this.authToken) {
          try {
            const token = await AsyncStorage.getItem('@auth_token');
            if (token) {
              this.authToken = token;
            }
          } catch (err) {
            console.log('Token não carregado');
          }
        }
        
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        // Não mostrar erro no console em desenvolvimento
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
   * Salvar token de autenticação
   */
  async setAuthToken(token: string) {
    this.authToken = token;
    await AsyncStorage.setItem('@auth_token', token);
  }

  /**
   * Remover token de autenticação
   */
  async clearAuthToken() {
    this.authToken = null;
    await AsyncStorage.removeItem('@auth_token');
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: any): Promise<T> {
    if (__DEV__) {
      console.log('📤 GET', endpoint, params);
    }
    const response = await this.api.get<T>(endpoint, { params });
    if (__DEV__) {
      console.log('📥 Response', endpoint, response.data);
    }
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    if (__DEV__) {
      console.log('📤 POST', endpoint, data);
    }
    const response = await this.api.post<T>(endpoint, data);
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
    if (!__DEV__) return;
    // Forçar sempre o IP da LAN em dev para evitar cache/override antigo.
    this.resolvedBaseUrl = DEV_LAN_API_BASE_URL;
    this.api.defaults.baseURL = DEV_LAN_API_BASE_URL;
    return DEV_LAN_API_BASE_URL;
  }
}

export default new ApiService();

