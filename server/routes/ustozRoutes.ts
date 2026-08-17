/**
 * ustozRoutes.ts — "Ustozdan so'ra" va "Doska" marshrutlari.
 *
 * POST /api/ustoz/oqish — o'quvchi ovoz bilan o'qigan rus gapini baholaydi
 * va o'sha gapning grammatikasini tushuntiradi.
 * POST /api/ustoz/dars  — kun mavzusi bo'yicha doskada jonli dars tayyorlaydi.
 * POST /api/ustoz/savol — dars davomida berilgan savolga javob beradi.
 * POST /api/ustoz/mashq — mavzu bo'yicha qo'shimcha grammatika mashqi tuzadi.
 * POST /api/ustoz/suhbat — o'quvchining OG'ZAKI javobini baholaydi.
 */
import { Router } from 'express';
import { enforceRateLimit } from '../lib/rateLimit.js';
import {
  evaluateReading,
  isUstozConfigured,
} from '../services/ustozReading.service.js';
import { kvotaOl, kvotaHolati, kvotaXabari, KVOTA_SONI } from '../services/ustozKvota.service.js';
import {
  darsKeshKaliti,
  keshOl,
  keshYoz,
  type KeshTuri,
} from '../services/ustozKesh.service.js';
import { speak } from '../services/tts.service.js';
import { darsNutqRejasi } from '../../shared/nutqBolaklari.js';
import {
  answerQuestion,
  buildExercise,
  buildLesson,
  evaluateAnswer,
  transcribeSpeech,
  type DoskaVazifa,
} from '../services/ustozDoska.service.js';

/** Base64 audio uchun chegara: 5MB ~ 1 daqiqalik webm yozuv. */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/** Doska ovozining tezligi — klientdagi `NUTQ_TEZLIGI` bilan bir xil bo'lishi
 *  shart, aks holda kesh kaliti mos kelmaydi. */
const DOSKA_NUTQ_TEZLIGI = 1;

/**
 * DARSNING BARCHA BOSQICHLARI OVOZINI OLDINDAN TAYYORLAYDI.
 *
 * Ilgari faqat birinchi bosqichning dastlabki 190 belgisi qizdirilardi va u
 * ham `slice` bilan kesilardi — klient esa matnni GAPLAR bo'yicha bo'ladi,
 * ya'ni kalit hech qachon mos kelmasdi. Natijada qizdirish bekorga ketib,
 * ustiga Speechify'ning yagona ulanish o'rnini band qilardi: klient 429 olib,
 * manba 2 daqiqaga o'chardi va ovoz sekin zaxira yo'llarga tushardi.
 *
 * Endi bo'laklar `shared/nutqBolaklari` orqali AYNAN klientdagidek tuziladi.
 * Ketma-ket (parallel emas) tayyorlanadi: Speechify tarifi bir vaqtda bitta
 * so'rovga ruxsat beradi, parallel yuborsak yana 429 bo'lardi.
 */
function ovozniQizdir(dars: unknown): void {
  const bosqichlar = (
    dars as {
      bosqichlar?: Array<{
        tushuntirish?: string;
        qoida?: string;
        misollar?: Array<{ ru?: string; uz?: string }>;
      }>;
    }
  )?.bosqichlar;
  if (!Array.isArray(bosqichlar) || !bosqichlar.length) return;

  const bolaklar = bosqichlar.flatMap((b) => darsNutqRejasi(b).map((q) => q.matn));
  if (!bolaklar.length) return;

  void (async () => {
    for (const bolak of bolaklar) {
      try {
        await speak(bolak, { ohang: 'ustoz', speed: DOSKA_NUTQ_TEZLIGI, fon: true });
      } catch {
        // Qizdirish — qulaylik, majburiyat emas. Bittasi chiqmasa qolganini
        // davom ettiramiz: o'quvchi baribir o'sha bo'lakni so'raganda
        // qaytadan urinib ko'riladi.
      }
    }
  })();
}

