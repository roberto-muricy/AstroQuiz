/**
 * Firebase Authentication Service
 * Validates Firebase ID tokens and manages user context
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Requires FIREBASE_SERVICE_ACCOUNT env var with path to service account JSON
 * Or FIREBASE_PROJECT_ID for Application Default Credentials
 */
export function initializeFirebase(): void {
  if (firebaseApp) return;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountJson) {
      // Parse credentials directly from environment variable (for Railway/Heroku/etc.)
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT_JSON');
        return;
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError);
      }
    }

    if (serviceAccountPath) {
      // Resolve to absolute path from project root
      const absolutePath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);

      if (!fs.existsSync(absolutePath)) {
        console.warn(`Firebase credentials file not found: ${absolutePath}`);
        return;
      }

      // Read and parse the JSON file
      const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized from file');
      return;
    }

    if (projectId) {
      // Use Application Default Credentials (for Google Cloud only)
      firebaseApp = admin.initializeApp({
        projectId,
      });
      console.log('Firebase Admin SDK initialized with projectId (ADC)');
      return;
    }

    console.warn(
      'Firebase not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT, or FIREBASE_PROJECT_ID env var.'
    );
  } catch (error: any) {
    console.error('Failed to initialize Firebase:', error.message);
  }
}

/**
 * Verify Firebase ID token
 * Returns decoded token with user info or null if invalid
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken | null> {
  if (!firebaseApp) {
    console.warn('Firebase not initialized, skipping token verification');
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    console.warn('Invalid Firebase token:', error.message);
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

/**
 * Check if Firebase is configured and ready
 */
export function isFirebaseConfigured(): boolean {
  return firebaseApp !== null;
}
