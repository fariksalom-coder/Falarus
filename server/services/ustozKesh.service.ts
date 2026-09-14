/**
 * ustozKesh.service.ts — ustoz javoblarining UMUMIY keshi.
 *
 * Bir o'quvchi bergan savolning javobi saqlanadi va keyin boshqa
 * o'quvchilarga ham shu yerdan beriladi — model qayta chaqirilmaydi.
 * Bu token sarfini eng ko'p kamaytiradigan mexanizm: bir xil mavzuda
 * o'quvchilar deyarli bir xil savollarni beradi.
 *
 * NIMA KESHLANADI:
 *   `savol` — dars davomida berilgan savolga javob;
 *   `dars`  — kun mavzusi bo'yicha tayyorlangan dars (eng qimmat chaqiruv).
 *
 * NIMA KESHLANMAYDI:
 *   og'zaki javobni baholash — u aynan shu o'quvchining javobiga bog'liq;
 *   qo'shimcha mashq — "yana mashq" tugmasi har safar yangi savol berishi kerak.
 *
 * PROMPT VERSIYASI: kalitga `KESH_VERSIYA` kiradi. Promptlar o'zgarganda shu
 * raqamni oshirish kifoya — eski javoblar o'z-o'zidan chetlab o'tiladi,
 * jadvalni tozalash shart emas.
 */
import { createHash } from 'crypto';
import { pool } from '../lib/db.js';

/**
 * Promptlar jiddiy o'zgarganda oshiriladi.
 *
 * v7 (2026-08-14) — dars prompti SLAYD tuzilishiga o'tdi: 8-12 bosqich,
 * ayrilish/tenglama/nishonlar maketlari va ikonkalar. Eski keshdagi darslar
 * bu maketlarsiz edi, ya'ni yangi doskada yarim bo'sh ko'rinardi.
 *
 * v8 (2026-08-30) — promptga KELISHIK BOSHQARUVI qoidalari qo'shildi va
 * kelishik ziddiyatini ushlaydigan tekshiruv paydo bo'ldi. Eski keshda
 * xato darslar bor edi (masalan "нет паспорта" haqida "tushum kelishigi"
 * deb yozilgani), ular shu versiya bilan o'z-o'zidan chetlab o'tiladi.
 *
 * v9 (2026-08-30) — dars endi MAVZUNI E'LON QILIB boshlanadi (QISM 4).
 * Keshdagi darslar eski tuzilishda edi: birinchi slayd to'g'ridan-to'g'ri
 * hayotiy vaziyatdan boshlanardi va o'quvchi nima o'rganayotganini
 * bilmasdi.
 */
const KESH_VERSIYA = 'v9';

/** Shu muddatdan eski javoblar ishlatilmaydi (kun). */
const YAROQLILIK_KUN = Number(process.env.USTOZ_KESH_KUN || 30);

export type KeshTuri = 'savol' | 'dars';

/**
 * DARS KESHINING KALITI — KUN MATERIALINING BARCHASIDAN tuziladi.
 *
 * NIMA UCHUN MUHIM: darslik va grammatika SQL konsoli orqali to'g'ridan-to'g'ri
 * bazada tahrirlanadi. Ilgari kalit faqat `mavzu | kun | vazifa savollari` dan
 * tuzilardi — ya'ni nazariya matni tuzatilsa ham kalit O'ZGARMAS va AI eski,
 * tuzatilishdan oldingi darsni 30 kun davomida qaytaraverardi.
 *
 * Endi nazariya, javob variantlari va to'g'ri javoblar ham kalitga kiradi:
 * material o'zgardi degani — kalit o'zgardi, ya'ni AI darsni O'ZI qaytadan
 * tayyorlaydi. Eski yozuv hech kimga xalaqit bermaydi, muddati bilan o'chadi.
 */
export function darsKeshKaliti(body: Record<string, unknown>): string {
  const vazifalar = Array.isArray(body.vazifalar) ? body.vazifalar : [];
  const vaz = vazifalar
    .map((raw) => {
      const v = (raw ?? {}) as Record<string, unknown>;
      const variantlar = Array.isArray(v.variantlar) ? v.variantlar.map(String).join('~') : '';
      return [v.tur ?? '', v.savol ?? '', variantlar, v.javob ?? ''].join('#');
    })
    .join('|');

  return [
    String(body.mavzu ?? ''),
    `kun:${String(body.kun ?? '')}`,
    `nazariya:${String(body.nazariya ?? '')}`,
    vaz,
  ].join('|');
}

/**
 * Kalit uchun matnni normallashtiradi.
 *
 * "«Он» va «она» farqi?" va "он va она farqi" bitta savol — registr, tinish
 * belgisi va ortiqcha bo'shliq farq qilmasligi kerak, aks holda kesh deyarli
 * hech qachon mos kelmasdi.
 */
function normalla(matn: string): string {
  return matn
    .toLowerCase()
    .replace(/[«»""''`.,!?;:()\[\]{}\-—–_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    // Kalit bo'laklari "|" bilan ajratiladi. Tinish belgisi olib tashlangach
    // ajratuvchi yonida bo'shliq qolishi mumkin ("mavzu| on" va "mavzu|on"),
    // shunda bir xil savol ikki xil kalit berardi.
    .replace(/\s*\|\s*/g, '|')
    .trim();
}

function kalitYasa(tur: KeshTuri, manba: string): string {
  const hash = createHash('sha256').update(normalla(manba)).digest('hex').slice(0, 40);
  return `${tur}:${KESH_VERSIYA}:${hash}`;
}

/**
 * Keshdan javob oladi. Topilmasa yoki eskirgan bo'lsa `null`.
 *
 * Topilganda ishlatilish hisobi oshiriladi — qaysi savollar ko'p
 * so'ralayotganini keyin ko'rish mumkin.
 */
export async function keshOl<T>(tur: KeshTuri, manba: string): Promise<T | null> {
  if (!pool) return null;
  try {
    const kalit = kalitYasa(tur, manba);
    const { rows } = await pool.query<{ javob: T }>(
      `UPDATE ustoz_javob_keshi
          SET ishlatilgan_soni = ishlatilgan_soni + 1,
              oxirgi_ishlatilgan = now()
        WHERE kalit = $1
          AND yaratildi > now() - ($2 || ' days')::interval
      RETURNING javob`,
      [kalit, String(YAROQLILIK_KUN)],
    );
    return rows[0]?.javob ?? null;
  } catch (err) {
    // Kesh nosozligi darsni to'xtatmasligi kerak — modeldan so'raymiz.
    console.error('[ustozKesh] o\'qib bo\'lmadi:', (err as Error).message);
    return null;
  }
}

/** Javobni keshga yozadi. Xatolik bo'lsa jim o'tadi — javob baribir berilgan. */
export async function keshYoz(tur: KeshTuri, manba: string, javob: unknown): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO ustoz_javob_keshi (kalit, tur, manba_matn, javob)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (kalit) DO UPDATE
             SET javob = EXCLUDED.javob,
                 yaratildi = now(),
                 oxirgi_ishlatilgan = now()`,
      [kalitYasa(tur, manba), tur, manba.slice(0, 2000), JSON.stringify(javob)],
    );
  } catch (err) {
    console.error('[ustozKesh] yozib bo\'lmadi:', (err as Error).message);
  }
}
