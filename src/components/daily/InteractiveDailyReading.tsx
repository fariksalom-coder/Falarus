import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import type { DailyReadingLexeme } from '../../../shared/dailyCourseDay';
import { normalizeRuWord } from '../../../shared/russianLexemeNormalize';
import { useAuth } from '../../context/AuthContext';
import { useQurilmaOrqaga } from '../../hooks/useQurilmaOrqaga';
import { prefetchSpeech, speakText, stopSpeaking } from '../../utils/speak';

type WordSheetState = {
  wordKey: string;
  surface: string;
  lexeme: DailyReadingLexeme | null;
  /**
   * Bosilgan so'zning O'ZI. Oynacha shu elementga tirab qo'yiladi va sahifa
   * sirg'alganda ham undan uzilmaydi — shuning uchun o'lchov emas, element
   * saqlanadi.
   */
  anchor: HTMLElement;
};

type TextToken =
  | { type: 'word'; value: string }
  | { type: 'space'; value: string }
  | { type: 'punct'; value: string };

function tokenizeText(text: string): TextToken[] {
  const chunks = text.match(/([А-Яа-яЁё-]+|\s+|[^\sА-Яа-яЁё-]+)/g) ?? [];
  const result: TextToken[] = [];
  chunks.forEach((chunk) => {
    if (/^[А-Яа-яЁё-]+$/.test(chunk)) {
      result.push({ type: 'word', value: chunk });
      return;
    }
    if (/^\s+$/.test(chunk)) {
      result.push({ type: 'space', value: chunk });
      return;
    }
    result.push({ type: 'punct', value: chunk });
  });
  return result;
}

function buildLexemeLookup(lexemes: DailyReadingLexeme[]): Map<string, DailyReadingLexeme> {
  const map = new Map<string, DailyReadingLexeme>();
  for (const L of lexemes) {
    const normFromDb = normalizeRuWord(L.wordRuNormalized || L.wordRu);
    if (normFromDb) map.set(normFromDb, L);
    const normSurface = normalizeRuWord(L.wordRu);
    if (normSurface && normSurface !== normFromDb) map.set(normSurface, L);
  }
  return map;
}

/**
 * TALAFFUZ TEZLIGI — lug'at kartochkalaridagi bilan AYNAN BIR XIL.
 *
 * Tezlik server keshining kalitiga kiradi. Boshqa qiymat qo'yilsa, kursning
 * allaqachon tayyor mingdan ortiq so'zi qaytadan generatsiya qilinardi:
 * o'quvchi kutardi va har so'z pulga tushardi. Bir xil tezlikda esa matndagi
 * tanish so'z darhol, keshdan yangraydi.
 */
const TALAFFUZ_TEZLIGI = 0.7;

/**
 * So'zni ovoz bilan o'qiydi.
 *
 * Ilgari bu yerda brauzerning `speechSynthesis` ishlatilardi — o'sha ROBOT
 * ovoz. U qurilmaga qarab butunlay boshqacha yangrardi, ba'zi brauzerlarda
 * ruscha ovoz umuman yo'q (Linux'da ovozlar ro'yxati bo'sh). Endi lug'at
 * kartochkalari bilan bitta manba: server ovozi. Server javob bermasa jim
 * o'tiladi (`zaxira: false`) — tushunarsiz robot talaffuzdan ko'ra jimlik
 * afzal, chunki o'quvchi noto'g'ri talaffuzni yodlab qolishi mumkin.
 */
function speakRussian(
  audioRu: string | null | undefined,
  wordRu: string,
  token: string | null
): Promise<void> {
  const trimmed = (audioRu ?? '').trim();
  const serverdan = () => speakText(wordRu, { token, speed: TALAFFUZ_TEZLIGI, zaxira: false });

  if (/^https?:\/\//i.test(trimmed)) {
    // Bazada tayyor yozuv bor — u eng aniq talaffuz, avval shuni chalamiz.
    stopSpeaking();
    try {
      const el = new Audio(trimmed);
      return el.play().catch(serverdan);
    } catch {
      return serverdan();
    }
  }
  return serverdan();
}

export type InteractiveDailyReadingProps = {
  title: string | null;
  bodyRu: string;
  lexemes: DailyReadingLexeme[];
  /** Masalan «A1» — bo‘sh bo‘lsa ko‘rinmaydi */
  levelBadge?: string | null;
  /** Yuqori label (masalan dialog bo‘limi) */
  sectionLabel?: string | null;
};