export function createUstozRoutes(
  authenticate: (req: any, res: any, next: any) => void,
): Router {
  const router = Router();

  router.post('/ustoz/oqish', authenticate, async (req: any, res: any) => {
    try {
      const userId = req.userId as number;
      // Har chaqiruv AI'ga pul turadi — daqiqasiga 15 ta yetarli.
      if (!(await enforceRateLimit(res, `ustoz:oqish:${userId}`, 15, 60))) return;

      if (!isUstozConfigured()) {
        return res.status(503).json({
          error: "Ustoz hozir ishlamayapti, mashqlarni davom ettiring",
        });
      }

      const referenceText = String(req.body?.referenceText ?? '').trim();
      const referenceUz = String(req.body?.referenceUz ?? '').trim();
      const audioBase64 = String(req.body?.audio ?? '');
      const mimeType = String(req.body?.mimeType ?? 'audio/webm').trim() || 'audio/webm';

      if (!referenceText) return res.status(400).json({ error: 'Etalon matn topilmadi' });
      if (!audioBase64) return res.status(400).json({ error: 'Ovoz yozuvi kerak' });

      // Base64 uzunligidan asl hajmni chamalaymiz — Buffer yaratmasdan oldin.
      if (audioBase64.length * 0.75 > MAX_AUDIO_BYTES) {
        return res.status(400).json({ error: "Yozuv juda uzun (maksimum 1 daqiqa)" });
      }

      const natija = await evaluateReading({
        referenceText: referenceText.slice(0, 600),
        referenceUz: referenceUz.slice(0, 600) || undefined,
        audioBase64,
        mimeType,
      });
      res.json(natija);
    } catch (err) {
      console.error('[POST /api/ustoz/oqish]', err);
      const { openAIUserFacingError } = await import('../lib/openai.js');
      res.status(500).json({ error: openAIUserFacingError(err) });
    }
  });

  /** Doska marshrutlari uchun umumiy o'ram: sozlama, limit va xatolik bir xil. */
  const doskaRoute = (
    path: string,
    limit: number,
    handler: (body: Record<string, unknown>) => Promise<unknown>,
    /**
     * Ustoz bilan ERKIN suhbatmi. Shunday bo'lsa foydalanuvchi kvotasidan
     * hisoblanadi (20 ta so'rov, so'ng 5 soat tanaffus). Dars tushuntirish
     * va mashqlar bunga kirmaydi.
     */
    suhbatmi = false,
    /**
     * Javobni umumiy keshda saqlash uchun kalit tuzuvchi. Berilmasa
     * keshlanmaydi (masalan og'zaki javobni baholash — u shaxsiy).
     */
    kesh?: { tur: KeshTuri; kalit: (body: Record<string, unknown>) => string },
    /**
     * Javob yuborilgandan KEYIN bajariladigan ish (ovozni qizdirish).
     *
     * Keshdan kelgan darsda ham chaqiriladi: dars matni keshda bo'lsa ham
     * uning ovozi hali tayyorlanmagan bo'lishi mumkin — aynan shu holat
     * "1-kun ishlaydi, qolganlari sekin" degan shikoyatning sababi edi.
     */
    keyin?: (natija: unknown) => void,
  ) => {
    router.post(path, authenticate, async (req: any, res: any) => {
      try {
        const userId = req.userId as number;
        if (!(await enforceRateLimit(res, `ustoz:${path}:${userId}`, limit, 60))) return;

        const body = (req.body ?? {}) as Record<string, unknown>;
        const keshKaliti = kesh ? kesh.kalit(body) : '';

        // KESH BIRINCHI, KVOTADAN OLDIN.
        //
        // Keshdan kelgan javobga token sarflanmaydi, shuning uchun uni
        // o'quvchining suhbat kvotasidan ayirish noto'g'ri bo'lardi —
        // cheklovning maqsadi aynan token sarfini ushlab turish.
        if (kesh && keshKaliti) {
          const saqlangan = await keshOl<unknown>(kesh.tur, keshKaliti);
          if (saqlangan) {
            res.setHeader('X-Ustoz-Cache', 'hit');
            res.json(saqlangan);
            keyin?.(saqlangan);
            return;
          }
        }
        res.setHeader('X-Ustoz-Cache', 'miss');

        if (suhbatmi) {
          const kvota = await kvotaOl(userId);
          res.setHeader('X-Ustoz-Quota-Remaining', String(kvota.qolgan));
          if (!kvota.ruxsat) {
            return res.status(429).json({
              error: kvotaXabari(kvota.kutish),
              retry_after: kvota.kutish,
              kvota_tugadi: true,
            });
          }
        }

        if (!isUstozConfigured()) {
          return res.status(503).json({
            error: "Ustoz hozir ishlamayapti, mashqlarni davom ettiring",
          });
        }

        const natija = await handler(body);
        if (kesh && keshKaliti) void keshYoz(kesh.tur, keshKaliti, natija);
        res.json(natija);
        keyin?.(natija);
      } catch (err) {
        console.error(`[POST /api/ustoz${path.replace('/ustoz', '')}]`, err);
        const status = (err as { status?: number }).status;
        if (status === 400 || status === 502) {
          return res.status(status).json({ error: (err as Error).message });
        }
        const { openAIUserFacingError } = await import('../lib/openai.js');
        res.status(500).json({ error: openAIUserFacingError(err) });
      }
    });
  };

  /** Dars generatsiyasi qimmat — daqiqasiga 6 ta yetarli. */
  doskaRoute('/ustoz/dars', 6, async (body) => {
    const mavzu = String(body.mavzu ?? '').trim();
    if (!mavzu) {
      throw Object.assign(new Error('Dars mavzusi topilmadi'), { status: 400 });
    }

    // Kunning vazifalari — klient yuboradi, biz shaklini tekshirib olamiz.
    const vazifalar = Array.isArray(body.vazifalar)
      ? body.vazifalar
          .slice(0, 10)
          .map((raw) => {
            if (!raw || typeof raw !== 'object') return null;
            const v = raw as Record<string, unknown>;
            const savol = String(v.savol ?? '').trim().slice(0, 400);
            if (!savol) return null;
            const tur: DoskaVazifa['tur'] =
              v.tur === 'gap' || v.tur === 'moslash' ? v.tur : 'test';
            const variantlar = Array.isArray(v.variantlar)
              ? v.variantlar.map((x) => String(x).slice(0, 160)).filter(Boolean).slice(0, 8)
              : undefined;
            const javob = String(v.javob ?? '').trim().slice(0, 300) || undefined;
            return { tur, savol, variantlar, javob };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null)
      : undefined;

    const dars = await buildLesson({
      mavzu: mavzu.slice(0, 200),
      nazariya: String(body.nazariya ?? '').trim() || undefined,
      kun: Number(body.kun) || undefined,
      vazifalar,
    });

    return dars;
  }, false, {
    // Bir kunning darsi barcha o'quvchilarda bir xil materialdan quriladi,
    // shuning uchun birinchi o'quvchi uchun tayyorlangan dars qolganlariga
    // ham to'g'ri keladi. Bu eng katta tejamkorlik: bitta dars 5-6 bosqich
    // va o'nlab misol degani.
    // Kalit kunning BUTUN materialidan tuziladi (nazariya ham kiradi), shuning
    // uchun darslik SQL bilan tahrirlansa AI o'zi yangi darsni tayyorlaydi.
    tur: 'dars',
    kalit: darsKeshKaliti,
  }, ovozniQizdir);

  doskaRoute('/ustoz/savol', 15, async (body) => {
    const savol = String(body.savol ?? '').trim();
    const mavzu = String(body.mavzu ?? '').trim();
    if (!savol) throw Object.assign(new Error('Savol yozilmadi'), { status: 400 });
    return answerQuestion({
      savol: savol.slice(0, 500),
      mavzu: mavzu.slice(0, 200) || 'Rus tili',
      bosqich: String(body.bosqich ?? '').trim().slice(0, 200) || undefined,
    });
  }, true, {
    // Savol matni MAVZU bilan birga kalitga kiradi: bir xil savol boshqa
    // mavzuda boshqacha javob talab qiladi.
    tur: 'savol',
    kalit: (b) => `${String(b.mavzu ?? '')}|${String(b.savol ?? '')}`,
  });

  /** Doskadagi og'zaki suhbat: ovoz -> matn -> ustoz bahosi. */
  doskaRoute('/ustoz/suhbat', 20, async (body) => {
    const savol = String(body.savol ?? '').trim();
    const mavzu = String(body.mavzu ?? '').trim() || 'Rus tili';
    if (!savol) throw Object.assign(new Error('Savol topilmadi'), { status: 400 });

    // Javob matn bilan ham, ovoz bilan ham kelishi mumkin.
    let javob = String(body.javob ?? '').trim();
    if (!javob) {
      const audio = String(body.audio ?? '');
      if (!audio) throw Object.assign(new Error('Javob yozilmadi'), { status: 400 });
      if (audio.length * 0.75 > MAX_AUDIO_BYTES) {
        throw Object.assign(new Error("Yozuv juda uzun (maksimum 1 daqiqa)"), { status: 400 });
      }
      javob = await transcribeSpeech(audio, String(body.mimeType ?? 'audio/webm'));
      if (!javob) {
        return { transcript: '', baho: 'qisman', izoh: "Ovoz eshitilmadi. Yana bir marta ayting.", namuna: '' };
      }
    }

    const baho = await evaluateAnswer({ savol: savol.slice(0, 300), javob, mavzu: mavzu.slice(0, 200) });
    return { transcript: javob, ...baho };
  }, true);

  doskaRoute('/ustoz/mashq', 6, async (body) => {
    const mavzu = String(body.mavzu ?? '').trim();
    if (!mavzu) throw Object.assign(new Error('Mavzu topilmadi'), { status: 400 });
    return buildExercise({
      mavzu: mavzu.slice(0, 200),
      nazariya: String(body.nazariya ?? '').trim() || undefined,
      soni: Number(body.soni) || undefined,
    });
  });

  /** Qolgan suhbat kvotasi — ekranda ko'rsatish uchun, kvotani sarflamaydi. */
  router.get('/ustoz/kvota', authenticate, async (req: any, res: any) => {
    const holat = await kvotaHolati(req.userId as number);
    res.json({
      qolgan: holat.qolgan,
      jami: KVOTA_SONI,
      kutish: holat.kutish,
      ruxsat: holat.ruxsat,
    });
  });

  return router;
}
