import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { DoskaBosqich } from '../../api/ustozDoska';
import { doskaSatrlari } from '../../../shared/nutqBolaklari';
import UstozAvatar from './UstozAvatar';
import DoskaIkonka, { AyriChiziq } from './doskaIkonkalari';

/**
 * DARS SLAYDI — ustoz tushuntirayotgan sahna.
 *
 * Ilgari bu yerda yog'och ramkali yashil doska turardi: sinf xonasiga
 * o'xshardi, lekin telefon ekranida matn mayda, kontrast past va hamma satr
 * bir xil ko'rinardi. Endi sahna zamonaviy taqdimot slaydi ko'rinishida —
 * mos yozuvlar `dars-1-vizual.html` (to'q ko'k-yashil fon, shisha kartochkalar,
 * amber/aqua/mint urg'ular, katta sarlavha shrifti). Har satr TURIGA qarab
 * o'z shaklini oladi, shuning uchun o'quvchi qoidani, misolni va xatoni
 * o'qimasdan, KO'RISH bilan ajratadi.
 *
 * Matn ovoz bilan bir vaqtda ochiladi: ustoz o'qiyotgan satr ajralib turadi,
 * hali aytilmagani xiraroq (lekin YASHIRILMAYDI — ovozsiz holatda ham slayd
 * to'liq o'qiladigan bo'lishi kerak).
 */

type Props = {
  bosqich: DoskaBosqich;
  /** Ovoz chalinyaptimi — ustoz videosi shunda yuradi. */
  speaking: boolean;
  /** Ovoz serverda tayyorlanmoqda (birinchi bo'lak kutilmoqda). */
  loading?: boolean;
  /**
   * KUNNING KALIT SAVOLI — «КОМУ? — Kimga?».
   *
   * Sarlavha ostida, dars oxirigacha turadi va bosqich almashganda ham
   * o'chmaydi: o'quvchi har doim «bugun nimaga javob berayapmiz» degan
   * savolni ko'z oldida saqlaydi. Ovozda o'qilmaydi, shuning uchun satr
   * raqami yo'q — xiralashmaydi ham.
   */
  kalitSavol?: string;
  /**
   * OVOZ BILAN MOSLASH (0 — sarlavha, 1 — qoida, 2+ — misollar).
   *
   * `ochiqSatr` — shu satrgacha ustoz aytib bo'lgan; keyingilari xiraroq
   * turadi. `faolSatr` — ayni damda o'qilayotgani, u ajratib ko'rsatiladi.
   */
  ochiqSatr?: number;
  faolSatr?: number;
  /**
   * TO'LIQ EKRAN rejimi.
   *
   * Doska butun ekranni egallaydi: burchaklar tekislanadi, balandlik
   * cheklanmaydi va yuqoridagi belgilar qatori CHIZILMAYDI — uni chaqiruvchi
   * (`UstozDoska`) o'z boshqaruv tugmalari bilan birga bitta qatorda beradi,
   * aks holda ekranning tepasida ikkita qator ustma-ust tushardi.
   */
  toliq?: boolean;
};

/**
 * SLAYD PALITRASI — mos yozuvlar faylidan aynan ko'chirildi.
 *
 * Ilovaning umumiy (oq fon, ko'k) tizimidan ataylab farq qiladi: dars
 * tushuntirilayotgan payt alohida muhit, kinodagi qorong'ilashtirilgan zal
 * kabi — ekranda faqat ustozning fikri qoladi.
 */
const R = {
  fg: 'rgba(237,244,244,0.96)',
  fg2: 'rgba(237,244,244,0.76)',
  muted: 'rgba(237,244,244,0.48)',
  accent: '#F0B963',
  aqua: '#6FC7C9',
  mint: '#56CC97',
  dust: '#8FA0AB',
  line: 'rgba(255,255,255,0.12)',
  glass: 'linear-gradient(160deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))',
} as const;

const SAHNA_FON =
  'radial-gradient(115% 62% at 86% 2%, rgba(240,185,99,.16), transparent 62%),' +
  'radial-gradient(105% 60% at 4% 98%, rgba(111,199,201,.20), transparent 64%),' +
  'radial-gradient(85% 50% at 50% 48%, rgba(41,110,120,.20), transparent 72%),' +
  'linear-gradient(168deg,#0E2830 0%,#0B1F26 55%,#081419 100%)';

