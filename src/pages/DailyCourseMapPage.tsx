import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useKunlikProgress, type KunlikDayProgress } from '../hooks/useKunlikProgress';
import { useLocale } from '../context/LocaleContext';
import { buildQuestSlots, getRow, type QuestSlot } from '../utils/kunlikBloklar';
import { TOTAL_DAYS } from '../data/dailyPlan';
import { FREE_KUNLIK_DAY_LIMIT, canEnterKunlikDayContent } from '../../shared/dailyCourseDay';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';
import { rememberKunlikOpenedDay } from '../utils/kunlikLastDay';
import { getLifeScene, type LifeScene } from '../data/lifeJourney';
import LifeSceneOverlay from '../components/journey/LifeSceneOverlay';
import HomeDiscountTimerLink from '../components/pricing/HomeDiscountTimerLink';

/** 6 stages of 30 days each (last one = 32 days to cover 182). */
const STAGES = [
  { num: 1, title: 'Asoslar', range: [1, 30] as const },
  { num: 2, title: "Kunlik so'zlashuv", range: [31, 60] as const },
  { num: 3, title: 'Grammatika chuqurroq', range: [61, 90] as const },
  { num: 4, title: 'Amaliy nutq', range: [91, 120] as const },
  { num: 5, title: 'Test va yozma javob', range: [121, 150] as const },
  { num: 6, title: 'Imtihonga tayyorlik', range: [151, TOTAL_DAYS] as const },
];

function isDayDone(row: KunlikDayProgress | undefined, promptCounts: Map<number, number>): boolean {
  if (!row) return false;
  return isKunlikDayRowFullyComplete(row, promptCounts);
}

function findCurrentDay(rows: Map<number, KunlikDayProgress>, promptCounts: Map<number, number>): number {
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    if (!isDayDone(rows.get(day), promptCounts)) return day;
  }
  return TOTAL_DAYS;
}

