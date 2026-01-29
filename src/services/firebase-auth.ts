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
    const projectId = process.env.FIREBASE_PROJECT_ID;

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
    } else if (projectId) {
      // Use Application Default Credentials (for Cloud Run, etc.)
      firebaseApp = admin.initializeApp({
        projectId,
      });
    } else {
      console.warn(
        'Firebase not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID env var.'
      );
      return;
    }

    console.log('Firebase Admin SDK initialized');
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
