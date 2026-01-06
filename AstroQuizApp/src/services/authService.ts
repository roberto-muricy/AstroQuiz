/**
 * authService
 * Firebase Auth + Google Sign-In (social login)
 *
 * Notes:
 * - webClientId is the OAuth client with client_type = 3 from `android/app/google-services.json`
 *   (it is NOT a secret).
 * - Facebook login will be added later; this file is structured to allow more providers.
 */
import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

const GOOGLE_WEB_CLIENT_ID =
  '473888146350-udqdloorhbn0tauttltuju4ud68eslih.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '473888146350-1esnht3cntotsqbnu6osf2ovu4ejeho8.apps.googleusercontent.com';

let isConfigured = false;

function ensureConfigured() {
  if (isConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // iOS needs its native client id to properly start the OAuth flow in some setups.
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true, // Required to get idToken on iOS
  });
  isConfigured = true;
}

export type AuthResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'CANCELLED'
        | 'IN_PROGRESS'
        | 'PLAY_SERVICES_NOT_AVAILABLE'
        | 'NO_ID_TOKEN'
        | 'UNKNOWN';
      message: string;
    };

class AuthService {
  async signInWithGoogle(): Promise<AuthResult> {
    ensureConfigured();
    try {
      // Android only (iOS doesn't have Google Play Services)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const result = await GoogleSignin.signIn();
      console.log('🔍 Google Sign-In result:', JSON.stringify(result, null, 2));

      const idToken = result.idToken || result.data?.idToken;
      if (!idToken) {
        console.error('❌ No idToken in result:', result);
        return { ok: false, code: 'NO_ID_TOKEN', message: 'Google não retornou idToken.' };
      }

      const credential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(credential);
      return { ok: true };
    } catch (e: any) {
      // Map common GoogleSignIn errors to a stable surface for UI.
      const code = e?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false, code: 'CANCELLED', message: 'Login cancelado.' };
      }
      if (code === statusCodes.IN_PROGRESS) {
        return { ok: false, code: 'IN_PROGRESS', message: 'Login já está em andamento.' };
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          ok: false,
          code: 'PLAY_SERVICES_NOT_AVAILABLE',
          message: 'Google Play Services indisponível.',
        };
      }

      return {
        ok: false,
        code: 'UNKNOWN',
        message:
          e?.message ||
          (typeof code === 'string' ? `Erro Google Sign-In (${code}).` : 'Erro desconhecido ao autenticar com Google.'),
      };
    }
  }

  async signOut() {
    ensureConfigured();
    try {
      // If user signed in with Google, revoke local Google session first.
      await GoogleSignin.signOut().catch(() => undefined);
    } finally {
      await auth().signOut();
    }
  }

  getCurrentUser() {
    return auth().currentUser;
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      return { ok: true };
    } catch (e: any) {
      const code = e?.code as string | undefined;
      let message = 'Não foi possível entrar com e-mail.';
      if (code === 'auth/invalid-email') message = 'E-mail inválido.';
      if (code === 'auth/user-not-found') message = 'Usuário não encontrado.';
      if (code === 'auth/wrong-password') message = 'Senha incorreta.';
      if (code === 'auth/too-many-requests') message = 'Muitas tentativas. Tente mais tarde.';
      return { ok: false, code: 'UNKNOWN', message };
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      await auth().createUserWithEmailAndPassword(email.trim(), password);
      return { ok: true };
    } catch (e: any) {
      const code = e?.code as string | undefined;
      let message = 'Não foi possível criar a conta.';
      if (code === 'auth/email-already-in-use') message = 'E-mail já está em uso.';
      if (code === 'auth/invalid-email') message = 'E-mail inválido.';
      if (code === 'auth/weak-password') message = 'Senha muito fraca (mínimo 6 caracteres).';
      return { ok: false, code: 'UNKNOWN', message };
    }
  }
}

export default new AuthService();

