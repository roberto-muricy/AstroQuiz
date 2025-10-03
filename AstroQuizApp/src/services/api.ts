/**
 * API Service - Integração com Backend Strapi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';

// Configuração da API
const API_BASE_URL = 'http://localhost:1337/api'; // Ajuste conforme necessário
const API_TIMEOUT = 30000;

class ApiService {
  private api: AxiosInstance;
  private authToken: string | null = null;

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
          console.log('API Error (esperado em dev):', error.message);
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
    const response = await this.api.get<T>(endpoint, { params });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(endpoint, data);
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
      const response = await this.get('/health');
      return response;
    } catch (error) {
      throw new Error('Backend não está respondendo');
    }
  }
}

export default new ApiService();

