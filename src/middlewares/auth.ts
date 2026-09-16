/**
 * Authentication Middleware
 * Protects routes with Firebase token validation
 */

import {
  verifyFirebaseToken,
  extractBearerToken,
  isFirebaseConfigured,
} from '../services/firebase-auth';

/**
 * O e-mail nao entra aqui de proposito.
 *
 * Ele e a credencial de quem entra por e-mail e senha, entao o Firebase precisa
 * dele — mas o nosso lado nunca precisou: nada consulta por e-mail, nada envia
 * e-mail, e o app le o endereco do proprio SDK do Firebase. Deixar o campo no
 * estado da requisicao so convidava a grava-lo de novo, que e o que acontecia
 * ate 16/09/2026.
 */
export interface AuthContext {
  firebaseUid: string;
  role: 'user' | 'premium' | 'admin';
  isBlocked: boolean;
}

/**
 * Middleware that requires valid Firebase authentication
 * Adds user context to ctx.state.user
 */
export function createAuthMiddleware(strapi: any) {
  return async (ctx: any, next: () => Promise<void>) => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        strapi.log.error('Firebase not configured in production!');
        return ctx.serviceUnavailable('Authentication service unavailable');
      }
      strapi.log.warn('Firebase not configured - auth bypassed (dev mode)');
      await next();
      return;
    }

    const authHeader = ctx.request.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      return ctx.unauthorized('Missing authentication token');
    }

    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken) {
      return ctx.unauthorized('Invalid authentication token');
    }

    // Get user profile from database
    const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
      where: { firebaseUid: decodedToken.uid },
    });

    // Check if user is blocked
    if (profile?.isBlocked) {
      return ctx.forbidden('Account is blocked');
    }

    // Add user context to request
    ctx.state.user = {
      firebaseUid: decodedToken.uid,
      role: profile?.role || 'user',
      isBlocked: profile?.isBlocked || false,
    } as AuthContext;

    await next();
  };
}

/**
 * Middleware that requires admin role
 */
export function createAdminMiddleware(strapi: any) {
  return async (ctx: any, next: () => Promise<void>) => {
    const user = ctx.state.user as AuthContext | undefined;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    if (user.role !== 'admin') {
      return ctx.forbidden('Admin access required');
    }

    await next();
  };
}

/**
 * Optional auth - sets user if token provided, but doesn't require it
 */
export function createOptionalAuthMiddleware(strapi: any) {
  return async (ctx: any, next: () => Promise<void>) => {
    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        strapi.log.error('Firebase not configured in production!');
        return ctx.serviceUnavailable('Authentication service unavailable');
      }
      await next();
      return;
    }

    const authHeader = ctx.request.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (token) {
      const decodedToken = await verifyFirebaseToken(token);
      if (decodedToken) {
        const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
          where: { firebaseUid: decodedToken.uid },
        });

        if (!profile?.isBlocked) {
          ctx.state.user = {
            firebaseUid: decodedToken.uid,
            role: profile?.role || 'user',
            isBlocked: false,
          } as AuthContext;
        }
      }
    }

    await next();
  };
}
