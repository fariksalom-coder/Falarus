/**
 * darslarniTayyorla.ts — 182 kunning DOSKA DARSINI oldindan tayyorlaydi.
 *
 * NIMA UCHUN: dars birinchi ochilganda AI'dan so'raladi va bu 10-25 soniya.
 * O'quvchi shu vaqt jim ekranga qarab turadi. Kesh esa UMUMIY: bir kunning
 * darsi barcha o'quvchilarga bir xil materialdan quriladi. Ya'ni darsni bir
 * marta oldindan tayyorlab qo'ysak, 182 kunning hammasi hamma uchun DARHOL
 * ochiladi.
 *
 * ENG MUHIM JOYI — KESH KALITI.
 * Kalit `mavzu | kun | nazariya | vazifalar` dan tuziladi va vazifalar
 * ro'yxatini KLIENT yuboradi (`DailyKunSectionPage` dagi `doskaVazifalar`).
 * Shuning uchun bu skript o'sha tanlovni AYNAN takrorlaydi: 2 ta qoida testi,
 * 1 ta gap testi, 1 ta gap tuzish va 4 juftlik. Bir dona farq bo'lsa kalit
 * boshqa chiqadi va tayyorlangan dars hech qachon ishlatilmaydi (bu xato
 * ilgari TTS qizdirishida bo'lgan — o'sha tuzoqni takrorlamaymiz).
 *
 * Ishga tushirish (serverda, AI kaliti bor joyda):
 *   npx tsx scripts/oneoff/darslarniTayyorla.ts            # hammasi
 *   npx tsx scripts/oneoff/darslarniTayyorla.ts 1 30       # 1-30 kun
 *
 * Qayta ishga tushirsa bo'ladi: keshda bori o'tkazib yuboriladi.
 */
import 'dotenv/config';
import { createPostgresFacade } from '../../server/lib/postgresFacade.js';
import { pool } from '../../server/lib/db.js';
import { fetchDailyCourseDayBundle } from '../../server/services/dailyCourseBundle.service.js';
import { buildLesson, type DoskaVazifa } from '../../server/services/ustozDoska.service.js';
import { darsKeshKaliti, keshOl, keshYoz } from '../../server/services/ustozKesh.service.js';

/** Bir vaqtda nechta dars tayyorlanadi — AI chegarasiga urilmaslik uchun. */
const OQIM = Number(process.env.DARS_OQIM || 3);

type Bundle = Awaited<ReturnType<typeof fetchDailyCourseDayBundle>>;

/**
 * KLIENTDAGI `doskaVazifalar` NING AYNI NUSXASI.
 * `src/pages/DailyKunSectionPage.tsx` dagi tartib bilan bir xil bo'lishi shart.
 */
function doskaVazifalari(g: {
  ruleMcqs: Array<{ questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number }>;
  sentenceMcqs: Array<{ questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number }>;
  sentenceArrange: Array<{ promptText: string; wordBank: string[]; answerRu: string }>;
  matchSets: Array<{ pairs: Array<{ left: string; right: string }> }>;
}): DoskaVazifa[] {
  const out: DoskaVazifa[] = [];

  const mcqToVazifa = (m: {
    questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number;
  }): DoskaVazifa => {
    const variantlar = [m.optionA, m.optionB, m.optionC, m.optionD]
      .map((o) => String(o ?? '').trim())
      .filter(Boolean);
    return {
      tur: 'test',
      savol: String(m.questionText ?? '').trim(),
      variantlar,
      javob: variantlar[m.correctIndex] ?? undefined,
    };
  };

  for (const m of g.ruleMcqs.slice(0, 2)) out.push(mcqToVazifa(m));
  for (const m of g.sentenceMcqs.slice(0, 1)) out.push(mcqToVazifa(m));

  for (const s of g.sentenceArrange.slice(0, 1)) {
    out.push({
      tur: 'gap',
      savol: String(s.promptText ?? '').trim(),
      variantlar: Array.isArray(s.wordBank) ? s.wordBank.map(String) : undefined,
      javob: String(s.answerRu ?? '').trim() || undefined,
    });
  }

  const pairs = g.matchSets.flatMap((s) => s.pairs).slice(0, 4);
  if (pairs.length > 0) {
    out.push({
      tur: 'moslash',
      savol: `Juftlarni moslashtiring: ${pairs.map((p) => `${p.left} — ${p.right}`).join('; ')}`,
    });
  }

  return out.filter((v) => v.savol);
}

async function kunniTayyorla(sb: ReturnType<typeof createPostgresFacade>, kun: number) {
  const res: Bundle = await fetchDailyCourseDayBundle(sb, kun);
  if (!res.ok) return { kun, holat: 'material yo\'q' as const };

  const g = res.bundle.grammar;
  if (!g?.topic?.title) return { kun, holat: 'mavzu yo\'q' as const };

  const body = {
    mavzu: g.topic.title,
    nazariya: g.topic.theoryText || undefined,
    kun,
    vazifalar: doskaVazifalari(g),
  };

  const kalit = darsKeshKaliti(body as unknown as Record<string, unknown>);
  const bor = await keshOl<{ bosqichlar?: unknown[] }>('dars', kalit);
  if (bor) return { kun, holat: 'keshda bor' as const };

  const dars = await buildLesson(body);
  await keshYoz('dars', kalit, dars);

  const jadval = dars.bosqichlar.filter((b) => b.taqqoslash).length;
  const xato = dars.bosqichlar.filter((b) => b.xato).length;
  return {
    kun,
    holat: 'tayyorlandi' as const,
    bosqich: dars.bosqichlar.length,
    jadval,
    xato,
    kalitSavol: dars.kalitSavol,
  };
}

async function main(): Promise<void> {
  const boshlanish = Number(process.argv[2] || 1);
  const tugash = Number(process.argv[3] || 182);
  const sb = createPostgresFacade(pool);

  const kunlar = [];
  for (let k = boshlanish; k <= tugash; k += 1) kunlar.push(k);

  const hisob = { tayyorlandi: 0, keshda: 0, jadval: 0, xato: 0, otkazildi: 0, xatolik: 0 };
  let navbat = 0;

  async function ishchi(): Promise<void> {
    for (;;) {
      const i = navbat;
      navbat += 1;
      const kun = kunlar[i];
      if (kun === undefined) return;
      try {
        const n = await kunniTayyorla(sb, kun);
        if (n.holat === 'tayyorlandi') {
          hisob.tayyorlandi += 1;
          hisob.jadval += n.jadval ?? 0;
          hisob.xato += n.xato ?? 0;
          console.log(
            `${String(kun).padStart(3)} ✓ ${n.bosqich} bosqich, ${n.jadval} jadval, ${n.xato} xato · ${n.kalitSavol}`,
          );
        } else if (n.holat === 'keshda bor') {
          hisob.keshda += 1;
          console.log(`${String(kun).padStart(3)} · keshda bor`);
        } else {
          hisob.otkazildi += 1;
          console.log(`${String(kun).padStart(3)} — ${n.holat}`);
        }
      } catch (err) {
        hisob.xatolik += 1;
        console.error(`${String(kun).padStart(3)} ✗ ${(err as Error).message.slice(0, 120)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: OQIM }, () => ishchi()));
  console.log('\nNATIJA:', JSON.stringify(hisob, null, 2));
  await pool.end();
}

void main();
