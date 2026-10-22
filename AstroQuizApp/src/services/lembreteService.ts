/**
 * Lembretes para voltar a jogar — agendados no próprio aparelho.
 *
 * Sem servidor e sem push remoto: o módulo nativo `AstroQuizLembretes`
 * (ios/AstroQuizApp/AstroQuizLembretes.m e android/.../lembretes/) só agenda,
 * cancela e informa. Quando e o que dizer é decidido aqui, a partir do
 * progresso salvo, por `planejarLembretes`.
 *
 * Nada aqui pode derrubar uma tela: toda falha vira "sem lembrete".
 */

import { Alert, Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import i18n from '@/i18n';
import analyticsService from '@/services/analyticsService';
import { planejarLembretes } from '@/utils/planoDeLembretes';
import { ProgressStorage } from '@/utils/progressStorage';
import { SettingsStorage } from '@/utils/settingsStorage';

interface ModuloNativo {
  permissaoConcedida(): Promise<boolean>;
  pedirPermissao(): Promise<boolean>;
  agendar(itens: { id: string; segundos: number; titulo: string; texto: string }[]): Promise<void>;
  cancelar(): Promise<void>;
  consumirAbertura(): Promise<string | null>;
}

const nativo: ModuloNativo | undefined = NativeModules.AstroQuizLembretes;

/** Total de fases do jogo (config/game-rules.js). */
const ULTIMA_FASE = 50;

async function permitido(): Promise<boolean> {
  try {
    return !!nativo && (await nativo.permissaoConcedida());
  } catch {
    return false;
  }
}

/** Pede a permissão do sistema. No Android 13+ o pedido é o POST_NOTIFICATIONS, feito pelo próprio React Native. */
async function pedirPermissao(origem: 'oferta' | 'perfil'): Promise<boolean> {
  if (!nativo) return false;
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
    }
    const concedida = await nativo.pedirPermissao();
    analyticsService.logReminderPermission(origem, concedida ? 'concedida' : 'negada');
    return concedida;
  } catch {
    return false;
  }
}

/** A fase que espera o jogador, ou null quando ele já terminou todas. */
function proximaFase(desbloqueadas: number, completas: number[]): number | null {
  if (completas.includes(ULTIMA_FASE)) return null;
  return Math.min(Math.max(desbloqueadas || 1, 1), ULTIMA_FASE);
}

const lembreteService = {
  /**
   * Refaz a agenda a partir do progresso salvo. Chamado ao terminar uma fase
   * e quando o app volta para a frente — assim os textos acompanham a
   * sequência e o idioma atuais, e o que já passou sai da agenda.
   */
  async reagendar(): Promise<void> {
    if (!nativo) return;
    try {
      const ajustes = await SettingsStorage.getSettings();
      const ligado = ajustes.lembretesPerguntado && ajustes.notificationsEnabled && (await permitido());
      if (!ligado) {
        await nativo.cancelar();
        return;
      }
      const progresso = await ProgressStorage.getProgress();
      const agora = new Date();
      const plano = planejarLembretes({
        sequencia: progresso.sequenciaDiaria,
        proximaFase: proximaFase(progresso.unlockedPhases, progresso.completedPhases),
        agora,
        t: (chave, variaveis) => i18n.t(chave, variaveis) as string,
      });
      await nativo.agendar(
        plano.map((l) => ({
          id: l.id,
          segundos: Math.round((l.quando.getTime() - agora.getTime()) / 1000),
          titulo: l.titulo,
          texto: l.texto,
        })),
      );
    } catch {
      // Sem lembrete desta vez; a próxima fase terminada tenta de novo.
    }
  },

  /**
   * Oferece os lembretes uma única vez, depois que a pessoa terminou a
   * primeira fase. Antes disso não há o que lembrar, e o pedido de permissão
   * no primeiro segundo de app é o que mais leva a um "não".
   *
   * Primeiro um alerta do próprio app, e só com o "sim" o do sistema: o iOS só
   * deixa pedir uma vez, e um "não" lá só se desfaz nos Ajustes.
   */
  async talvezOferecer(): Promise<void> {
    if (!nativo) return;
    try {
      const ajustes = await SettingsStorage.getSettings();
      if (ajustes.lembretesPerguntado) return;
      const progresso = await ProgressStorage.getProgress();
      if (!progresso.sequenciaDiaria?.ultimoDia) return;

      await SettingsStorage.saveSettings({ lembretesPerguntado: true });
      Alert.alert(i18n.t('reminders.offer.title'), i18n.t('reminders.offer.message'), [
        {
          text: i18n.t('reminders.offer.decline'),
          style: 'cancel',
          onPress: () => {
            analyticsService.logReminderPermission('oferta', 'recusou_oferta');
            SettingsStorage.saveSettings({ notificationsEnabled: false }).then(() => this.reagendar());
          },
        },
        {
          text: i18n.t('reminders.offer.accept'),
          onPress: async () => {
            const concedida = await pedirPermissao('oferta');
            await SettingsStorage.saveSettings({ notificationsEnabled: concedida });
            await this.reagendar();
          },
        },
      ]);
    } catch {
      // Sem oferta desta vez.
    }
  },

  /** O que o botão do Perfil deve mostrar: ligado só com a escolha da pessoa E a permissão do sistema. */
  async estaLigado(): Promise<boolean> {
    const ajustes = await SettingsStorage.getSettings();
    return ajustes.lembretesPerguntado && ajustes.notificationsEnabled && (await permitido());
  },

  /**
   * Botão do Perfil. Ligar pede a permissão se for preciso; se o sistema já
   * tiver recusado, explica e leva aos Ajustes. Devolve o estado final.
   */
  async definirPeloPerfil(ligar: boolean): Promise<boolean> {
    await SettingsStorage.saveSettings({ lembretesPerguntado: true, notificationsEnabled: ligar });
    if (!ligar) {
      await this.reagendar();
      return false;
    }
    const concedida = (await permitido()) || (await pedirPermissao('perfil'));
    if (!concedida) {
      await SettingsStorage.saveSettings({ notificationsEnabled: false });
      Alert.alert(i18n.t('reminders.denied.title'), i18n.t('reminders.denied.message'), [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        { text: i18n.t('reminders.denied.openSettings'), onPress: () => Linking.openSettings().catch(() => {}) },
      ]);
      return false;
    }
    await this.reagendar();
    return true;
  },

  /** Se um lembrete abriu o app, registra qual. Chamado quando o app fica ativo. */
  async registrarAbertura(): Promise<void> {
    try {
      const id = nativo ? await nativo.consumirAbertura() : null;
      if (id) analyticsService.logReminderOpen(id);
    } catch {
      // Só analytics.
    }
  },
};

export default lembreteService;
