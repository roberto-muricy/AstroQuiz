/**
 * Abre um endereço fora do app (navegador, e-mail, loja).
 *
 * O iPhone às vezes se recusa: Safari bloqueado pelo Tempo de Uso, app Mail
 * apagado ou sem conta. `Linking.openURL` então rejeita, e sem tratamento isso
 * virava erro no Sentry (REACT-NATIVE-3, 26 eventos desde fevereiro de 2026)
 * enquanto o toque em Termos ou Privacidade simplesmente não fazia nada. Agora a
 * pessoa recebe o endereço para abrir por conta própria.
 */
import { Alert, Linking } from 'react-native';
import i18n from '@/i18n';

export async function abrirLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      i18n.t('common.linkErrorTitle'),
      i18n.t('common.linkErrorMessage', { address: url.replace(/^mailto:/, '') }),
    );
  }
}
