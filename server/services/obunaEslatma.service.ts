/**
 * obunaEslatma.service.ts — obuna tugashi haqida eslatma.
 *
 * NEGA AVTO-TO'LOV EMAS: odam kursni tugatgan yoki davom ettirmaslikka
 * qaror qilgan bo'lishi mumkin. Kartadan so'roqsiz pul yechish o'rniga
 * unga "muddat tugayapti, davom etmoqchi bo'lsangiz to'lang" deb aytamiz —
 * qaror o'zida qoladi.
 *
 * IKKI KANAL:
 *   1. Ilova ichida — `getAccessInfo` javobidagi `subscription_expires_at`
 *      asosida banner. Hamma ko'radi, hech qanday sozlama talab qilmaydi.
 *   2. Push — ilova yopiq bo'lsa ham keladi, lekin faqat obuna bo'lganlarga
 *      (hozir ~195 kishi). Shu fayl aynan shuni yuboradi.
 *
 * QACHON: muddat tugashiga 7, 3 va 1 kun qolganda hamda tugagan kuni.
 * Har biri BIR MARTA — `obuna_eslatma` jadvalidagi UNIQUE cheklov buni
 * bazaning o'zida kafolatlaydi (kod ikki marta chaqirilsa ham takror ketmaydi).
 */
import { pool } from '../lib/db.js';
import { foydalanuvchigaYubor, pushSozlanganmi } from './push.service.js';

export type EslatmaTuri = 'kun_7' | 'kun_3' | 'kun_1' | 'tugadi';

type Nomzod = {
  user_id: number;
  first_name: string | null;
  muddat_tugashi: string;
  qolgan_kun: number;
};

/** Qaysi kunlarda eslatma ketadi. `0` — tugagan kuni. */
const ESLATMA_KUNLARI: ReadonlyArray<{ kun: number; tur: EslatmaTuri }> = [
  { kun: 7, tur: 'kun_7' },
  { kun: 3, tur: 'kun_3' },
  { kun: 1, tur: 'kun_1' },
  { kun: 0, tur: 'tugadi' },
];

function xabarMatni(tur: EslatmaTuri, ism: string | null): { title: string; body: string } {
  const murojaat = ism?.trim() ? `${ism.trim()}, ` : '';
  switch (tur) {
    case 'kun_7':
      return {
        title: 'Obunangiz 1 hafta ichida tugaydi',
        body: `${murojaat}darslaringiz uzilib qolmasligi uchun obunani yangilab qo'ying.`,
      };
    case 'kun_3':
      return {
        title: 'Obunangizga 3 kun qoldi',
        body: `${murojaat}davom etmoqchi bo'lsangiz, obunani yangilang.`,
      };
    case 'kun_1':
      return {
        title: 'Obunangiz ertaga tugaydi',
        body: `${murojaat}ertadan keyin darslar yopiladi. Davom etish uchun to'lovni amalga oshiring.`,
      };
    case 'tugadi':
      return {
        title: 'Obunangiz tugadi',
        body: `${murojaat}darslarni davom ettirish uchun obunani yangilang. Progressingiz saqlanib turibdi.`,
      };
  }
}

/**
 * Bitta kun uchun nomzodlarni topadi.
 *
 * Sana bo'yicha solishtiramiz (soat emas): odam ertalab ham, kechqurun ham
 * kirsa bir xil natija bo'lsin. Vaqt zonasi — `Asia/Tashkent`, chunki
 * "ertaga tugaydi" degan gap foydalanuvchining kuni bo'yicha aytiladi.
 */
async function nomzodlar(qolganKun: number): Promise<Nomzod[]> {
  if (!pool) return [];
  const { rows } = await pool.query<Nomzod>(
    `SELECT s.user_id,
            u.first_name,
            s.expires_at::text AS muddat_tugashi,
            $1::int             AS qolgan_kun
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
      WHERE s.status = 'active'
        AND (s.expires_at AT TIME ZONE 'Asia/Tashkent')::date
            = ((now() AT TIME ZONE 'Asia/Tashkent')::date + $1::int)
        -- Shu foydalanuvchida keyinroq tugaydigan boshqa obuna bo'lmasin
        -- (uzaytirgan bo'lsa eslatma keraksiz).
        AND NOT EXISTS (
              SELECT 1 FROM subscriptions s2
               WHERE s2.user_id = s.user_id
                 AND s2.expires_at > s.expires_at
            )
        AND NOT EXISTS (
              SELECT 1 FROM obuna_eslatma e
               WHERE e.user_id = s.user_id
                 AND e.tur = $2
                 AND e.muddat_tugashi = s.expires_at
            )`,
    [qolganKun, ESLATMA_KUNLARI.find((k) => k.kun === qolganKun)?.tur ?? 'tugadi'],
  );
  return rows;
}

/**
 * Eslatmalarni yuboradi.
 *
 * `quruq` (dry-run) rejimida hech narsa yuborilmaydi va yozilmaydi — faqat
 * kim eslatma olishi ko'rsatiladi. Birinchi ishga tushirishdan oldin shu
 * bilan tekshiring.
 */
export async function runObunaEslatmaCron(
  opts: { quruq?: boolean } = {},
): Promise<{ tekshirildi: number; yuborildi: number; pushsiz: number; quruq: boolean }> {
  const quruq = Boolean(opts.quruq);
  if (!pool) return { tekshirildi: 0, yuborildi: 0, pushsiz: 0, quruq };

  let tekshirildi = 0;
  let yuborildi = 0;
  let pushsiz = 0;
  const pushBor = pushSozlanganmi();

  for (const { kun, tur } of ESLATMA_KUNLARI) {
    const royxat = await nomzodlar(kun);
    tekshirildi += royxat.length;

    for (const n of royxat) {
      if (quruq) {
        console.log(`[obuna-eslatma][quruq] user=${n.user_id} tur=${tur} tugashi=${n.muddat_tugashi}`);
        continue;
      }
      const xabar = xabarMatni(tur, n.first_name);
      let qurilma = 0;
      if (pushBor) {
        try {
          const natija = await foydalanuvchigaYubor(n.user_id, {
            ...xabar,
            url: '/tariflar',
            // Bir xil tag — eski eslatma yangisi bilan almashadi, ekran to'lmaydi.
            tag: 'obuna-eslatma',
          });
          qurilma = natija.yuborildi;
        } catch (e) {
          console.error('[obuna-eslatma] push', n.user_id, e);
        }
      }
      if (qurilma === 0) pushsiz += 1;

      /*
       * Push ketmagan bo'lsa ham yozib qo'yamiz: yozuv "bu davr uchun
       * eslatma ishlov berildi" degani. Aks holda push obunasi yo'q odam
       * uchun har kuni qayta urinilardi. U ilova ichidagi bannerni
       * baribir ko'radi.
       */
      try {
        await pool.query(
          `INSERT INTO obuna_eslatma (user_id, tur, muddat_tugashi, qurilma_soni)
                VALUES ($1, $2, $3::timestamptz, $4)
           ON CONFLICT (user_id, tur, muddat_tugashi) DO NOTHING`,
          [n.user_id, tur, n.muddat_tugashi, qurilma],
        );
        yuborildi += 1;
      } catch (e) {
        console.error('[obuna-eslatma] yozuv', n.user_id, e);
      }
    }
  }

  return { tekshirildi, yuborildi, pushsiz, quruq };
}
