/**
 * fcm.service.ts — mobil ilovaga (Android/iOS) push: Firebase Cloud Messaging HTTP v1.
 *
 * Mobil ilova WebView ichida ishlaydi, u yerda web push yo'q. Shuning uchun
 * ilova ichidagi xabar faqat FCM orqali keladi: ilova push plaginidan token
 * oladi va `/api/push/device` ga yozadi (push_devices), server esa shu
 * tokenlarga yuboradi.
 *
 * SOZLASH: `.env` da `FCM_SERVICE_ACCOUNT_FILE` — Firebase konsolidan olingan
 * service account JSON fayli yo'li (Project settings → Service accounts →
 * Generate new private key). Fayl bo'lmasa xizmat jimgina o'chiq turadi.
 *
 * Kutubxonasiz: Google OAuth tokeni RS256 JWT bilan Node `crypto` orqali olinadi.
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

export type FcmXabar = { title: string; body: string; url: string; audioUrl?: string | null; notificationId?: number };
export type FcmNatija = { yuborildi: number; olik: string[] };

let account: ServiceAccount | null | undefined;
let cachedToken: { value: string; expires: number } | null = null;

function loadAccount(): ServiceAccount | null {
  if (account !== undefined) return account;
  const file = process.env.FCM_SERVICE_ACCOUNT_FILE?.trim();
  account = null;
  if (!file) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<ServiceAccount>;
    if (parsed.project_id && parsed.client_email && parsed.private_key) account = parsed as ServiceAccount;
    else console.error('[fcm] service account faylida project_id/client_email/private_key yo‘q');
  } catch (e) {
    console.error('[fcm] service account o‘qilmadi:', (e as Error).message);
  }
  return account;
}

export function fcmSozlanganmi(): boolean {
  return loadAccount() !== null;
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${head}.${claims}`);
  const jwt = `${head}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`FCM token (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/**
 * Tokenlarga yuboradi (v1 API'da multicast yo'q — bittadan, 20 tadan parallel).
 * `olik` — ilova o'chirilgan qurilmalar (UNREGISTERED / 404): ularni chaqiruvchi o'chiradi.
 */
export async function fcmYubor(tokens: string[], xabar: FcmXabar): Promise<FcmNatija> {
  const sa = loadAccount();
  if (!sa || tokens.length === 0) return { yuborildi: 0, olik: [] };
  const token = await accessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const data: Record<string, string> = { url: xabar.url };
  if (xabar.audioUrl) data.audio_url = xabar.audioUrl;
  if (xabar.notificationId) data.notification_id = String(xabar.notificationId);

  let yuborildi = 0;
  const olik: string[] = [];
  for (let i = 0; i < tokens.length; i += 20) {
    await Promise.all(tokens.slice(i, i + 20).map(async (t) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token: t,
              notification: { title: xabar.title, body: xabar.body },
              data,
              android: { priority: 'HIGH', notification: { channel_id: 'falarus_reminders', sound: 'default' } },
              apns: { payload: { aps: { sound: 'default' } } },
            },
          }),
        });
        if (res.ok) { yuborildi += 1; return; }
        const text = await res.text().catch(() => '');
        if (res.status === 404 || text.includes('UNREGISTERED')) olik.push(t);
      } catch {
        /* tarmoq xatosi — keyingi safar */
      }
    }));
  }
  return { yuborildi, olik };
}