/** Fondagi bilinar-bilinmas to'r — sahnaga chuqurlik beradi. */
const TOR_FON =
  'linear-gradient(to right,rgba(255,255,255,.03) 1px,transparent 1px),' +
  'linear-gradient(to bottom,rgba(255,255,255,.03) 1px,transparent 1px)';
const TOR_MASK = 'radial-gradient(120% 90% at 50% 40%,#000 35%,transparent 100%)';

/**
 * Sarlavhadagi «qo'shtirnoq» ichidagi qism amber rangda ajratiladi.
 *
 * Mos yozuvlarda har slayd sarlavhasining bir bo'lagi rangli («Bitta *u* —
 * ikkita so'z»). Sarlavha modeldan keladi, shuning uchun qaysi so'zni
 * bo'yashni TAXMIN QILMAYMIZ — faqat muallif o'zi «...» bilan ajratgan
 * joyni bo'yaymiz. Ajratilmagan bo'lsa sarlavha bir xil oq bo'lib qoladi.
 */
function sarlavhaBolaklari(matn: string): Array<{ t: string; urgu: boolean }> {
  const out: Array<{ t: string; urgu: boolean }> = [];
  const re = /[«"']([^«»"']+)[»"']/g;
  let oxir = 0;
  for (let m = re.exec(matn); m; m = re.exec(matn)) {
    if (m.index > oxir) out.push({ t: matn.slice(oxir, m.index), urgu: false });
    out.push({ t: m[1], urgu: true });
    oxir = m.index + m[0].length;
  }
  if (oxir < matn.length) out.push({ t: matn.slice(oxir), urgu: false });
  return out.length ? out : [{ t: matn, urgu: false }];
}

