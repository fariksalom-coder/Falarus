import { apiUrl } from '../api';

/**
 * Push obunasi — ilova yopiq bo'lganda ham efir xabari kelishi uchun.
 *
 * Brauzer obunani service worker orqali beradi; biz uni serverga saqlaymiz.
 * Ruxsat so'rash FAQAT foydalanuvchi tugmani bosganda bo'ladi: so'ralmagan
 * joyda so'rasak brauzer o'zi rad etadi va ikkinchi imkon bo'lmaydi.
 */

export type PushKalit = { key: string; enabled: boolean };

export async function pushOchiqKalit(): Promise<PushKalit> {
  const res = await fetch(apiUrl('/api/push/public-key'));
  if (!res.ok) return { key: '', enabled: false };
  return (await res.json()) as PushKalit;
}

/** Base64URL kalitni brauzer kutadigan baytlarga aylantiradi. */
function kalitniBaytga(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const xom = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const belgilar = atob(xom);
  const baytlar = new Uint8Array(belgilar.length);
  for (let i = 0; i < belgilar.length; i += 1) baytlar[i] = belgilar.charCodeAt(i);
  return baytlar;
}

export function pushQollabQuvvatlanadi(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Obuna bo'ladi va serverga yozadi.
 *
 * `soralsin` — ruxsat hali so'ralmagan bo'lsa so'raladimi. Fon rejimida
 * (sahifa ochilganda avtomatik) `false` bo'ladi: allaqachon ruxsat berilgan
 * qurilma qayta obuna bo'ladi, boshqalar bezovta qilinmaydi.
 */
export async function pushObunaBol(token: string, soralsin: boolean): Promise<boolean> {
  if (!pushQollabQuvvatlanadi()) return false;

  const holat = Notification.permission;
  if (holat === 'denied') return false;
  if (holat === 'default') {
    if (!soralsin) return false;
    const javob = await Notification.requestPermission();
    if (javob !== 'granted') return false;
  }

  const { key, enabled } = await pushOchiqKalit();
  if (!enabled || !key) return false;

  const reg = await navigator.serviceWorker.ready;
  const mavjud = await reg.pushManager.getSubscription();
  const obuna =
    mavjud ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: kalitniBaytga(key) as unknown as BufferSource,
    }));

  const res = await fetch(apiUrl('/api/push/subscribe'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: obuna.toJSON() }),
  });
  return res.ok;
}

/** Support paneli uchun: nechta qurilma/odam obuna bo'lgan. */
export async function pushObunaSoni(
  token: string,
): Promise<{ qurilmalar: number; odamlar: number }> {
  const res = await fetch(apiUrl('/api/push/stats'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { qurilmalar: 0, odamlar: 0 };
  return (await res.json()) as { qurilmalar: number; odamlar: number };
}

/** Supportning O'Z qurilmalariga sinov bildirishnomasi yuboradi. */
export async function pushSinovYubor(token: string): Promise<number> {
  const res = await fetch(apiUrl('/api/push/test'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Sinov yuborilmadi');
  const d = (await res.json()) as { yuborildi?: number };
  return Number(d.yuborildi ?? 0);
}

