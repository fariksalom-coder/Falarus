/**
 * ustozKvota.service.ts — ustoz bilan SUHBAT uchun foydalanuvchi kvotasi.
 *
 * QOIDA: 20 ta so'rov, so'ng 5 soat tanaffus. Tanaffus tugagach hisob
 * noldan boshlanadi.
 *
 * NIMA KVOTAGA KIRADI: savol berish (`/ustoz/savol`), og'zaki javob
 * (`/ustoz/suhbat`) va jonli suhbat sessiyasi (`/ustoz/live`). Ya'ni ustoz
 * bilan ERKIN muloqot.
 *
 * NIMA KIRMAYDI: mavzuni tushuntirish (`/ustoz/dars`), o'qishni tekshirish
 * (`/ustoz/oqish`) va mashq (`/ustoz/mashq`). Dars o'tish cheklanmasligi
 * kerak — cheklovning maqsadi token sarfini kamaytirish, o'quvchini
 * o'qishdan to'xtatish emas.
 *
 * NIMA UCHUN BAZADA: serverda Redis yo'q, `rateLimit.ts` esa bunday holatda
 * xotiraga tushadi. PM2 jarayoni tez-tez qayta ishga tushadi va xotiradagi
 * hisob har safar yo'qolardi — 5 soatlik cheklov amalda ishlamasdi.
 */
import { pool } from '../lib/db.js';

/** Bir davrda ruxsat etilgan so'rovlar soni. */
export const KVOTA_SONI = Number(process.env.USTOZ_SUHBAT_KVOTA || 20);
/** Chegara to'lgach tanaffus (soniya). */
export const KVOTA_TANAFFUS_SEK = Number(process.env.USTOZ_SUHBAT_TANAFFUS_SEK || 5 * 60 * 60);

export type KvotaNatija = {
  ruxsat: boolean;
  /** Shu davrda yana nechta so'rov qolgani. */
  qolgan: number;
  /** Bloklangan bo'lsa — necha soniyadan keyin ochiladi. */
  kutish: number;
};

/** Baza yo'q bo'lsa cheklov qo'llanmaydi — dars to'xtab qolmasin. */
const ochiq = (): KvotaNatija => ({ ruxsat: true, qolgan: KVOTA_SONI, kutish: 0 });

/**
 * Bitta so'rovni hisobga oladi va ruxsatni qaytaradi.
 *
 * Tranzaksiya va qatorni qulflash ishlatiladi: bir foydalanuvchi ikkita
 * oynadan bir vaqtda so'rov yuborsa ham hisob to'g'ri qoladi.
 */
export async function kvotaOl(userId: number): Promise<KvotaNatija> {
  if (!pool) return ochiq();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ soni: number; bloklangan_gacha: string | null }>(
      `SELECT soni, bloklangan_gacha FROM ustoz_suhbat_kvota
        WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    const hozir = Date.now();
    const qator = rows[0];
    const blokGacha = qator?.bloklangan_gacha ? new Date(qator.bloklangan_gacha).getTime() : 0;

    // Blok kuchida — so'rov hisobga OLINMAYDI.
    if (blokGacha > hozir) {
      await client.query('COMMIT');
      return { ruxsat: false, qolgan: 0, kutish: Math.ceil((blokGacha - hozir) / 1000) };
    }

    // Blok tugagan yoki umuman bo'lmagan: tugagan bo'lsa hisob noldan boshlanadi.
    const oldingi = blokGacha > 0 ? 0 : (qator?.soni ?? 0);
    const yangi = oldingi + 1;
    const toldi = yangi >= KVOTA_SONI;
    const yangiBlok = toldi ? new Date(hozir + KVOTA_TANAFFUS_SEK * 1000).toISOString() : null;

    await client.query(
      `INSERT INTO ustoz_suhbat_kvota (user_id, soni, bloklangan_gacha, yangilandi)
            VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) DO UPDATE
             SET soni = $2, bloklangan_gacha = $3, yangilandi = now()`,
      [userId, yangi, yangiBlok],
    );

    await client.query('COMMIT');
    return { ruxsat: true, qolgan: Math.max(0, KVOTA_SONI - yangi), kutish: 0 };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // Kvota hisoblanmasa ham dars davom etsin — cheklov yordamchi mexanizm,
    // uning nosozligi o'quvchini to'xtatib qo'ymasligi kerak.
    console.error('[ustozKvota] hisobga olib bo\'lmadi:', (err as Error).message);
    return ochiq();
  } finally {
    client.release();
  }
}

/** Faqat o'qiydi — kvotani sarflamaydi (ekranda ko'rsatish uchun). */
export async function kvotaHolati(userId: number): Promise<KvotaNatija> {
  if (!pool) return ochiq();
  try {
    const { rows } = await pool.query<{ soni: number; bloklangan_gacha: string | null }>(
      'SELECT soni, bloklangan_gacha FROM ustoz_suhbat_kvota WHERE user_id = $1',
      [userId],
    );
    const qator = rows[0];
    if (!qator) return ochiq();

    const hozir = Date.now();
    const blokGacha = qator.bloklangan_gacha ? new Date(qator.bloklangan_gacha).getTime() : 0;
    if (blokGacha > hozir) {
      return { ruxsat: false, qolgan: 0, kutish: Math.ceil((blokGacha - hozir) / 1000) };
    }
    // Blok tugagan bo'lsa hisob keyingi so'rovda nolga tushadi.
    const ishlatilgan = blokGacha > 0 ? 0 : qator.soni;
    return { ruxsat: true, qolgan: Math.max(0, KVOTA_SONI - ishlatilgan), kutish: 0 };
  } catch (err) {
    console.error('[ustozKvota] holatni o\'qib bo\'lmadi:', (err as Error).message);
    return ochiq();
  }
}

/** Cheklov xabari — soatlarda, o'quvchiga tushunarli qilib. */
export function kvotaXabari(kutish: number): string {
  const soat = Math.floor(kutish / 3600);
  const daqiqa = Math.ceil((kutish % 3600) / 60);
  const vaqt = soat > 0 ? `${soat} soat ${daqiqa} daqiqa` : `${daqiqa} daqiqa`;
  return `Ustoz bilan suhbat chegarasi tugadi (${KVOTA_SONI} ta savol). `
    + `${vaqt} dan keyin yana savol bera olasiz. `
    + `Darslarni tushuntirish va mashqlar cheklanmagan — davom ettiravering.`;
}