export function InteractiveDailyReading({
  title,
  bodyRu,
  lexemes,
  levelBadge,
  sectionLabel,
}: InteractiveDailyReadingProps) {
  const { token: authToken } = useAuth();
  const [sheet, setSheet] = useState<WordSheetState | null>(null);

  const tokens = useMemo(() => tokenizeText(bodyRu), [bodyRu]);
  const lookup = useMemo(() => buildLexemeLookup(lexemes), [lexemes]);

  // Sahifadan chiqilganda ovoz orqadan gapirib qolmasin.
  useEffect(() => stopSpeaking, []);

  const handleSpeak = useCallback(
    (lexeme: DailyReadingLexeme | null, surfaceWord: string) =>
      speakRussian(lexeme?.audioRu, surfaceWord, authToken),
    [authToken]
  );

  /* Barqaror bo'lishi kerak: oynacha shu funksiyalarga tinglovchi bog'laydi. */
  const avtoYopish = useCallback(() => setSheet(null), []);
  /*
   * Telefonning "ortga" tugmasi ochiq oynachani YOPSIN, sahifadan chiqarib
   * yubormasin.
   *
   * IKKI XIL YOPISH ATAYLAB AJRATILGAN:
   *  - `yopish` — ODAM yopganda (tashqariga bosish, Esc). U tarixdagi
   *    yozuvni ham iste'mol qiladi, aks holda keyingi "ortga" behuda ketardi.
   *  - `avtoYopish` — oynacha O'ZI yopilganda (so'z sirg'alib ekrandan
   *    chiqib ketdi). Bu yo'l tarixga TEGMASLIGI shart: sirg'alish
   *    foydalanuvchini sahifadan orqaga uloqtirib yuborardi.
   */
  const yopish = useQurilmaOrqaga(Boolean(sheet), avtoYopish);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') yopish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, yopish]);

  const showMeta = Boolean(title || levelBadge || sectionLabel);

  return (
    <div className="relative">
      <div className="rounded-[24px] bg-[color:var(--rd-white)] p-5 shadow-[0_18px_36px_-20px_rgba(11,113,103,0.28)] ring-1 ring-[color:var(--rd-border)] md:p-6">
        {/* Book badge + optional title/label header */}
        <div className="mb-4 flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px]"
            style={{ background: 'linear-gradient(140deg, #E1F5F1 0%, #BFF0E8 100%)' }}
          >
            📖
          </span>
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="text-[17px] font-bold uppercase tracking-[0.08em] text-[#0B2926] md:text-[18px]">
                {title}
              </h2>
            ) : null}
            {sectionLabel ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
                {sectionLabel}
              </p>
            ) : null}
            {!title && !sectionLabel ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
                Matn
              </p>
            ) : null}
          </div>
          {levelBadge ? (
            <span className="inline-flex shrink-0 rounded-full bg-[#E1F5F1] px-2.5 py-1 text-[11px] font-bold text-[#0B7167] ring-1 ring-[#BFF0E8]">
              {levelBadge}
            </span>
          ) : null}
        </div>

        <div className={`whitespace-pre-wrap text-[17px] leading-[2.1] text-[#0B2926] ${showMeta ? 'mt-3' : ''}`}>
          {tokens.map((bolak, index) => {
            if (bolak.type !== 'word') {
              return <span key={`t-${index}-${bolak.type}`}>{bolak.value}</span>;
            }

            const wordKey = `w-${index}-${bolak.value}`;
            const normalized = normalizeRuWord(bolak.value);
            const lexeme = lookup.get(normalized) ?? null;
            const isActive = sheet?.wordKey === wordKey;

            return (
              <button
                key={wordKey}
                type="button"
                onClick={(e) => {
                  setSheet({ wordKey, surface: bolak.value, lexeme, anchor: e.currentTarget });
                  /*
                   * OVOZNI DARHOL YUKLAB QO'YAMIZ — 🔊 bosilishini kutmasdan.
                   *
                   * Server yangi so'zni ~1.5-2 soniyada tayyorlaydi. Odam
                   * shu vaqtni tarjimani o'qishga sarflaydi, ya'ni tugmani
                   * bosganda ovoz allaqachon tayyor bo'ladi.
                   *
                   * Ikkinchi va MUHIMROQ sabab: brauzer ovozni faqat
                   * BOSISHGA YAQIN chalishga ruxsat beradi. Yuklash bosishdan
                   * keyin boshlansa, 2 soniyalik kutishdan so'ng ijro
                   * bloklanardi va tugma "ishlamayotgandek" tuyulardi.
                   */
                  if (!/^https?:\/\//i.test(String(lexeme?.audioRu ?? '').trim())) {
                    prefetchSpeech(bolak.value, { token: authToken, speed: TALAFFUZ_TEZLIGI });
                  }
                }}
                className={`reading-word-btn ${isActive ? 'reading-word-btn-active' : ''}`}
              >
                {bolak.value}
              </button>
            );
          })}
        </div>

        {/* Tip footer inside card */}
        <div className="mt-5 flex items-start gap-2 border-t border-dashed border-[#DCEBE7] pt-3.5 text-[12.5px] leading-snug text-[color:var(--rd-text-muted)]">
          <span aria-hidden className="text-[15px] leading-none">👆</span>
          <span className="font-medium">
            Har qanday so'zga bosing — tarjimasi shu so'zning yonida chiqadi
          </span>
        </div>
      </div>

      {/*
        TARJIMA OYNACHASI — bosilgan so'zning O'ZIDA.

        Ilgari bu pastki panel edi: o'quvchining ko'zi matndan ekran tagiga
        tushib, keyin qaytadan so'zni izlab topishi kerak edi. Endi oynacha
        so'z ustida (joy bo'lmasa — ostida) chiqadi va strelka bilan aynan
        qaysi so'z ekanini ko'rsatadi.
      */}
      {sheet ? (
        <SozOynachasi
          sheet={sheet}
          onClose={yopish}
          onAvtoYopish={avtoYopish}
          onSpeak={() => handleSpeak(sheet.lexeme, sheet.surface)}
        />
      ) : null}
    </div>
  );
}

