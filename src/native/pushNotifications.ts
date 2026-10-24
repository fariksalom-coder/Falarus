import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { registerPushDevice } from '../api/notifications';

/**
 * MOBIL ILOVA PUSHI (FCM / APNs) — Capacitor `PushNotifications` plagini orqali.
 *
 * Plagin JS paketisiz, `registerPlugin` bilan ulanadi: ilovaning NATIV qismida
 * `@capacitor/push-notifications` o'rnatilgan va Firebase sozlangan bo'lsa
 * ishlaydi. Hozirgi ilova versiyasida plagin yo'q — bu kod jim o'tadi
 * (`isPluginAvailable` false). Keyingi ilova yig'ilishida plagin qo'shilgach,
 * token o'z-o'zidan serverga yoziladi va eslatmalar telefonga keladi.
 */
type PushPlugin = {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  createChannel?(channel: { id: string; name: string; importance: number; sound?: string }): Promise<void>;
  addListener(event: 'registration', cb: (t: { value: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'pushNotificationActionPerformed', cb: (a: { notification: { data?: Record<string, string> } }) => void): Promise<PluginListenerHandle>;
};

const PushNotifications = registerPlugin<PushPlugin>('PushNotifications');
let started = false;

export async function startNativePush(authToken: string, open: (url: string) => void): Promise<void> {
  if (started || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) return;
  started = true;
  const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  try {
    await PushNotifications.addListener('registration', (t) => void registerPushDevice(authToken, platform, t.value).catch(() => undefined));
    await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      const url = a.notification.data?.url;
      if (url && url.startsWith('/')) open(url);
    });
    if (platform === 'android' && PushNotifications.createChannel) {
      await PushNotifications.createChannel({ id: 'falarus_reminders', name: 'Eslatmalar', importance: 4 }).catch(() => undefined);
    }
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
    if (perm.receive === 'granted') await PushNotifications.register();
  } catch {
    started = false;
  }
}
