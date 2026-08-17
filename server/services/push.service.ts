/**
 * push.service.ts — ilova YOPIQ bo'lganda ham keladigan bildirishnomalar.
 *
 * NIMA UCHUN KERAK: efir qo'ng'irog'i (`LiveCallOverlay`) faqat ilova ochiq
 * turganda ko'rinadi. O'quvchi telefonini cho'ntagiga solib qo'ygan bo'lsa,
 * efir boshlanganidan bexabar qolardi. Web Push esa brauzer orqali qurilma
 * ekraniga chiqadi — ilova yopiq bo'lsa ham.
 *
 * QANDAY ISHLAYDI:
 *   1. Brauzer service worker orqali obuna bo'ladi va bizga `endpoint` +
 *      ikkita kalit yuboradi (`/api/push/subscribe`).
 *   2. Efir boshlanganda server har bir obunaga SHIFRLANGAN xabar yuboradi.
 *   3. Service worker (`public/sw.js`) uni ushlab, bildirishnoma chiqaradi;
 *      bosilganda ilova ochilib efirga kiradi.
 *
 * VAPID KALITLARI: `.env` da `VAPID_PUBLIC_KEY` va `VAPID_PRIVATE_KEY`.
 * Yangi juftlik: `npx web-push generate-vapid-keys`. Kalitlar almashtirilsa
 * ESKI OBUNALAR BEKOR bo'ladi — jadvalni tozalash kerak.
 */
import webpush from 'web-push';
import { pool } from '../lib/db.js';

export type PushObuna = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY?.trim() || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim() || '';
/** Push xizmatiga aloqa manzili — talab qilinadi (mailto yoki sayt). */
const SUBJECT = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@falarus.uz';

let sozlandi = false;

export function pushSozlanganmi(): boolean {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  if (!sozlandi) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    sozlandi = true;
  }
  return true;
}

/** Brauzerga beriladigan ochiq kalit (obuna bo'lish uchun shart). */
export function pushOchiqKalit(): string {
  return PUBLIC_KEY;
}

/** Obunani saqlaydi. Bir xil qurilma qayta obuna bo'lsa — yangilanadi. */
export async function obunaniSaqla(
  userId: number,
  obuna: PushObuna,
  userAgent?: string,
): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
          VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
           SET user_id = EXCLUDED.user_id,
               p256dh = EXCLUDED.p256dh,
               auth = EXCLUDED.auth,
               user_agent = EXCLUDED.user_agent`,
    [userId, obuna.endpoint, obuna.keys.p256dh, obuna.keys.auth, (userAgent ?? '').slice(0, 300)],
  );
}

export async function obunaniOchir(endpoint: string): Promise<void> {
  if (!pool) return;
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export type PushXabar = {
  title: string;
  body: string;
  /** Bosilganda ochiladigan ichki manzil. */
  url: string;
  /** Bir xil `tag` bilan kelgan bildirishnoma eskisini almashtiradi. */
  tag?: string;
};

type Qator = { id: number; endpoint: string; p256dh: string; auth: string };

/**
 * Xabarni BARCHA obunalarga yuboradi (efirdan tashqari hech narsa uchun
 * ishlatilmasin — bu butun bazaga tegadigan amal).
 *
 * `exceptUserId` — efirni boshlagan supportning o'ziga yubormaslik uchun.
 *
 * Yaroqsiz obunalar (404/410) darhol o'chiriladi: foydalanuvchi ilovani
 * o'chirgan yoki brauzer obunani bekor qilgan bo'ladi, aks holda jadval
 * o'lik yozuvlar bilan to'lib ketardi.
 */
export async function hammagaYubor(
  xabar: PushXabar,
  exceptUserId?: number,
): Promise<{ yuborildi: number; ochirildi: number }> {
  if (!pool || !pushSozlanganmi()) return { yuborildi: 0, ochirildi: 0 };

  const { rows } = await pool.query<Qator>(
    exceptUserId
      ? 'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id <> $1'
      : 'SELECT id, endpoint, p256dh, auth FROM push_subscriptions',
    exceptUserId ? [exceptUserId] : [],
  );
  return qatorlargaYubor(rows, xabar);
}

/**
 * FAQAT bitta foydalanuvchining qurilmalariga yuboradi — sinov qo'ng'irog'i.
 *
 * Nima uchun kerak: efir xabari uni boshlagan supportning O'ZIGA ketmaydi
 * (`hammagaYubor(..., supportUserId)`), shuning uchun support "keldimi yoki
 * yo'qmi" ni tekshira olmasdi va bildirishnoma buzuq deb o'ylardi.
 */
export async function foydalanuvchigaYubor(
  userId: number,
  xabar: PushXabar,
): Promise<{ yuborildi: number; ochirildi: number }> {
  if (!pool || !pushSozlanganmi()) return { yuborildi: 0, ochirildi: 0 };

  const { rows } = await pool.query<Qator>(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId],
  );
  return qatorlargaYubor(rows, xabar);
}

/** Nechta qurilma obuna bo'lgani — support panelida ko'rsatiladi. */
export async function obunaSoni(): Promise<{ qurilmalar: number; odamlar: number }> {
  if (!pool) return { qurilmalar: 0, odamlar: 0 };
  const { rows } = await pool.query<{ qurilmalar: string; odamlar: string }>(
    'SELECT count(*) AS qurilmalar, count(DISTINCT user_id) AS odamlar FROM push_subscriptions',
  );
  return {
    qurilmalar: Number(rows[0]?.qurilmalar ?? 0),
    odamlar: Number(rows[0]?.odamlar ?? 0),
  };
}

async function qatorlargaYubor(
  rows: Qator[],
  xabar: PushXabar,
): Promise<{ yuborildi: number; ochirildi: number }> {
  if (!pool || !rows.length) return { yuborildi: 0, ochirildi: 0 };

  const payload = JSON.stringify(xabar);
  let yuborildi = 0;
  const olik: string[] = [];

  /*
   * Bir vaqtda 20 tadan: minglab obuna bo'lsa hammasini birdan yuborish
   * serverni ham, push xizmatini ham bo'g'ib qo'yadi.
   */
  const BOLAK = 20;
  for (let i = 0; i < rows.length; i += BOLAK) {
    const bolak = rows.slice(i, i + BOLAK);
    await Promise.all(
      bolak.map(async (r) => {
        try {
          await webpush.sendNotification(
            { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            payload,
            { TTL: 15 * 60 },
          );
          yuborildi += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) olik.push(r.endpoint);
        }
      }),
    );
  }

  /*
   * `$1::text[]` — tur ATAYLAB ko'rsatilgan: bo'sh massiv yuborilganda
   * Postgres parametr turini aniqlay olmay xato berardi.
   */
  if (olik.length) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])', [olik]);
  }

  if (yuborildi) {
    await pool.query(
      'UPDATE push_subscriptions SET last_sent_at = now() WHERE endpoint <> ALL($1::text[])',
      [olik],
    );
  }

  return { yuborildi, ochirildi: olik.length };
}