/** Oynacha eni — telefonda ham ekranga sig'adi. */
const OYNACHA_MAX_EN = 280;
/** Ekran chetidan qoldiriladigan bo'shliq. */
const CHET_BOSHLIQ = 10;
/** So'z bilan oynacha orasidagi masofa (strelka shu yerga tushadi). */
const SOZ_MASOFA = 10;

type Joylashuv = {
  top: number;
  left: number;
  /** Strelkaning oynacha ichidagi gorizontal o'rni. */
  strelkaX: number;
  /** Oynacha so'zning OSTIDA turibdimi (tepada joy yetmagan). */
  pastda: boolean;
};

/**
 * So'z tarjimasi — so'zning yonidagi kichik oynacha.
 *
 * O'RNI: sukut bo'yicha so'zning USTIDA. Tepada joy yetmasa ostiga tushadi.
 * Gorizontal — so'z markazida, lekin ekran chetiga tirab, tashqariga
 * chiqmaydi; strelka esa baribir so'zni ko'rsatib turadi.
 *
 * SIRG'ALISH: sahifa sirg'alganda oynacha so'z bilan birga suriladi. So'z
 * ekrandan butunlay chiqib ketsa oynacha o'zi yopiladi — bo'sh joyda osilib
 * qolmasin.
 */