export default function DailyCourseMapPage() {
  const navigate = useNavigate();
  /** Xarita ildiz manzilida (`/`) ochilganmi — o'shanda "ortga" kerak emas. */
  const ildizdami = useLocation().pathname === '/';
  const { user } = useAuth();
  const { t } = useLocale();
  const { access } = useAccess();
  // OLTIN A'ZO: 182 kunning hammasi ochiq — kelajak kunlar ham qulflanmaydi.
  const oltin = Boolean(access?.golden);
  const premium = Boolean(access?.subscription_active);
  /*
   * BEPUL DAVR TUGADIMI.
   *
   * Ro'yxatdan o'tgan odamga 1-kun bepul. 2-kunga o'tganda to'lov kerak.
   * Ilgari bu taklif faqat eski bosh sahifada turardi; xarita asosiy ekran
   * bo'lgach, o'quvchi to'lov haqida umuman xabar olmay qoldi — kunni
   * bosar, server esa jimgina rad etardi.
   */
  const [tolovOynasi, setTolovOynasi] = useState(false);
  const { rows: rowMap, loaded, practicePromptCountByDay } = useKunlikProgress();
  const todayRef = useRef<HTMLDivElement>(null);
  /*
   * BUGUNGI KUN EKRANDAN CHIQIB KETDIMI.
   *
   * Xarita 182 kun — o'n olti ming piksel. Kelajak kunlarni ko'zdan
   * kechirgan odam o'z joyiga qaytish uchun uzoq sirg'alishi kerak edi.
   * Bugun ekranda ko'rinmay qolganda suzuvchi tugma chiqadi.
   */
  const [bugunKorinmayapti, setBugunKorinmayapti] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Ochilishi kutilayotgan kun sahnasi (1-10 kun uchun). */
  const [pendingScene, setPendingScene] = useState<{ scene: LifeScene; day: number } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  if (!user) {
    // outer guard handles redirect
  }

  const currentDay = useMemo(
    () => (loaded ? findCurrentDay(rowMap, practicePromptCountByDay) : 1),
    [rowMap, loaded, practicePromptCountByDay],
  );

  /*
   * JORIY KUNNING BESH BLOKI.
   *
   * Qoida `utils/kunlikBloklar.ts` da — kunning sahifasi ham aynan shuni
   * ishlatadi. Shu sababli xaritada "ochiq" ko'ringan blok o'sha sahifada
   * ham ochiq bo'ladi; ikki xil hisob-kitob yo'q.
   */
  const bloklarniOl = useCallback(
    (day: number): QuestSlot[] => {
      if (!loaded) return [];
      return buildQuestSlots(getRow(rowMap, day), practicePromptCountByDay.get(day) ?? 0, oltin);
    },
    [loaded, rowMap, practicePromptCountByDay, oltin],
  );

  const bugungiBloklar = useMemo<QuestSlot[]>(
    () => bloklarniOl(currentDay),
    [bloklarniOl, currentDay],
  );

  /*
   * XARITADA OCHIB KO'RILAYOTGAN KUN.
   *
   * Bugungi kunning kartasi doim ochiq. Boshqa kun bosilganda esa u ham
   * SHU YERDA — xaritaning o'zida — ochiladi. Ilgari boshqa kunga bosilsa
   * to'rtta katta plitkali eski sahifa ochilardi: bir ilova ichida ikki xil
   * ko'rinish paydo bo'lardi.
   */
  const [ochilganKun, setOchilganKun] = useState<number | null>(null);

  /** Hozir bajarilishi kerak bo'lgan blok — kun bosilganda AYNAN SHU ochiladi. */
  /* Bugungi kun to'lov ortida qoldimi (izoh yuqorida). */
  const bepulTugadi = !oltin && !premium && currentDay > FREE_KUNLIK_DAY_LIMIT;
  const joriyBlok = bugungiBloklar.find((b) => b.state === 'active') ?? null;
  const bajarilganBloklar = bugungiBloklar.filter((b) => b.state === 'done').length;
  /*
   * YO'L KO'RSATKICHI — KUN ICHIDAGI ISH HAM HISOBGA OLINADI.
   *
   * Ilgari faqat TUGAGAN kunlar sanalardi. Natijada o'quvchi kunning to'rt
   * blokini bajarib bo'lsa ham chiziq qimirlamasdi va butun kun davomida
   * "0%" turardi — mehnat ko'rinmasdi. Endi tugallanmagan kunning ulushi
   * ham qo'shiladi: har blokdan keyin chiziq sezilarli siljiydi.
   */
  const bugungiUlush =
    bugungiBloklar.length > 0 ? bajarilganBloklar / bugungiBloklar.length : 0;
  const pct = Math.min(
    100,
    Math.round(((currentDay - 1 + bugungiUlush) / TOTAL_DAYS) * 1000) / 10,
  );
  const currentStage = useMemo(
    () => STAGES.find((s) => currentDay >= s.range[0] && currentDay <= s.range[1]),
    [currentDay],
  );



  useEffect(() => {
    const bugun = todayRef.current;
    if (!loaded || !bugun || typeof IntersectionObserver === 'undefined') return;
    const kuzatuvchi = new IntersectionObserver(
      ([yozuv]) => setBugunKorinmayapti(!yozuv.isIntersecting),
      { threshold: 0 },
    );
    kuzatuvchi.observe(bugun);
    return () => kuzatuvchi.disconnect();
  }, [loaded, currentDay]);

  const bugungaQayt = useCallback(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      /*
        `block: 'center'` EMAS. Bugungi kun tuguni endi baland (doira +
        beshta qadam kartasi) va markazga qo'yilganda uning tepasi — "Bugun
        shu yerda" yozuvi va doiraning yarmi — yopishqoq sarlavha ostida
        qolib ketardi. `start` + `scroll-mt` (tugundagi sinf) uni aynan
        sarlavha ostidan boshlaydi.
      */
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
    return () => window.clearTimeout(t);
  }, [loaded]);

  // Ikki mustaqil yo'l: sessionStorage (ishonchli, searchParams stale bo'lsa ham) + URL ?kun.
  /*
   * KUN BOSILGANDA — TO'G'RIDAN-TO'G'RI KEYINGI BLOKKA.
   *
   * Ilgari kun bosilganda beshta karta turgan oraliq sahifa ochilardi va
   * o'quvchi u yerdan yana bittasini tanlashi kerak edi. Amalda tanlash
   * yo'q edi: tartib qat'iy — grammatika, lug'at, o'qish, gapirish,
   * savol-javob. Ya'ni ekran faqat ortiqcha bir bosish qo'shardi.
   *
   * Endi kun bosilishi bilan HOZIR bajarilishi kerak bo'lgan blok ochiladi.
   * Kun to'liq tugagan bo'lsa (qaytadigan blok yo'q) — kunning sahifasi
   * ochiladi, u yerdan istalganini takrorlash mumkin.
   */
  const openDay = (day: number) => {
    /*
     * TO'LOV TEKSHIRUVI — kunga kirishdan OLDIN.
     *
     * Server baribir rad etadi, lekin o'quvchi buni sabab bilan bilishi
     * kerak: jim rad etish "ilova buzuq" degan taassurot qoldirardi.
     */
    if (!oltin && !canEnterKunlikDayContent(day, premium)) {
      setTolovOynasi(true);
      return;
    }
    rememberKunlikOpenedDay(day);
    /*
     * Bugungi kun: navbatdagi blok DARHOL ochiladi — o'quvchi ishini
     * davom ettiradi, ortiqcha bosish yo'q.
     */
    if (day === currentDay && joriyBlok) {
      navigate(joriyBlok.route(day));
      return;
    }
    /*
     * Boshqa kun: xaritaning O'ZIDA qadamlari ochiladi (takrorlash uchun).
     * Qayta bosilsa yopiladi.
     */
    setOchilganKun((oldingi) => (oldingi === day ? null : day));
  };

  /**
   * 1-10 kunlar "hayot yo'li" sahnasi bilan ochiladi: avval to'liq ekranli
   * animatsiya, keyin kunning o'zi.
   *
   * SAHNA FAQAT DARSGA KIRISHDA. Boshqa kun bosilganda xaritada shunchaki
   * qadamlar ro'yxati ochiladi — bu darsga kirish emas, ko'rib chiqish.
   * Har bosishda to'liq ekranli animatsiya o'ynasa, o'quvchi kunlarni
   * ko'zdan kechira olmasdi.
   */
  const goDay = (day: number) => {
    const darsgaKiradi = day === currentDay && joriyBlok !== null;
    const scene = darsgaKiradi ? getLifeScene(day) : null;
    if (scene) {
      setPendingScene({ scene, day });
      return;
    }
    openDay(day);
  };

  return (
    <div className="min-h-screen bg-[#EEF1F8] pb-16">
      {/* Sticky navy hero — premium: rounded bottom, radial gold decor, refined stats */}
      <header
        className="sticky top-0 z-20 overflow-hidden rounded-b-[28px] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 text-white shadow-[0_18px_38px_-16px_rgba(11,42,107,0.55)]"
        style={{ background: 'linear-gradient(160deg, #123A8F 0%, #0B2A6B 55%, #071B5E 100%)' }}
      >
        {/* Gold radial glow decor */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-14 h-[190px] w-[190px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(231,197,120,0.35), transparent 65%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-[130px] w-[130px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 60%)' }}
        />

        <div className="relative z-[2]">
          <HomeDiscountTimerLink className="mt-0 mb-3" />
        </div>

        <div className="relative z-[2] flex items-start gap-3">
          {/*
            "ORTGA" FAQAT ESKI MANZILDA.

            Xarita endi ilovaning BIRINCHI ekrani (`/`) — u yerdan qaytadigan
            joy yo'q va tugma bosilsa o'ziga qaytardi. Eski
            `/kunlik-reja/xarita` havolasi bilan kelinganda esa tugma kerak.
          */}
          {ildizdami ? null : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Orqaga"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/12 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {/*
              MATN KAMAYTIRILDI.

              Ilgari uch qator edi: "TO'LIQ YO'L XARITASI", "182 kun
              sayohati" va "Hozir Kun 1 · Bosqich 1 · Asoslar". Uchalasi
              bir xil narsani takrorlardi va ekranning uchdan birini
              egallardi. Bosqich nomi pastda, yo'l lavhasida turibdi —
              sarlavhada takrorlash shart emas.
            */}
            <h1 className="text-[20px] font-black leading-none tracking-[-0.01em]">
              {TOTAL_DAYS} kunlik sayohat
            </h1>
            <p className="mt-1.5 text-[12px] font-bold text-[#AEBEE4]">
              Hozir <span className="font-black text-white">{currentDay}-kun</span>
            </p>
          </div>
        </div>

        {/* Progress bar with percent + fraction */}
        <div className="relative z-[2] mt-3">
          <div className="flex items-center justify-between text-[11px] font-black">
            <span className="text-[#AEBEE4]">Bosib o'tilgan yo'l</span>
            <span className="text-[#E7C578]">
              {currentDay - 1} / {TOTAL_DAYS} · {pct}%
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="relative h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #F5D97C 0%, #E7C578 45%, #C08A2D 100%)',
                boxShadow: '0 0 12px rgba(231,197,120,0.55)',
              }}
            />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-md px-4 pt-6">
        {/*
          UMUMIY TIK ARQON OLIB TASHLANDI.

          Ilgari butun xarita bo'ylab bitta tik chiziq turardi, kunlar esa
          uning chap-o'ngida — ya'ni yo'l kunlarga tegmasdi. Endi arqon
          har ikki kun orasida alohida, EGRI bo'lak sifatida chiziladi
          (`ArqonBolagi`) va chindan ham kunlar orqali o'tadi.
        */}
        {/*
          BOSIB O'TILGAN YO'L — TO'LDIRILGAN CHIZIQ.

          Nuqtali chiziq 182 kun bo'ylab bir xil kulrang edi: o'quvchi
          qayergacha yetganini faqat doiralarni sanab bilardi. Endi bugungi
          kungacha bo'lgan qism to'ldirilgan va rangli — ko'z bir qarashda
          "shu yergacha keldim" deb o'qiydi.

          Balandlik TAXMIN QILINMAYDI, o'lchanadi: bugungi kun tuguni
          sahifada qayerda tursa, chiziq aynan o'shagacha to'ladi. Kunlar
          teng balandlikda emas (bugungi kun kartasi baland), shuning uchun
          foizdan hisoblash noto'g'ri chiqardi.
        */}


        {/* Sparkles decoration */}
        {/* `z-0` — bezak kartaning USTIGA chiqmasin (karta `z-[2]`). */}
        <span aria-hidden className="pointer-events-none absolute left-[14%] top-[220px] z-0 text-[22px]">✨</span>
        <span aria-hidden className="pointer-events-none absolute right-[10%] top-[480px] z-0 text-[18px]">✨</span>

        <div className="relative flex flex-col items-center">
          {/* Top chess flag */}
          <div className="mb-4 flex flex-col items-center">
            <YolBelgisi nom="bayroq" className="h-10 w-14" />
          </div>

          {STAGES.map((stage) => {
            const [from, to] = stage.range;
            const days: number[] = [];
            for (let d = from; d <= to; d++) days.push(d);

            return (
              <section key={stage.num} className="mb-2 flex w-full flex-col items-center">
                {/* Stage milestone — gold circle centered, card below */}
                <div className="xarita-tanga relative z-[2] flex h-[54px] w-[54px] items-center justify-center rounded-full text-[22px] font-black text-white"
                  style={{ background: 'linear-gradient(160deg, #F8E19A 0%, #D9A93F 55%, #A9791C 100%)' }}
                  aria-hidden
                >
                  {stage.num}
                </div>
                {/*
                  BOSQICH LAVHASI — yo'l chetidagi ko'rsatkich taxta.
                  Oddiy oq karta yo'lning o'zidan ajralib turmasdi; issiq
                  rang va ikki qavat chegara uni "belgi" qilib ko'rsatadi.
                */}
                <div className="xarita-taxta relative z-[2] mt-3 rounded-[14px] px-7 py-2.5 text-center">
                  <p className="text-[14.5px] font-black uppercase tracking-[0.06em] text-[#6B4E12]">
                    {stage.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-black uppercase tracking-[0.2em] text-[#B08428]">
                    {from}–{to} kun
                  </p>
                </div>

                {/* Days in this stage — zig-zag alternating sides of the filmstrip */}
                <div className="mt-4 flex w-full flex-col items-center">
                  {days.map((day) => {
                    const row = rowMap.get(day);
                    const done = isDayDone(row, practicePromptCountByDay);
                    const isToday = day === currentDay;
                    const isPast = day < currentDay;
                    /*
                      YO'L — TO'LQINSIMON.

                      Ilgari kunlar qat'iy chapga-o'ngga sakrardi: bu yo'l
                      emas, arra tishiga o'xshardi. Sinus egri chizig'i
                      tabiiy burilish beradi — yo'l goh keng, goh tor
                      buriladi va haqiqiy so'qmoqqa o'xshaydi.

                      Davri 6 kun: bir to'liq burilish olti kunga to'g'ri
                      keladi, ya'ni ekranda bir-ikki burilish ko'rinadi.
                    */
                    const shiftPx = kunOrni(day, currentDay);
                    const sideShift = `${shiftPx}px`;
                    /* Oldingi kun — arqon bo'lagi shundan boshlanadi. */
                    const oldingiX = kunOrni(day - 1, currentDay);
                    /* Bosib o'tilgan bo'lak yashil arqon bilan chiziladi. */
                    const bolakOtilgan = day <= currentDay;
                    /*
                      YO'LDAGI BELGILAR — 182 ta bir xil doira zerikarli.
                      Har 7-kun sandiq, har 15-kun sertifikat, bosqich
                      oxiri medal, 182-kun bayroq. Ular yo'lni bo'laklarga
                      ajratadi va o'quvchi "yana ikki kun — sandiq" deb
                      oldinga qaraydi.
                    */
                    const belgi =
                      day === TOTAL_DAYS
                        ? 'bayroq'
                        : day % 30 === 0
                          ? 'medal'
                          : day % 15 === 0
                            ? 'sertifikat'
                            : day % 7 === 0
                              ? 'sandiq'
                              : null;

                    if (isToday) {
                      return (
                        <div
                          key={day}
                          ref={todayRef}
                          /* `scroll-mt` — yopishqoq sarlavha balandligi (148px) + havo. */
                          /*
                            IXCHAM: sarlavha (148px) + tugun + pastki menyu
                            telefon ekraniga sig'ishi kerak. Aks holda asosiy
                            tugma ("...ni boshlash") ekran ostida qolib,
                            o'quvchi uni ko'rmasdi.
                          */
                          className="relative z-[2] flex w-full scroll-mt-[140px] flex-col items-center pb-2"
                        >
                          <div className="relative h-[46px] w-full">
                            <ArqonBolagi
                              boshX={oldingiX}
                              oxirX={shiftPx}
                              balandlik={46}
                              otilgan={bolakOtilgan}
                            />
                          </div>
                          {/* "Bugun shu yerda" pill above */}
                          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-black text-app-text shadow-[0_8px_20px_-10px_rgba(15,23,42,0.18)] ring-1 ring-app-border">
                            Bugun shu yerda <span aria-hidden>👇</span>
                          </div>

                          {/* Big navy circle with "KUN" caption + big number */}
                          <button
                            type="button"
                            onClick={() => goDay(day)}
                            className="relative flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full text-white shadow-[0_18px_36px_-12px_rgba(11,42,107,0.55)] ring-4 ring-white active:scale-[0.98]"
                            style={{ background: 'linear-gradient(155deg, #123A8F, #0B2A6B)' }}
                            aria-label={`Kun ${day}`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-[#E7C578]">
                              KUN
                            </span>
                            <span className="text-[24px] font-black leading-none">{day}</span>
                          </button>

                          {/*
                            Doira bilan kartani BOG'LAYDIGAN chiziq: ular
                            ikkita alohida narsa emas, bitta kun. Chiziqsiz
                            karta xaritada osilib turgandek ko'rinardi.
                          */}
                          <span
                            aria-hidden
                            className="mt-1 h-3 w-[3px] rounded-full bg-[#0B2A6B]/25"
                          />

                          {/*
                            KUNNING KETMA-KETLIGI — XARITANING O'ZIDA.

                            Ilgari bu yerda faqat "Davom eting" tugmasi
                            turardi va o'quvchi kunning ichida nima
                            bo'layotganini ko'rish uchun boshqa sahifaga
                            o'tishi kerak edi. Endi beshta blok shu yerda:
                            bajarilgani ✓, hozirgisi strelka bilan, qolgani
                            bosiq. Blok tugagach o'quvchi shu ekranga
                            qaytadi va o'z qadamini darhol ko'radi.
                          */}
                          {/*
                            BEPUL DAVR TUGAGANDA — QADAMLAR O'RNIGA TO'LOV.

                            1-kun bepul; 2-kundan boshlab obuna kerak.
                            Qadamlar ro'yxatini ko'rsatib, keyin har bosishda
                            rad etish noto'g'ri bo'lardi: o'quvchi nima
                            uchun ishlamayotganini tushunmasdi. Shuning
                            uchun kartaning O'RNIGA sabab va tugma turadi.
                          */}
                          {bepulTugadi ? (
                            <div className="mt-1 w-full max-w-[330px] overflow-hidden rounded-[20px] bg-white p-4 text-center shadow-[0_14px_32px_-14px_rgba(11,42,107,0.4)] ring-1 ring-app-border">
                              <span
                                aria-hidden
                                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[22px]"
                                style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
                              >
                                👑
                              </span>
                              <p className="mt-2.5 text-[15px] font-black text-app-text">
                                1-kun tugadi
                              </p>
                              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-app-text-muted">
                                {day}-kunni ochish uchun obuna kerak. To'lovdan keyin
                                182 kunning hammasi ochiladi.
                              </p>
                              <button
                                type="button"
                                onClick={() => setTolovOynasi(true)}
                                className="mt-3.5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0B2A6B] px-4 text-[14px] font-black text-white shadow-[0_10px_24px_-12px_rgba(11,42,107,0.8)] transition active:scale-[0.99]"
                              >
                                To'lov qilish
                                <ArrowRight className="h-4 w-4" strokeWidth={2.8} />
                              </button>
                            </div>
                          ) : (
                            <QadamlarKartasi
                              bloklar={bugungiBloklar}
                              joriyBlok={joriyBlok}
                              bajarilgan={bajarilganBloklar}
                              sarlavha="Bugungi qadamlar"
                              t={t}
                              onBlok={(blok) => {
                                rememberKunlikOpenedDay(day);
                                navigate(blok.route(day));
                              }}
                            />
                          )}
                        </div>
                      );
                    }

                    // Done past day — green ✓ circle offset to alternate side
                    if (isPast || done) {
                      const ochiq = ochilganKun === day;
                      const kunBloklari = ochiq ? bloklarniOl(day) : [];
                      return (
                        <OchiqKunTuguni
                          key={day}
                          day={day}
                          belgi={belgi}
                          shiftPx={shiftPx}
                          oldingiX={oldingiX}
                          bolakOtilgan={bolakOtilgan}
                          tugagan={true}
                          ochiq={ochiq}
                          bloklar={kunBloklari}
                          joriyBlok={kunBloklari.find((b) => b.state === 'active') ?? null}
                          bajarilgan={kunBloklari.filter((b) => b.state === 'done').length}
                          t={t}
                          onTugma={() => goDay(day)}
                          onBlok={(blok) => {
                            rememberKunlikOpenedDay(day);
                            navigate(blok.route(day));
                          }}
                        />
                      );
                    }

                    // OLTIN A'ZOda kelajak kun ham ochiq — oltin doira, to'g'ridan kiradi.
                    if (oltin) {
                      const ochiq = ochilganKun === day;
                      const kunBloklari = ochiq ? bloklarniOl(day) : [];
                      return (
                        <OchiqKunTuguni
                          key={day}
                          day={day}
                          belgi={belgi}
                          shiftPx={shiftPx}
                          oldingiX={oldingiX}
                          bolakOtilgan={bolakOtilgan}
                          tugagan={false}
                          ochiq={ochiq}
                          bloklar={kunBloklari}
                          joriyBlok={kunBloklari.find((b) => b.state === 'active') ?? null}
                          bajarilgan={kunBloklari.filter((b) => b.state === 'done').length}
                          t={t}
                          onTugma={() => goDay(day)}
                          onBlok={(blok) => {
                            rememberKunlikOpenedDay(day);
                            navigate(blok.route(day));
                          }}
                        />
                      );
                    }

                    // Locked future day — clickable, shows toast "not yet reached"
                    return (
                      <div key={day} className="relative z-[2] flex w-full flex-col items-center">
                        <div className="relative h-[46px] w-full">
                          <ArqonBolagi
                            boshX={oldingiX}
                            oxirX={shiftPx}
                            balandlik={46}
                            otilgan={bolakOtilgan}
                          />
                        </div>
                      <button
                        type="button"
                        onClick={() => {
                          /*
                           * SABABNI TO'G'RI AYTAMIZ.
                           *
                           * Obunasiz o'quvchi uchun to'siq navbat emas,
                           * TO'LOV: "hali yetib bormadingiz" desak, u kunlarni
                           * bosib o'tishga urinib, hech qachon ochilmasligini
                           * tushunmasdi.
                           */
                          if (!oltin && !canEnterKunlikDayContent(day, premium)) {
                            setTolovOynasi(true);
                            return;
                          }
                          showToast(`Bu kunga hali yetib bormadingiz. Hozir Kun ${currentDay}.`);
                        }}
                        className="relative z-[2] flex flex-col items-center py-1 active:scale-95"
                        style={{ transform: `translateX(${sideShift})` }}
                        aria-label={`Kun ${day} (yopiq)`}
                      >
                        {belgi ? (
                          /* Qulflangan belgi — xira: hali yetib borilmagan. */
                          <YolBelgisi nom={belgi} className="h-[48px] w-[48px] opacity-45 grayscale" />
                        ) : (
                          <span
                            className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#E4EAF3] text-[#94A3B8] ring-4 ring-white"
                            aria-hidden
                          >
                            <Lock className="h-[15px] w-[15px]" />
                          </span>
                        )}
                        <span className="mt-1 text-[11px] font-bold text-app-text-muted">Kun {day}</span>
                      </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Bottom — finish sparkle */}
          <div className="relative z-[2] mt-2 flex flex-col items-center">
            <YolBelgisi nom="medal" className="h-9 w-9" />
            <p className="mt-1 text-[13px] font-black text-app-text">Tugagach — sertifikat</p>

          </div>
        </div>
      </main>

      {tolovOynasi ? <KunlikFreeLimitModal onClose={() => setTolovOynasi(false)} /> : null}

      {/*
        BUGUNGA QAYTISH.

        Xarita 182 kun uzunlikda; kelajakni ko'zdan kechirgan odam o'z
        joyiga qaytish uchun uzoq sirg'alardi. Tugma FAQAT bugungi kun
        ekrandan chiqib ketganda ko'rinadi — aks holda u har doim ekranni
        band qilib turgan yana bir tugma bo'lardi.
      */}
      {bugunKorinmayapti ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[90] flex justify-center px-4">
          <button
            type="button"
            onClick={bugungaQayt}
            className="msg-pop pointer-events-auto flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#0B2A6B] px-5 text-[13px] font-black text-white shadow-[0_18px_38px_-14px_rgba(11,42,107,0.55)] transition active:scale-95"
          >
            <ArrowDownToLine className="h-4 w-4 shrink-0 text-[#E7C578]" aria-hidden />
            Bugunga qaytish
          </button>
        </div>
      ) : null}

      {/* Toast — appears when tapping a locked future day */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4"
        >
          <div
            key={toast}
            className="msg-pop pointer-events-auto flex max-w-[92%] items-center gap-2 rounded-full bg-[#0B2A6B] px-5 py-3 text-[13px] font-black text-white shadow-[0_18px_38px_-14px_rgba(11,42,107,0.55)]"
          >
            <Lock className="h-4 w-4 shrink-0 text-[#E7C578]" aria-hidden />
            {toast}
          </div>
        </div>
      ) : null}

      {/* Hayot yo'li sahnasi — kun ochilishidan oldin to'liq ekranda */}
      {pendingScene ? (
        <LifeSceneOverlay
          scene={pendingScene.scene}
          onDone={() => {
            const day = pendingScene.day;
            setPendingScene(null);
            openDay(day);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * KUNNING GORIZONTAL O'RNI (markazdan piksel).
 *
 * Yagona manba: tugun ham, uni bog'laydigan arqon ham SHU funksiyadan
 * o'qiydi. Ikki joyda alohida hisoblansa, arqon tugunga tegmay qolardi.
 *
 * Bugungi kun MARKAZDA: unga beshta qadam kartasi (330px) ulanadi va
 * chetga surilsa ekrandan chiqib ketardi.
 */
function kunOrni(day: number, currentDay: number): number {
  if (day === currentDay) return 0;
  return Math.round(Math.sin((day * Math.PI) / 3.5) * 104);
}

/**
 * IKKI KUN ORASIDAGI ARQON BO'LAGI.
 *
 * Ilgari yo'l butun xarita bo'ylab bitta TIK chiziq edi, kunlar esa uning
 * chap-o'ngida turardi — ya'ni yo'l kunlarga tegmasdi. Endi har bo'lak
 * oldingi kundan shu kunga egri chiziq bilan boradi: yo'l chindan ham
 * kunlar orqali o'tadi va keng buriladi.
 */
function ArqonBolagi({
  boshX,
  oxirX,
  balandlik,
  otilgan,
}: {
  boshX: number;
  oxirX: number;
  balandlik: number;
  /** Bu bo'lak allaqachon bosib o'tilganmi — rangi shunga qarab. */
  otilgan: boolean;
}) {
  const en = 320;
  const x1 = en / 2 + boshX;
  const x2 = en / 2 + oxirX;
  const yarim = balandlik / 2;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
      width={en}
      height={balandlik}
      viewBox={`0 0 ${en} ${balandlik}`}
      fill="none"
    >
      {/* Pastki qatlam — arqonning quyuq chekkasi, hajm beradi. */}
      <path
        d={`M ${x1} 0 C ${x1} ${yarim}, ${x2} ${yarim}, ${x2} ${balandlik}`}
        stroke={otilgan ? '#0E7C45' : '#B18F55'}
        strokeWidth={13}
        strokeLinecap="round"
      />
      {/* Ustki qatlam — asosiy rang. */}
      <path
        d={`M ${x1} 0 C ${x1} ${yarim}, ${x2} ${yarim}, ${x2} ${balandlik}`}
        stroke={otilgan ? '#2FCB79' : '#E0C795'}
        strokeWidth={10}
        strokeLinecap="round"
      />
      {/* Eshik chiziqlari — arqon taassuroti. */}
      <path
        d={`M ${x1} 0 C ${x1} ${yarim}, ${x2} ${yarim}, ${x2} ${balandlik}`}
        stroke={otilgan ? '#0E7C45' : '#B18F55'}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="3 7"
        opacity={0.55}
      />
    </svg>
  );
}

/**
 * YO'L BELGISI — sandiq, sertifikat, medal, bayroq.
 *
 * Emoji EMAS: emoji har qurilmada boshqacha chiziladi (Android, iOS va
 * Windows'da uch xil sandiq), o'lchami qatorga bog'liq va rangini
 * boshqarib bo'lmaydi. Vektor belgi hamma joyda bir xil ko'rinadi va
 * `currentColor` orqali doiraning rangiga bo'ysunadi.
 *
 * Manba: game-icons.net (CC BY 3.0) — fayllar `public/xarita/` da.
 */
function YolBelgisi({ nom, className }: { nom: string; className: string }) {
  /*
   * HAQIQIY ILLYUSTRATSIYA — bir rangli belgi emas.
   *
   * Avval siluet SVG'lar ishlatilgan edi va ular tanganing rangiga
   * bo'yalardi: sandiq oltin dog' bo'lib ko'rinardi. Endi rangli
   * illyustratsiya qo'yildi (`public/xarita/*.png`) — sandiq yog'och va
   * oltin, medal esa metall bo'lib ko'rinadi.
   *
   * Manba: publicdomainvectors.org — OCHIQ DOMEN, atribut talab qilmaydi.
   */
  return (
    <img
      src={`/xarita/${nom}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ filter: 'drop-shadow(0 4px 6px rgba(80,55,10,0.35))' }}
    />
  );
}


/**
 * OCHIQ KUN TUGUNI — o'tgan/tugagan kun ham, oltin a'zoda ochiq kelajak
 * kun ham AYNAN shu komponent.
 *
 * Ikkalasi ilgari alohida, deyarli bir xil JSX bo'lib yozilgan edi: bir
 * joyni tuzatib, ikkinchisini unutish oson bo'lardi. Ustiga xarita fayli
 * shu qadar chuqur ichma-ich bo'lib ketdiki, `tsc --noEmit` odatdagi
 * xotiraga sig'may qoldi. Ajratish ikkala muammoni ham hal qiladi.
 *
 * Farqi faqat RANGDA: tugagan kun yashil tanga va ✓, ochiq kun oltin
 * tanga va raqam.
 */
function OchiqKunTuguni({
  day,
  belgi,
  shiftPx,
  oldingiX,
  bolakOtilgan,
  tugagan,
  ochiq,
  bloklar,
  joriyBlok,
  bajarilgan,
  t,
  onTugma,
  onBlok,
}: {
  day: number;
  belgi: string | null;
  shiftPx: number;
  oldingiX: number;
  bolakOtilgan: boolean;
  /** Kun tugallanganmi — rang va belgi shunga qarab. */
  tugagan: boolean;
  ochiq: boolean;
  bloklar: QuestSlot[];
  joriyBlok: QuestSlot | null;
  bajarilgan: number;
  t: (key: string) => string;
  onTugma: () => void;
  onBlok: (blok: QuestSlot) => void;
}) {
  const tanga = tugagan
    ? {
        sinf: 'xarita-tanga xarita-tanga-yashil text-[16px] text-white',
        fon: 'linear-gradient(160deg, #5DE79E, #21B865 60%, #109150)',
        ichi: String(day),
        yozuv: 'text-[#12813F]',
      }
    : {
        sinf: 'xarita-tanga text-[13px] text-[#5A3E0B]',
        fon: 'linear-gradient(160deg, #FBEBC0, #D9A93F 60%, #B98B2C)',
        ichi: String(day),
        yozuv: 'text-[#C08A2D]',
      };

  return (
    <div className="relative z-[2] flex w-full flex-col items-center">
      <div className="relative h-[46px] w-full">
        <ArqonBolagi boshX={oldingiX} oxirX={shiftPx} balandlik={46} otilgan={bolakOtilgan} />
      </div>

      <button
        type="button"
        onClick={onTugma}
        className="flex flex-col items-center active:scale-95"
        aria-label={`Kun ${day}`}
        aria-expanded={ochiq}
        style={ochiq ? undefined : { transform: `translateX(${shiftPx}px)` }}
      >
        {/*
          BELGILI KUN — TANGASIZ: sandiq yoki medal yo'lning ustida turadi.
          Doira ichiga solinsa illyustratsiya kichrayib, nima ekani
          bilinmasdi.
        */}
        {belgi ? (
          <YolBelgisi nom={belgi} className="h-[52px] w-[52px]" />
        ) : (
          <span
            className={`flex h-[40px] w-[40px] items-center justify-center rounded-full font-black ring-4 ring-white ${tanga.sinf}`}
            style={{ background: tanga.fon }}
            aria-hidden
          >
            {tanga.ichi}
          </span>
        )}
        {/*
          "Kun N" yozuvi FAQAT raqam ko'rinmaganda: tugagan kunda doirada ✓
          turadi, belgili kunda esa rasm. Ochiq kunda raqam doiraning
          o'zida — yozuv ikki marta takrorlanib, 182 kunlik ro'yxatni
          uzaytirardi.
        */}
        {tugagan || belgi ? (
          <span className={`mt-1 text-[11px] font-black ${tanga.yozuv}`}>Kun {day}</span>
        ) : null}
      </button>

      {ochiq ? (
        <>
          <span aria-hidden className="mt-1 h-3 w-[3px] rounded-full bg-[#0B2A6B]/25" />
          <QadamlarKartasi
            bloklar={bloklar}
            joriyBlok={joriyBlok}
            bajarilgan={bajarilgan}
            sarlavha={`Kun ${day} qadamlari`}
            t={t}
            onBlok={onBlok}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * KUNNING QADAMLARI — XARITADAGI KARTA.
 *
 * BITTA komponent HAMMA kun uchun: bugungi kun ham, o'tgan kun ham, oltin
 * a'zoda ochiq turgan kelajak kun ham AYNAN shu kartani ko'rsatadi.
 *
 * Nima uchun bitta: ilgari faqat bugungi kun karta bilan, qolganlari esa
 * boshqa sahifadagi to'rtta katta plitka bilan ochilardi. Natijada o'quvchi
 * bir kunda bir ko'rinish, boshqa kunda butunlay boshqa ko'rinish ko'rardi.
 * Endi xarita bo'ylab hamma kun bir xil.
 */
function QadamlarKartasi({
  bloklar,
  joriyBlok,
  bajarilgan,
  sarlavha,
  t,
  onBlok,
}: {
  bloklar: QuestSlot[];
  /** Navbatdagi blok — "Hozir" yorlig'i va pastdagi tugma shunga tegishli. */
  joriyBlok: QuestSlot | null;
  bajarilgan: number;
  sarlavha: string;
  t: (key: string) => string;
  onBlok: (blok: QuestSlot) => void;
}) {
  return (
      <div className="mt-1 w-full max-w-[330px] overflow-hidden rounded-[20px] bg-white shadow-[0_14px_32px_-14px_rgba(11,42,107,0.4)] ring-1 ring-app-border">
        <div className="flex items-center justify-between border-b border-app-border/70 px-4 py-1.5">
          <span className="text-[10.5px] font-black uppercase tracking-[0.18em] text-[#0B2A6B]">
            {sarlavha}
          </span>
          <span className="text-[11px] font-black text-app-text-muted">
            {bajarilgan} / {bloklar.length}
          </span>
        </div>

        <ul className="divide-y divide-app-border/60">
          {bloklar.map((blok) => {
            const tugagan = blok.state === 'done';
            /*
             * "HOZIR" — FAQAT BITTASI.
             *
             * `state === 'active'` yetarli emas: oltin
             * hisobda 5-blok zanjirdan chiqarilgan va u
             * ham "active" bo'ladi. Natijada ekranda
             * ikkita "Hozir" turib, navbat qaysi biri
             * ekani yo'qolardi. Navbat — `joriyBlok`,
             * ya'ni birinchi bajarilmagani.
             */
            const hozir = blok.id === joriyBlok?.id;
            /* Ochiq, lekin navbat emas (oltin hisob). */
            const ochiq = !tugagan && !hozir && blok.canOpen;
            return (
              <li key={blok.id}>
                <button
                  type="button"
                  disabled={!blok.canOpen}
                  onClick={() => onBlok(blok)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition disabled:cursor-default ${
                    hozir ? 'bg-[#F2F6FF]' : ''
                  }`}
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={
                      tugagan
                        ? { background: '#22C55E', color: '#FFFFFF' }
                        : hozir
                          ? { background: '#0B2A6B', color: '#FFFFFF' }
                          : ochiq
                            ? { background: '#FFFFFF', color: '#0B2A6B', boxShadow: 'inset 0 0 0 2px #C7D3E8' }
                            : { background: '#EEF1F6', color: '#A3AFC2' }
                    }
                  >
                    {tugagan ? (
                      <Check className="h-4 w-4" strokeWidth={3.2} />
                    ) : hozir ? (
                      <ArrowRight className="h-4 w-4" strokeWidth={3} />
                    ) : ochiq ? null : (
                      <Lock className="h-3.5 w-3.5" strokeWidth={2.6} />
                    )}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[14px] ${
                      tugagan
                        ? 'font-bold text-[#12854A]'
                        : hozir
                          ? 'font-black text-[#0B2A6B]'
                          : ochiq
                            ? 'font-bold text-app-text'
                            : 'font-semibold text-app-text-muted'
                    }`}
                  >
                    {t(blok.titleKey)}
                  </span>
                  {hozir ? (
                    <span className="shrink-0 rounded-full bg-[#0B2A6B] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.14em] text-white">
                      Hozir
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {joriyBlok ? (
          <div className="border-t border-app-border/70 p-2.5">
            <button
              type="button"
              onClick={() => joriyBlok && onBlok(joriyBlok)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0B2A6B] px-4 text-[14px] font-black text-white shadow-[0_10px_24px_-12px_rgba(11,42,107,0.8)] transition active:scale-[0.99]"
            >
              {t(joriyBlok.titleKey)}ni boshlash
              <ArrowRight className="h-4 w-4" strokeWidth={2.8} />
            </button>
          </div>
        ) : (
          <div className="border-t border-app-border/70 px-4 py-3 text-center text-[12.5px] font-black text-[#12854A]">
            Bu kun tugadi
          </div>
        )}
      </div>
  );
}