export default function UstozDoskaSahna({
  bosqich,
  speaking,
  loading = false,
  kalitSavol,
  ochiqSatr = Number.MAX_SAFE_INTEGER,
  faolSatr = -1,
  toliq = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  /*
   * SATRLAR — ovoz rejasi bilan BITTA manbadan (`doskaSatrlari`).
   * Shuning uchun ustoz aytadigan har bir narsa slaydda bor va tartibi ham
   * bir xil.
   */
  const satrlar = doskaSatrlari(bosqich);

  const sarlavha = useMemo(() => sarlavhaBolaklari(bosqich.sarlavha ?? ''), [bosqich.sarlavha]);

  /*
   * KETMA-KET USTUNLAR BITTA QATORGA YIG'ILADI.
   *
   * `doskaSatrlari` tekis ro'yxat qaytaradi (ovoz raqamlari buzilmasligi
   * uchun), taqqoslash esa YONMA-YON turgandagina ish beradi — farq aynan
   * shunda ko'rinadi. Shuning uchun chizishdan oldin qo'shni `ustun`lar
   * bitta guruhga olinadi; ularning satr raqami o'zgarmaydi.
   */
  const guruhlar = useMemo(() => {
    type Guruh =
      | { tur: 'oddiy'; i: number }
      | { tur: 'ustunlar'; indekslar: number[] }
      | { tur: 'torMisol'; indekslar: number[] };
    const out: Guruh[] = [];

    /*
     * QISQA MISOLLAR TO'R BO'LIB CHIZILADI.
     *
     * «Я — Men», «Ты — Sen» kabi bir so'zlik misollar ko'p bo'lganda (7 ta
     * olmosh) har biriga butun eni bo'yicha kartochka berilsa, bitta bosqich
     * uzun ro'yxatga aylanib ketadi va telefonда aylantirib chiqish kerak
     * bo'ladi. Qisqalari ikki ustunga yig'iladi — mos yozuvlardagi olmoshlar
     * to'ri shunday.
     */
    const qisqaMisol = (i: number) => {
      const q = satrlar[i];
      return q.tur === 'misol' && q.ru.length <= 14 && (q.uz?.length ?? 0) <= 24;
    };
    const torBoshi = (i: number) => {
      let n = 0;
      while (i + n < satrlar.length && qisqaMisol(i + n)) n += 1;
      return n >= 4;
    };
    let torda = false;

    satrlar.forEach((q, i) => {
      const oxirgi = out[out.length - 1];

      if (q.tur === 'misol' && (torda || torBoshi(i)) && qisqaMisol(i)) {
        torda = true;
        if (oxirgi?.tur === 'torMisol') oxirgi.indekslar.push(i);
        else out.push({ tur: 'torMisol', indekslar: [i] });
        return;
      }
      torda = false;

      if (q.tur === 'ustun') {
        // Uchtagacha: «меня / вас / тебя» kabi uch tomonlama taqqoslash ham
        // bitta qatorda tursin, aks holda uchinchisi yolg'iz qolib ketardi.
        if (oxirgi?.tur === 'ustunlar' && oxirgi.indekslar.length < 3) {
          oxirgi.indekslar.push(i);
          return;
        }
        out.push({ tur: 'ustunlar', indekslar: [i] });
        return;
      }
      out.push({ tur: 'oddiy', i });
    });
    return out;
  }, [satrlar]);

  /** Hali aytilmagan satr — xiraroq, lekin o'qish mumkin. */
  const shaffoflik = (i: number) => (i <= ochiqSatr ? 1 : 0.4);

  /** Satrlar birin-ketin ko'tarilib chiqadi (mos yozuvlardagi `rise`). */
  const satr = (i: number) =>
    reduceMotion
      ? { animate: { opacity: shaffoflik(i) } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: shaffoflik(i), y: 0 },
          transition: {
            duration: 0.45,
            delay: 0.07 + i * 0.06,
            ease: [0.2, 0.7, 0.3, 1] as [number, number, number, number],
          },
        };

  /**
   * Ustunning jadvaldagi o'z o'rni (0, 1, 2 …) — chap/o'ng ustunni ajratish
   * uchun. Global satr raqami yaramaydi: undan oldin tushuntirish va qoida
   * turishi mumkin.
   */
  const ustunOrni = (indeks: number) =>
    satrlar.slice(0, indeks).filter((x) => x.tur === 'ustun').length;

  /** Ustoz AYNI DAMDA o'qiyotgan satr — yumshoq nur bilan ajratiladi. */
  const faol = (i: number) => i === faolSatr;

  /*
   * O'QILAYOTGAN SATR O'ZI KO'RINISHGA SURILADI: matn ko'p bo'lsa pastdagi
   * satrlar ekrandan chiqib ketadi va ovoz bilan yozuv uzilib qoladi.
   */
  const doskaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (faolSatr < 0) return;
    const quti = doskaRef.current;
    const el = quti?.querySelector<HTMLElement>(`[data-satr="${faolSatr}"]`);
    if (!el || !quti) return;
    const e = el.getBoundingClientRect();
    const q = quti.getBoundingClientRect();
    // Faqat ko'rinmay qolgan bo'lsa suriladi — aks holda sahna bejiz silkinadi.
    if (e.top >= q.top && e.bottom <= q.bottom) return;
    quti.scrollTo({
      top: quti.scrollTop + (e.top - q.top) - q.height / 3,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [faolSatr, reduceMotion]);

  /** Shisha kartochka — mos yozuvlardagi `.card`. */
  const karta = (qoshimcha = '') =>
    `rounded-[18px] border border-white/12 shadow-[0_12px_34px_rgba(0,0,0,0.28)] ${qoshimcha}`;

  const faolHalqa = (i: number) =>
    faol(i) ? 'ring-2 ring-[#F0B963]/45 shadow-[0_0_0_6px_rgba(240,185,99,0.07)]' : '';

  /** Taqqoslash ustuni — guruh ichida, yonma-yon chiziladi. */
  const ustunChiz = (i: number, orin: number, tor = false) => {
    const qator = satrlar[i];
    if (qator.tur !== 'ustun') return null;
    // Uch ustun bir qatorga sig'ishi uchun matn kichrayadi.
    const rang = orin % 3 === 0 ? R.aqua : orin % 3 === 1 ? R.accent : R.mint;
    return (
      <motion.div
        key={i}
        {...satr(i)}
        data-satr={i}
        className={`${karta(tor ? 'px-2 py-3 text-center' : 'px-3 py-3.5 text-center')} ${faolHalqa(i)}`}
        style={{ background: R.glass, borderTop: `4px solid ${rang}` }}
      >
        {qator.ustun.ikonka ? (
          <DoskaIkonka
            nom={qator.ustun.ikonka}
            className={`mx-auto mb-2 ${tor ? 'h-10 w-10' : 'h-14 w-14 sm:h-16 sm:w-16'}`}
            rang={rang}
          />
        ) : null}
        <p
          className={`doska-display font-bold leading-tight ${
            tor ? 'text-[13.5px] sm:text-[16px]' : 'text-[15px] sm:text-[18px]'
          }`}
          style={{ color: rang }}
        >
          {qator.ustun.bosh}
        </p>
        {qator.ustun.satrlar.map((x, k) => (
          <p
            key={k}
            className={`mt-2 font-semibold leading-snug ${
              tor ? 'text-[12px] sm:text-[13.5px]' : 'text-[13.5px] sm:text-[15px]'
            }`}
            style={{ color: R.fg2 }}
          >
            {x}
          </p>
        ))}
      </motion.div>
    );
  };

  return (
    <div className={toliq ? 'relative h-full' : 'relative'}>
      {/* ------------------------------- SAHNA ------------------------------- */}
      <div
        className={`relative overflow-hidden ${toliq ? 'h-full rounded-none' : 'rounded-[24px]'}`}
        style={{
          background: SAHNA_FON,
          boxShadow: toliq ? undefined : '0 22px 60px -24px rgba(4,18,22,0.85)',
        }}
      >
        {/* Fon to'ri va chetlardagi qorong'ilik — matn ostida qoladi. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: TOR_FON,
            backgroundSize: '48px 48px',
            maskImage: TOR_MASK,
            WebkitMaskImage: TOR_MASK,
          }}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${toliq ? '' : 'rounded-[24px]'}`}
          style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }}
        />

        <div
          ref={doskaRef}
          /*
            Pastdagi bo'shliq ustoz rasmidan KATTAROQ: oxirgi satr uning ortida
            qolib ketmasin.
          */
          /*
            To'liq ekranda TEPADAN JOY QOLDIRILADI.

            Boshqaruv tugmalari (chiqish, pauza, ovoz) doskaning ustida suzadi.
            Ilgari sarlavha ekranning eng tepasidan boshlanardi va aynan
            o'sha tugmalar ostiga tushib, ustma-ust bo'lib qolardi.
          */
          className={`relative overflow-y-auto overscroll-contain px-4 pb-[104px] sm:px-6 sm:pb-[118px] ${
            toliq
              ? 'h-full pt-[calc(env(safe-area-inset-top,0px)+86px)]'
              : 'max-h-[calc(100dvh-230px)] pt-4 sm:max-h-[calc(100dvh-240px)] sm:pt-5'
          }`}
        >
          {/* ----------------------- Yuqori qator ----------------------- */}
          {toliq ? null : (
          <div className="mb-4 flex items-center justify-end gap-3">
            {speaking || loading ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${R.line}`, color: R.fg2 }}
              >
                {/*
                  Nishon HAR DOIM bir xil: "Ustoz tushuntirmoqda".
                  Ilgari ovoz yuklanayotganda "Ovoz tayyorlanmoqda…" deb
                  o'zgarardi — bu o'quvchiga texnik kutish borligini
                  eslatardi, holbuki uning uchun bu bitta uzluksiz dars.
                */}
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: R.mint }}
                />
                Ustoz tushuntirmoqda
              </span>
            ) : null}
          </div>
          )}

          {/* Keng ekranda satrlar cho'zilib ketmasin — o'qish qulay qolsin. */}
          <div className={toliq ? 'mx-auto w-full max-w-[560px]' : ''}>
          {/* ------------------------- Sarlavha ------------------------- */}
          <motion.h3
            initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.3, 1] }}
            className="doska-display text-center text-[22px] font-bold leading-[1.14] sm:text-[28px]"
            style={{ color: R.fg }}
          >
            {sarlavha.map((b, i) => (
              <span key={i} style={b.urgu ? { color: R.accent } : undefined}>
                {b.t}
              </span>
            ))}
          </motion.h3>

          {kalitSavol ? (
            <motion.p
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="mx-auto mt-3 w-fit rounded-full px-3.5 py-1.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.16em] sm:text-[12px]"
              style={{
                background: 'rgba(111,199,201,0.14)',
                border: '1px solid rgba(111,199,201,0.4)',
                color: R.aqua,
              }}
            >
              {kalitSavol}
            </motion.p>
          ) : null}

          {/* Sarlavha ostidagi ikki rangli chiziq (mos yozuvlardagi `#bar`). */}
          <motion.span
            aria-hidden
            className="mx-auto mt-4 block h-[3px] rounded-full"
            initial={reduceMotion ? undefined : { width: 0 }}
            animate={reduceMotion ? undefined : { width: '38%' }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, ${R.accent}, ${R.aqua})`,
              ...(reduceMotion ? { width: '38%' } : null),
            }}
          />

          {/* -------------------------- SATRLAR -------------------------- */}
          <div className="mt-5 flex flex-col gap-3.5">
            {guruhlar.map((guruh, gi) => {
              if (guruh.tur === 'torMisol') {
                return (
                  <div key={`m${gi}`} className="grid grid-cols-2 gap-2.5">
                    {guruh.indekslar.map((i) => {
                      const q = satrlar[i];
                      if (q.tur !== 'misol') return null;
                      return (
                        <motion.div
                          key={i}
                          {...satr(i)}
                          data-satr={i}
                          className={`${karta('px-3 py-2.5')} ${faolHalqa(i)}`}
                          style={{ background: R.glass }}
                        >
                          <p
                            className="doska-display text-[18px] font-bold leading-none sm:text-[22px]"
                            style={{ color: R.fg }}
                          >
                            {q.ru}
                          </p>
                          {q.uz ? (
                            <p
                              className="mt-1.5 text-[12.5px] leading-snug sm:text-[13.5px]"
                              style={{ color: R.fg2 }}
                            >
                              {q.uz}
                            </p>
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </div>
                );
              }

              if (guruh.tur === 'ustunlar') {
                const uch = guruh.indekslar.length === 3;
                return (
                  <div
                    key={`u${gi}`}
                    className={`grid gap-2.5 ${uch ? 'grid-cols-3' : 'grid-cols-2 gap-3'}`}
                  >
                    {guruh.indekslar.map((i) => ustunChiz(i, ustunOrni(i), uch))}
                  </div>
                );
              }
              const i = guruh.i;
              const qator = satrlar[i];
              /* ----- Tushuntirish: sahnaning asosiy matni ----- */
              if (qator.tur === 'tushuntirish') {
                return (
                  <motion.p
                    key={i}
                    {...satr(i)}
                    data-satr={i}
                    className={`rounded-[14px] px-1 py-0.5 text-[14.5px] font-medium leading-relaxed sm:text-[16px] ${faolHalqa(i)}`}
                    style={{ color: R.fg2 }}
                  >
                    {qator.matn}
                  </motion.p>
                );
              }

              /* ----- Qoida: yon chizig'i amber bo'lgan shisha kartochka ----- */
              if (qator.tur === 'qoida') {
                return (
                  <motion.div
                    key={i}
                    {...satr(i)}
                    data-satr={i}
                    className={`${karta('px-4 py-3.5')} ${faolHalqa(i)}`}
                    style={{ background: R.glass, borderLeft: `4px solid ${R.accent}` }}
                  >
                    <p
                      className="text-[14.5px] font-semibold leading-snug sm:text-[16.5px]"
                      style={{ color: R.fg }}
                    >
                      {qator.matn}
                    </p>
                  </motion.div>
                );
              }

              /* ----- Jadval ustidagi savol ----- */
              if (qator.tur === 'savol') {
                return (
                  <motion.p
                    key={i}
                    {...satr(i)}
                    data-satr={i}
                    className={`doska-display mt-1 rounded-[14px] px-2 py-1 text-center text-[16px] font-bold leading-snug sm:text-[19px] ${faolHalqa(i)}`}
                    style={{ color: R.accent }}
                  >
                    {qator.matn}
                  </motion.p>
                );
              }

              /* ----- AYRILISH: bitta so'z ikkiga bo'linadi ----- */
              if (qator.tur === 'ayrilish') {
                const a = qator.ayrilish;
                return (
                  <motion.div key={i} {...satr(i)} data-satr={i} className={faolHalqa(i)}>
                    <p
                      className="doska-display text-center text-[46px] font-bold leading-none sm:text-[64px]"
                      style={{ color: R.fg }}
                    >
                      {a.soz}
                    </p>
                    <AyriChiziq className="mx-auto mt-1 h-[54px] w-[150px]" rang={R.dust} />
                    <div className="grid grid-cols-2 gap-3">
                      {a.tarmoqlar.map((t, k) => {
                        const rang = k % 2 === 0 ? R.aqua : R.accent;
                        return (
                          <div
                            key={k}
                            className={karta('flex flex-col items-center gap-2 px-3 py-4 text-center')}
                            style={{ background: R.glass }}
                          >
                            {t.ikonka ? (
                              <DoskaIkonka nom={t.ikonka} className="h-14 w-14 sm:h-16 sm:w-16" rang={rang} />
                            ) : null}
                            <p
                              className="doska-display text-[26px] font-bold leading-none sm:text-[32px]"
                              style={{ color: rang }}
                            >
                              {t.soz}
                            </p>
                            {t.izoh ? (
                              <p className="text-[13px] leading-snug sm:text-[14.5px]" style={{ color: R.fg2 }}>
                                {t.izoh}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              }

              /* ----- TENGLAMA: gap qismlari bloklarda ----- */
              if (qator.tur === 'tenglama') {
                return (
                  <motion.div
                    key={i}
                    {...satr(i)}
                    data-satr={i}
                    className={`flex flex-col gap-4 ${faolHalqa(i)}`}
                  >
                    {qator.tenglama.qatorlar.map((q, k) => (
                      <div key={k}>
                        <p
                          className="mb-2 text-center font-mono text-[10.5px] font-bold uppercase tracking-[0.2em]"
                          style={{ color: R.muted }}
                        >
                          {q.nom}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {q.bloklar.map((b, bi) => {
                            const uslub =
                              b.tur === 'urgu'
                                ? { color: R.accent, background: 'rgba(240,185,99,.14)', borderColor: 'rgba(240,185,99,.4)' }
                                : b.tur === 'bosh'
                                  ? { color: R.mint, background: 'rgba(86,204,151,.13)', borderColor: 'rgba(86,204,151,.45)' }
                                  : b.tur === 'ochirilgan'
                                    ? { color: R.dust, background: 'rgba(143,160,171,.10)', borderColor: 'rgba(143,160,171,.4)' }
                                    : { color: R.fg, background: R.glass, borderColor: R.line };
                            return (
                              <span
                                key={bi}
                                className={`doska-display rounded-[14px] border px-3 py-2 text-[17px] font-bold sm:text-[20px] ${
                                  b.tur === 'ochirilgan' ? 'line-through' : ''
                                } ${b.tur === 'bosh' ? 'border-dashed !text-[12px] !font-mono uppercase tracking-[0.14em]' : ''}`}
                                style={uslub}
                              >
                                {b.matn}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                );
              }

              /* ----- NISHON: kimga qaysi shakl ----- */
              if (qator.tur === 'nishon') {
                const n = qator.nishon;
                return (
                  <motion.div
                    key={i}
                    {...satr(i)}
                    data-satr={i}
                    className={`${karta('flex items-center gap-3 px-3 py-3')} ${faolHalqa(i)}`}
                    style={{ background: R.glass }}
                  >
                    {n.ikonka ? (
                      <DoskaIkonka nom={n.ikonka} className="h-11 w-11 flex-none sm:h-13 sm:w-13" rang={R.accent} />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[15px] font-bold leading-tight sm:text-[17px]"
                        style={{ color: R.fg }}
                      >
                        {n.kim}
                      </span>
                      {n.izoh ? (
                        <span className="block text-[12.5px] leading-snug" style={{ color: R.muted }}>
                          {n.izoh}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="doska-display flex-none rounded-[12px] border px-3 py-1.5 text-[16px] font-bold sm:text-[18px]"
                      style={{
                        color: R.mint,
                        background: 'rgba(86,204,151,.13)',
                        borderColor: 'rgba(86,204,151,.34)',
                      }}
                    >
                      {n.togri}
                    </span>
                    {n.notogri ? (
                      <span
                        className="doska-display flex-none rounded-[12px] border px-2.5 py-1.5 text-[15px] font-bold line-through sm:text-[17px]"
                        style={{
                          color: R.dust,
                          background: 'rgba(143,160,171,.10)',
                          borderColor: 'rgba(143,160,171,.26)',
                        }}
                      >
                        {n.notogri}
                      </span>
                    ) : null}
                  </motion.div>
                );
              }

              /* ----- Tipik xato: ✕ o'chirilgan / ✓ to'g'ri ----- */
              if (qator.tur === 'xato') {
                return (
                  <motion.div
                    key={i}
                    {...satr(i)}
                    data-satr={i}
                    className={`flex flex-col gap-2 rounded-[18px] ${faolHalqa(i)}`}
                  >
                    <div
                      className="flex items-center gap-3 rounded-[16px] border px-3.5 py-3"
                      style={{
                        background: 'rgba(143,160,171,0.10)',
                        borderColor: 'rgba(143,160,171,0.26)',
                      }}
                    >
                      <span
                        className="grid h-7 w-7 flex-none place-items-center rounded-full font-mono text-[15px] font-bold"
                        style={{ background: R.dust, color: '#08121C' }}
                      >
                        ✕
                      </span>
                      <span
                        className="text-[14px] font-semibold leading-snug line-through sm:text-[15.5px]"
                        style={{ color: R.muted, textDecorationColor: 'rgba(143,160,171,0.8)' }}
                      >
                        {qator.xato.notogri}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-3 rounded-[16px] border px-3.5 py-3"
                      style={{
                        background: 'rgba(86,204,151,0.13)',
                        borderColor: 'rgba(86,204,151,0.34)',
                      }}
                    >
                      <span
                        className="grid h-7 w-7 flex-none place-items-center rounded-full font-mono text-[15px] font-bold"
                        style={{ background: R.mint, color: '#08121C' }}
                      >
                        ✓
                      </span>
                      <span
                        className="text-[14.5px] font-bold leading-snug sm:text-[16px]"
                        style={{ color: R.fg }}
                      >
                        {qator.xato.togri}
                      </span>
                    </div>
                    {qator.xato.izoh ? (
                      <p
                        className="px-1 text-[13px] leading-snug sm:text-[14px]"
                        style={{ color: R.muted }}
                      >
                        {qator.xato.izoh}
                      </p>
                    ) : null}
                  </motion.div>
                );
              }

              /* ----- Misol: ruscha gap + o'zbekcha tarjimasi ----- */
              // Ustunlar yuqorida guruh bo'lib chizilgan — bu yerga tushmaydi.
              if (qator.tur !== 'misol') return null;
              return (
                <motion.div
                  key={i}
                  {...satr(i)}
                  data-satr={i}
                  className={`${karta('flex items-center gap-3.5 px-4 py-3.5')} ${faolHalqa(i)}`}
                  style={{ background: R.glass }}
                >
                  <DoskaIkonka
                    nom={qator.ikonka ?? 'gap'}
                    className="h-9 w-9 flex-none sm:h-12 sm:w-12"
                    rang={qator.ikonka ? R.accent : R.aqua}
                  />
                  <span className="min-w-0">
                    <span
                      className="block text-[16px] font-semibold leading-snug sm:text-[19px]"
                      style={{ color: R.fg }}
                    >
                      {qator.ru}
                    </span>
                    {qator.uz ? (
                      <span
                        className="mt-1.5 block text-[13px] leading-snug sm:text-[14.5px]"
                        style={{ color: R.fg2 }}
                      >
                        {qator.uz}
                      </span>
                    ) : null}
                  </span>
                </motion.div>
              );
            })}
          </div>
          </div>
        </div>
        {/*
          Ustoz rasmi ostidagi yumshoq soya.

          Rasm sahnaning o'ng pastida turadi va aylantirilayotgan matn uning
          ortidan o'tadi — soyasiz bu "matn kesilib qolgan"dek ko'rinardi.
          O'qilayotgan satr baribir ekranning yuqori uchdan biriga suriladi,
          ya'ni muhim joy hech qachon rasm ortida qolmaydi.
        */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-[92px] ${toliq ? '' : 'rounded-b-[24px]'}`}
          style={{ background: 'linear-gradient(180deg, rgba(8,20,25,0) 0%, rgba(8,20,25,0.88) 78%)' }}
        />
      </div>

      {/* ------------------------------- USTOZ ------------------------------- */}
      {/* Sahnaning o'ng pastida turadi — sinfda ustoz doska yonida turgandek. */}
      <div className="pointer-events-none absolute -bottom-1 right-2 w-[72px] sm:right-4 sm:w-[96px]">
        <UstozAvatar speaking={speaking} compact />
      </div>
    </div>
  );
}