function SozOynachasi({
  sheet,
  onClose,
  onAvtoYopish,
  onSpeak,
}: {
  sheet: WordSheetState;
  /** Odam yopdi — tarix yozuvi ham iste'mol qilinadi. */
  onClose: () => void;
  /** Oynacha o'zi yopildi (so'z ekrandan chiqdi) — tarixga tegilmaydi. */
  onAvtoYopish: () => void;
  onSpeak: () => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [joy, setJoy] = useState<Joylashuv | null>(null);
  /*
   * Ovoz tayyorlanayotgani KO'RINSIN. Server yangi so'zni bir necha soniyada
   * tayyorlaydi va shu vaqt ichida tugma hech qanday javob bermasdi —
   * o'quvchi "ishlamayapti" deb qayta-qayta bosardi.
   */
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const hisobla = useCallback(() => {
    const el = ref.current;
    const soz = sheet.anchor;
    if (!el || !soz.isConnected) return;

    const a = soz.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // So'z ko'rinmay qolsa oynacha ham kerak emas (tarixga tegmaymiz).
    if (a.bottom < 0 || a.top > vh) {
      onAvtoYopish();
      return;
    }

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const pastda = a.top - SOZ_MASOFA - h < CHET_BOSHLIQ;
    const top = pastda
      ? Math.min(a.bottom + SOZ_MASOFA, vh - h - CHET_BOSHLIQ)
      : a.top - SOZ_MASOFA - h;
    const markaz = a.left + a.width / 2;
    const left = Math.min(Math.max(markaz - w / 2, CHET_BOSHLIQ), vw - w - CHET_BOSHLIQ);

    setJoy({
      top,
      left,
      strelkaX: Math.min(Math.max(markaz - left, 18), Math.max(w - 18, 18)),
      pastda,
    });
  }, [sheet.anchor, onAvtoYopish]);

  // Birinchi o'lchov — chizilishidan OLDIN, aks holda oynacha sakrab chiqadi.
  useLayoutEffect(() => {
    hisobla();
  }, [hisobla]);

  /*
   * Tashqariga bosilganda yopiladi. To'siq qatlami (`backdrop`) QO'YILMAGAN:
   * u birinchi bosishni yutib yuborardi va o'quvchi keyingi so'zni ko'rish
   * uchun ikki marta bosishga majbur bo'lardi. Endi bosish matnga yetib
   * boradi — ya'ni bitta bosishda oynacha keyingi so'zga ko'chadi.
   */
  useEffect(() => {
    const tashqarida = (e: PointerEvent) => {
      const el = ref.current;
      if (!(e.target instanceof Node)) return;
      if (el?.contains(e.target)) return;
      /*
       * Boshqa so'z bosilgan bo'lsa YOPMAYMIZ — oynacha o'sha so'zga
       * ko'chadi. Yopib qo'ysak, chiqish animatsiyasi endigina ochilayotgan
       * oynacha bilan to'qnashardi.
       */
      if (e.target instanceof Element && e.target.closest('.reading-word-btn')) return;
      onClose();
    };
    // `pointerdown` — bosish tugmaga yetib borishidan oldin ishlaydi, lekin
    // React'ning `click` hodisasini to'smaydi.
    document.addEventListener('pointerdown', tashqarida);
    return () => document.removeEventListener('pointerdown', tashqarida);
  }, [onClose]);

  useEffect(() => {
    let ramka = 0;
    const yangila = () => {
      cancelAnimationFrame(ramka);
      ramka = requestAnimationFrame(hisobla);
    };
    window.addEventListener('scroll', yangila, true);
    window.addEventListener('resize', yangila);
    return () => {
      cancelAnimationFrame(ramka);
      window.removeEventListener('scroll', yangila, true);
      window.removeEventListener('resize', yangila);
    };
  }, [hisobla]);

  /* Boshqa so'zga o'tilganda eski "yuklanmoqda" belgisi qolib ketmasin. */
  useEffect(() => setYuklanmoqda(false), [sheet.wordKey]);

  const eshit = useCallback(() => {
    if (yuklanmoqda) return;
    setYuklanmoqda(true);
    void onSpeak().finally(() => setYuklanmoqda(false));
  }, [onSpeak, yuklanmoqda]);

  const boshqaShakl =
    sheet.lexeme?.wordRu &&
    sheet.lexeme.wordRu.trim().toLowerCase() !== sheet.surface.trim().toLowerCase()
      ? sheet.lexeme.wordRu
      : null;

  /*
   * ODDIY `div` + CSS o'tishi — `motion.div` va `AnimatePresence` EMAS.
   *
   * Yordamchi oynachaga prujina fizikasi ham, chiqish animatsiyasi ham kerak
   * emas: u so'z bosilganda paydo bo'lib, bosilmay qolganda yo'qoladi.
   * Bitta qisqa CSS o'tishi shu ishni bajaradi va React holati o'zgarishi
   * bilanoq element DOMdan chiqadi — animatsiya kutilmaydi.
   */
  return (
    <div
        ref={ref}
        role="dialog"
        aria-label="So'z tarjimasi"
        className="fixed z-50 rounded-[18px] bg-[color:var(--rd-white)] px-3.5 py-3 shadow-[0_18px_40px_-14px_rgba(11,113,103,0.45)] ring-1 ring-[color:var(--rd-border)] transition-[opacity,transform] duration-150 ease-out"
        style={{
          top: joy?.top ?? 0,
          left: joy?.left ?? 0,
          width: `min(${OYNACHA_MAX_EN}px, calc(100vw - ${CHET_BOSHLIQ * 2}px))`,
          // O'lchanmaguncha ko'rinmaydi — chap yuqori burchakda chaqnab ketmasin.
          visibility: joy ? 'visible' : 'hidden',
          opacity: joy ? 1 : 0,
          transform: joy ? 'none' : 'translateY(4px) scale(0.96)',
        }}
      >
        {/* Strelka — qaysi so'z ekanini ko'rsatadi. */}
        {joy ? (
          <span
            aria-hidden
            className="absolute h-3 w-3 rotate-45 bg-[color:var(--rd-white)]"
            style={{
              left: joy.strelkaX - 6,
              [joy.pastda ? 'top' : 'bottom']: -6,
              borderTop: joy.pastda ? '1px solid var(--rd-border)' : 'none',
              borderLeft: joy.pastda ? '1px solid var(--rd-border)' : 'none',
              borderRight: joy.pastda ? 'none' : '1px solid var(--rd-border)',
              borderBottom: joy.pastda ? 'none' : '1px solid var(--rd-border)',
            }}
          />
        ) : null}

        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold leading-tight text-[#0B2926]">
              {sheet.surface}
            </p>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-[#0B7167]">
              {sheet.lexeme?.translationUz?.trim() || 'Tarjima topilmadi'}
            </p>
            {boshqaShakl ? (
              <p className="mt-1.5 text-[12px] font-semibold text-[color:var(--rd-text-muted)]">
                Asosi: {boshqaShakl}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={eshit}
            aria-label="Eshitish"
            aria-busy={yuklanmoqda}
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_20px_-8px_rgba(15,165,152,0.55)] transition hover:brightness-[1.05] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #25D19A 0%, #0FA598 60%, #0E8A80 100%)' }}
          >
            {yuklanmoqda ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Volume2 className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
    </div>
  );
}
