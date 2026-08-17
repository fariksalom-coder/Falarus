import { SkeletonRoyxat } from '../components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Link2, ListChecks, Puzzle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import type { DailyCourseDayBundle, DailyCourseMcq } from '../../shared/dailyCourseDay';
import { READING_QUESTIONS_PASS_PERCENT, isValidDailyCourseDay, FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';
import { VocabularyTaskList } from '../components/vocabulary/VocabularyTaskList';
import { InteractiveDailyReading } from '../components/daily/InteractiveDailyReading';
import SpeakingExercise from '../components/speaking/SpeakingExercise';
import UstozdanSora, { type UstozSentence } from '../components/lesson/UstozdanSora';
import UstozDoska from '../components/lesson/UstozDoska';
import type { DoskaTestSavol, DoskaVazifa } from '../api/ustozDoska';
import type { SpeakingTask } from '../api/speaking';
import type { KunlikDayPatch } from '../api/kunlikProgress';
import { loadDailyVocabProgress } from '../utils/dailyVocabProgress';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import { useLocale } from '../context/LocaleContext';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { useAccess } from '../context/AccessContext';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';

const SECTIONS = ['grammatika', 'lugat', 'oqish', 'gapirish'] as const;
export type KunlikSection = (typeof SECTIONS)[number];

type PageProps = {
  /** Marshrutda `:section` bo'lmaganda (masalan `/gapirish/tarjima`). */
  sectionOverride?: KunlikSection;
  /** Gapirish blokining kichik mavzusi. Berilmasa — mavzular ro'yxati. */
  speakingSub?: 'tarjima';
};

export default function DailyKunSectionPage({ sectionOverride, speakingSub }: PageProps = {}) {
  const { dayNum, section } = useParams<{ dayNum: string; section: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  const sec = (sectionOverride ?? section) as KunlikSection;
  useRememberKunlikDay(dayNumber);

  const [bundle, setBundle] = useState<DailyCourseDayBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const validSection = SECTIONS.includes(sec as KunlikSection);
  const gateEnabled = isValidDailyCourseDay(dayNumber) && validSection;
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);

  useEffect(() => {
    if (!token || !isValidDailyCourseDay(dayNumber) || !validSection) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getDailyCourseDay(token, dayNumber)
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : t('common.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, dayNumber, validSection, t]);

  if (!isValidDailyCourseDay(dayNumber) || !validSection) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F5F7FA] px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(kunlikRejaPath(dayNumber))}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <p className="text-center text-gray-600">{t('common.pageNotFound')}</p>
      </div>
    );
  }

  if (gatePending) {
    return <KunlikSequentialGateSpinner />;
  }

  const isGrammar = sec === 'grammatika';
  const isLugat = sec === 'lugat';
  const isOqish = sec === 'oqish';
  const usePurpleTheme = isGrammar || isLugat;
  const themeClass = usePurpleTheme ? 'grammar-theme' : isOqish ? 'reading-theme' : 'bg-[#F5F7FA]';
  return (
    <div className={`min-h-screen pb-28 ${themeClass}`}>
      <main className="mx-auto max-w-md space-y-4 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {isOqish ? null : (
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
              usePurpleTheme
                ? 'border border-[#DDD7F5] bg-[color:var(--rd-white)] text-[#2D1B69] shadow-[0_4px_10px_rgba(91,76,224,0.08)]'
                : 'border border-gray-200 bg-[color:var(--rd-white)] text-gray-700 shadow-sm hover:bg-gray-50'
            }`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {t('common.back')}
          </button>
        )}
        {loading && (
          <SkeletonRoyxat soni={3} className="py-4" />
        )}
        {!loading && err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        )}
        {!loading && !err && bundle && sec === 'grammatika' && (
          <GrammarFromBundle dayNumber={dayNumber} bundle={bundle} />
        )}
        {!loading && !err && bundle && sec === 'lugat' && (
          <DailyVocabHub dayNumber={dayNumber} bundle={bundle} />
        )}
        {!loading && !err && bundle && sec === 'oqish' && (
          <ReadingFromBundle bundle={bundle} dayNumber={dayNumber} />
        )}
        {!loading && !err && bundle && sec === 'gapirish' && (
          /*
           * Gapirish bloki IKKI mavzudan iborat: tarjima va ochiq topshiriqlar.
           * Ikkinchi mavzu kontenti yo'q kunlarda ro'yxat ko'rsatilmaydi —
           * bitta mavzu uchun ortiqcha bosish bo'lmasin.
           */
          speakingSub === 'tarjima' || (bundle.speakingTasks ?? []).length === 0 ? (
            <PracticeFromBundle bundle={bundle} dayNumber={dayNumber} />
          ) : (
            <SpeakingTopicList bundle={bundle} dayNumber={dayNumber} />
          )
        )}
      </main>
    </div>
  );
}

function GrammarFromBundle({ dayNumber, bundle }: { dayNumber: number; bundle: DailyCourseDayBundle }) {
  const navigate = useNavigate();
  const { getDay, loaded: kunlikLoaded, patchDay } = useKunlikProgress();
  const grammarGapPatchSent = useRef(false);
  const g = bundle.grammar;
  const kp = kunlikLoaded ? getDay(dayNumber) : null;

  /**
   * "Ustozdan so'ra" uchun o'qiladigan gaplar — kunning O'Z materialidan.
   * Gap tuzish mashqlarining javobi tayyor rus gapi bo'ladi; topshiriq matni
   * o'zbekcha bo'lsa, u gapning ma'nosi sifatida ishlatiladi.
   */
  const ustozSentences = useMemo<UstozSentence[]>(() => {
    if (!g) return [];
    const seen = new Set<string>();
    const out: UstozSentence[] = [];
    for (const s of g.sentenceArrange) {
      const ru = String(s.answerRu ?? '').trim();
      if (!ru || seen.has(ru)) continue;
      seen.add(ru);
      out.push({ ru, uz: s.promptLang === 'uz' ? String(s.promptText ?? '').trim() || undefined : undefined });
      if (out.length >= 5) break;
    }
    return out;
  }, [g]);

  /**
   * Doska uchun kunning VAZIFALARI. Ustoz mavzuni umumiy gapirmaydi — aynan
   * shu mashqlarni kengaytirib tushuntiradi, ya'ni o'quvchi mashqqa kirishdan
   * oldin nima talab qilinishini va nega shundayligini biladi.
   */
  const doskaVazifalar = useMemo<DoskaVazifa[]>(() => {
    if (!g) return [];
    const out: DoskaVazifa[] = [];

    const mcqToVazifa = (m: DailyCourseMcq): DoskaVazifa => {
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

    // Qoida testlari — mavzuning o'zini tekshiradi, shuning uchun birinchi.
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
  }, [g]);

  /**
   * Darsning yakuniy testi — kunning O'Z savol bankidan.
   *
   * Ilgari doskada modelning bitta nazorat savoli turardi: o'quvchi mavzuni
   * tinglab, bir savol bilan darsni tugatardi. Bazada esa har kun uchun
   * 10-20 ta tayyor savol bor edi va ular ishlatilmasdan qolardi.
   *
   * Har kirishda tartib aralashtiriladi: dars ikkinchi marta ochilganda ham
   * savollar yodlab olingan bo'lmasin. Qoida testlari birinchi (mavzuning
   * o'zini tekshiradi), yetmasa gap testlari bilan to'ldiriladi.
   */
  const doskaTestSavollari = useMemo<DoskaTestSavol[]>(() => {
    if (!g) return [];
    const KERAK = 6;

    const toSavol = (m: DailyCourseMcq): DoskaTestSavol | null => {
      const variantlar = [m.optionA, m.optionB, m.optionC, m.optionD].map((o) => String(o ?? '').trim());
      const savol = String(m.questionText ?? '').trim();
      if (!savol || variantlar.some((v) => !v)) return null;
      if (m.correctIndex < 0 || m.correctIndex > 3) return null;
      return { savol, variantlar, togriIndex: m.correctIndex, izoh: m.explanation || undefined };
    };

    const aralashtir = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const qoida = aralashtir(g.ruleMcqs).map(toSavol).filter((q): q is DoskaTestSavol => q !== null);
    const gap = aralashtir(g.sentenceMcqs).map(toSavol).filter((q): q is DoskaTestSavol => q !== null);

    // Kamida oltita; qoida savollari yetarli bo'lsa gap testlariga o'tilmaydi.
    return [...qoida, ...gap].slice(0, Math.max(KERAK, Math.min(qoida.length, 8)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, dayNumber]);

  useEffect(() => {
    grammarGapPatchSent.current = false;
  }, [dayNumber]);

  useEffect(() => {
    if (!kunlikLoaded || !g || grammarGapPatchSent.current) return;
    const patch: KunlikDayPatch = {};
    const usableSentence = g.sentenceArrange.filter(
      (t) => t.wordBank.length > 0 && String(t.answerRu ?? '').trim() !== '',
    );
    const hasAnyGrammarContent =
      g.ruleMcqs.length > 0 ||
      g.sentenceMcqs.length > 0 ||
      g.matchSets.some((s) => s.pairs.length > 0) ||
      usableSentence.length > 0 ||
      Boolean(g.topic && (g.topic.title || g.topic.theoryText));

    // Only auto-complete grammar_1 for truly empty grammar days.
    if (!hasAnyGrammarContent) patch.grammar_1 = true;
    if (!g.matchSets.some((s) => s.pairs.length > 0)) patch.grammar_2 = true;
    if (usableSentence.length === 0) patch.grammar_3 = true;
    if (Object.keys(patch).length === 0) return;
    grammarGapPatchSent.current = true;
    patchDay(dayNumber, patch);
  }, [kunlikLoaded, g, dayNumber, patchDay]);
  if (!g) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] border border-slate-200/90 bg-[color:var(--rd-white)] p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200/90 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-36 rounded-md bg-slate-200 animate-pulse" />
              <div className="h-3 w-full max-w-[14rem] rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-[94%] rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-[82%] rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-[70%] rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        <DailyGrammarMashqlarGrid
          kunlikLoaded={kunlikLoaded}
          grammar1Done={kp.grammar_1}
          grammar2Done={kp.grammar_2}
          grammar3Done={kp.grammar_3}
          ruleMcqsCount={0}
          matchSetsCount={0}
          sentenceArrangeCount={0}
          sentenceMcqsCount={0}
        />
      </div>
    );
  }

  // Nazariya matni EKRANDA KO'RSATILMAYDI — u faqat ustozning darsiga manba
  // bo'lib xizmat qiladi (`UstozDoska`ga `nazariya` sifatida uzatiladi).
  const dayCaption = g.topic?.title ? `KUN ${dayNumber} · GRAMMATIKA` : '';

  if (!kunlikLoaded) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] border border-slate-200/90 bg-[color:var(--rd-white)] p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <p className="mb-3 text-sm font-semibold text-slate-600">Mashqlar</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mx-auto h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-2.5 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /*
   * BIRINCHI BAJARILMAGAN MASHQ.
   *
   * Mashqlar zanjir bo'lib ketadi (test -> juftlik -> gap tuzish), lekin
   * zanjirning BOSHIGA kirish kerak. Tartib mashqlar panelidagi ochilish
   * qoidasi bilan bir xil: oldingisi bajarilmaguncha keyingisi ochilmaydi,
   * shuning uchun bu yerda ham birinchi ochiq turgani tanlanadi. Hammasi
   * bajarilgan bo'lsa `null` — o'shanda faqat mashqlar paneli ko'rsatiladi.
   */
  const grammatikaYoli = (qism: string) => `/kunlik-reja/kun/${dayNumber}/grammatika/${qism}`;
  const testBor = g.ruleMcqs.length > 0;
  const juftlikBor = g.matchSets.some((s) => s.pairs.length > 0);
  const gapBor = g.sentenceArrange.some(
    (s) => s.wordBank.length > 0 && String(s.answerRu ?? '').trim() !== ''
  );
  const birinchiVazifaYoli =
    testBor && !kp?.grammar_1
      ? grammatikaYoli('test-variantlar')
      : juftlikBor && !kp?.grammar_2
        ? grammatikaYoli('juftlik')
        : gapBor && !kp?.grammar_3
          ? grammatikaYoli('gap-tuzish')
          : null;

  // Bir ekranda bitta blok. Kunda bo'lmagan blok bosqich sifatida ham chiqmaydi.
  const steps: GrammarStep[] = [];
  if (g.topic?.title) {
    steps.push({
      key: 'doska',
      label: 'Tushuntirish',
      ownPrimary: true,
      fullscreen: true,
      node: ({ bosqichga }) => (
        <UstozDoska
          key={`${dayNumber}-${g.topic!.title}`}
          mavzu={g.topic!.title}
          nazariya={g.topic!.theoryText}
          kun={dayNumber}
          vazifalar={doskaVazifalar}
          testSavollari={doskaTestSavollari}
          keyingiNomi="Vazifalar"
          toliqEkran
          onChiqish={() => navigate(-1)}
          /*
            Dars tugagach o'quvchi TO'G'RIDAN-TO'G'RI birinchi bajarilmagan
            mashqqa tushadi — mashqlar esa o'zaro zanjirlangan (test ->
            juftlik -> gap tuzish). Oqimning o'zi ham "Vazifalar" bosqichiga
            suriladi: mashqdan qaytganda doska qaytadan ochilib ketmasin.
          */
          onTugadi={() => {
            bosqichga('vazifa');
            if (birinchiVazifaYoli) navigate(birinchiVazifaYoli);
          }}
        />
      ),
    });
  }
  steps.push({
    key: 'vazifa',
    label: 'Vazifalar',
    node: () => (
      <DailyGrammarMashqlarGrid
        kunlikLoaded={kunlikLoaded}
        grammar1Done={kp?.grammar_1 ?? false}
        grammar2Done={kp?.grammar_2 ?? false}
        grammar3Done={kp?.grammar_3 ?? false}
        ruleMcqsCount={g.ruleMcqs.length}
        matchSetsCount={g.matchSets.filter((s) => s.pairs.length > 0).length}
        sentenceArrangeCount={g.sentenceArrange.length}
        sentenceMcqsCount={g.sentenceMcqs.length}
        onOpenTest={testBor ? () => navigate(grammatikaYoli('test-variantlar')) : undefined}
        onOpenMatch={juftlikBor ? () => navigate(grammatikaYoli('juftlik')) : undefined}
        onOpenSentence={gapBor ? () => navigate(grammatikaYoli('gap-tuzish')) : undefined}
      />
    ),
  });
  /*
   * "Ustozdan so'ra" — mashqlardan KEYIN.
   *
   * Ilgari u darsdan keyin ikkinchi bosqich edi va o'quvchi kunning asosiy
   * vazifalariga yetib bormasdan ovozli mashqqa tushib qolardi. Endi tartib
   * kun mantig'iga mos: tushuntirish -> vazifalar -> qo'shimcha ovozli mashq.
   */
  if (ustozSentences.length > 0) {
    steps.push({
      key: 'ustoz',
      label: "Ustozdan so'ra",
      node: ({ keyingiga, keyingiNomi }) => (
        <UstozdanSora
          sentences={ustozSentences}
          onTugadi={keyingiga ?? (() => navigate(kunlikRejaPath(dayNumber)))}
          keyingiNomi={keyingiNomi ?? 'Kunlik reja'}
        />
      ),
    });
  }

  return (
    <div className="space-y-5">
      {/* Day topic header — purple caption + big rounded title */}
      {g.topic?.title ? (
        <div className="mb-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8B7FAB]">
            {dayCaption}
          </p>
          <h1 className="grammar-heading mt-1.5 text-[26px] leading-[1.1] text-[#2D1B69]">
            {g.topic.title}
          </h1>
        </div>
      ) : null}

      <GrammarStepFlow dayNumber={dayNumber} steps={steps} title={g.topic?.title ?? ''} />
    </div>
  );
}

/**
 * Grammatika kuni bosqichma-bosqich ko'rsatiladi: bir ekranda bitta blok.
 * Ilgari tushuntirish, nazariya, "Ustozdan so'ra" va vazifalar bitta uzun
 * ro'yxatda turardi — o'quvchi qaysi biridan boshlashni bilmasdi.
 */
/** Bosqich o'z yakunida oqimni boshqarishi uchun beriladigan vositalar. */
type OqimApi = {
  /** Keyingi bosqichga o'tkazadi; oxirgi bosqichda `null`. */
  keyingiga: (() => void) | null;
  /** Keyingi bosqichning nomi — tugmada yoziladi. */
  keyingiNomi?: string;
  /** Ma'lum bosqichga o'tkazadi (kaliti bo'yicha; topilmasa hech narsa qilmaydi). */
  bosqichga: (kalit: string) => void;
};

type GrammarStep = {
  key: string;
  label: string;
  /**
   * Bosqich mazmuni.
   *
   * Nima uchun funksiya: dars tugagach ekranda "Dars yakunlandi" yozuvi
   * qolar va o'quvchi kun SHU YERDA tugadi deb o'ylardi — keyingi bosqichga
   * o'tish faqat tepadagi kichkina yozuvda edi. Endi har bosqich o'z yakunida
   * keyingisiga o'tkazuvchi asosiy tugmani ko'rsata oladi.
   */
  node: (oqim: OqimApi) => ReactNode;
  /**
   * Bosqichning O'ZIDA asosiy tugma bo'lsa (masalan ustoz darsidagi
   * "Keyingisi"), pastdagi o'tish tugmasi ikkinchi darajali ko'rinishga
   * o'tadi — bir ekranda ikkita bir xil to'q tugma turmasin.
   */
  ownPrimary?: boolean;
  /**
   * To'liq ekran: ustoz gapirganda sarlavha, bosqich chizig'i va pastki
   * menyu chalg'itmasligi uchun bosqich butun ekranni egallaydi.
   */
  fullscreen?: boolean;
};

const GRAMMAR_STEP_KEY = 'falarus:kun-grammatika-qadam';

/**
 * Bosqichni BUTUN EKRANGA chiqaradi (ilova menyusi ham berkitiladi).
 *
 * Sarlavha qatori YO'Q. Ilgari bu yerda mavzu nomi va "←" turardi; ular
 * doskadan tashqarida qo'shimcha qator egallardi va telefonda dars uchun
 * balandlik qolmasdi. Endi ekranda faqat doska bo'ladi, boshqaruv esa
 * doskaning o'z ustida suzadi (`UstozDoska`, `toliqEkran`).
 */
function FullscreenStep({ children }: { children: ReactNode }) {
  // Orqa fon sirg'almasin.
  useEffect(() => {
    const oldi = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oldi;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#081419' }}>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function GrammarStepFlow({
  dayNumber,
  steps,
  title,
}: {
  dayNumber: number;
  steps: GrammarStep[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // Kun almashganda o'quvchi qolgan joyidan davom etadi.
  useEffect(() => {
    if (steps.length === 0) return;
    let saved = 0;
    try {
      saved = Number(localStorage.getItem(`${GRAMMAR_STEP_KEY}:${dayNumber}`) ?? 0);
    } catch {
      saved = 0;
    }
    setIndex(Number.isFinite(saved) ? Math.min(Math.max(saved, 0), steps.length - 1) : 0);
  }, [dayNumber, steps.length]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      try {
        localStorage.setItem(`${GRAMMAR_STEP_KEY}:${dayNumber}`, String(next));
      } catch {
        /* saqlab bo'lmasa ham oqim ishlayveradi */
      }
      // Yangi bosqich boshidan ko'rinsin — aks holda o'rtasidan ochiladi.
      window.requestAnimationFrame(() =>
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    },
    [dayNumber]
  );

  if (steps.length === 0) return null;

  const safeIndex = Math.min(index, steps.length - 1);
  const current = steps[safeIndex];
  const nextStep = steps[safeIndex + 1];
  const hasPrev = safeIndex > 0;

  const oqimApi: OqimApi = {
    keyingiga: nextStep ? () => goTo(safeIndex + 1) : null,
    keyingiNomi: nextStep?.label,
    bosqichga: (kalit) => {
      const joy = steps.findIndex((st) => st.key === kalit);
      if (joy >= 0) goTo(joy);
    },
  };

  /*
   * USTOZ DARSI TO'LIQ EKRANDA.
   *
   * Ilgari darsning tepasida kun sarlavhasi va bosqich chizig'i, pastida
   * o'tish tugmalari va ilova menyusi turardi — ustoz gapirayotganda ular
   * faqat chalg'itardi. Endi bosqich butun ekranni egallaydi, tepada esa
   * ingichka qator: chiqish va keyingi bosqichga o'tish.
   */
  if (current.fullscreen) {
    return (
      <FullscreenStep>{current.node(oqimApi)}</FullscreenStep>
    );
  }

  return (
    <div className="space-y-5">
      <div ref={topRef} className="scroll-mt-3" />

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8B7FAB]">
            {safeIndex + 1} / {steps.length} · {current.label}
          </p>
          {nextStep ? (
            <p className="shrink-0 truncate text-[11px] font-bold text-[#A79BC7]">
              Keyingisi: {nextStep.label}
            </p>
          ) : null}
        </div>
        <div className="mt-1 flex gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}-bosqich: ${s.label}`}
              aria-current={i === safeIndex ? 'step' : undefined}
              className="flex-1 py-2 outline-none"
            >
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  i <= safeIndex ? 'bg-[#5B4CE0]' : 'bg-[#E6E1F7]'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="space-y-5"
        >
          {current.node(oqimApi)}
        </motion.div>
      </AnimatePresence>

      {hasPrev || nextStep ? (
        <div className="flex items-center gap-2.5">
          {hasPrev ? (
            <button
              type="button"
              onClick={() => goTo(safeIndex - 1)}
              className="flex min-h-[52px] items-center gap-1.5 rounded-2xl border border-[#E6E1F7] bg-[color:var(--rd-white)] px-4 text-[14px] font-bold text-[#5B4CE0] transition active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Ortga
            </button>
          ) : null}
          {nextStep ? (
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              className={
                current.ownPrimary
                  ? 'flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E6E1F7] bg-[color:var(--rd-white)] px-4 text-[15px] font-bold text-[#5B4CE0] transition active:scale-[0.98]'
                  : 'flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B4CE0] px-4 text-[15px] font-black text-white shadow-[0_12px_26px_-12px_rgba(91,76,224,0.85)] transition active:scale-[0.98]'
              }
            >
              {current.ownPrimary ? `${nextStep.label}ga o'tish` : nextStep.label}
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DailyGrammarMashqlarGrid({
  kunlikLoaded,
  grammar1Done,
  grammar2Done,
  grammar3Done,
  ruleMcqsCount,
  matchSetsCount,
  sentenceArrangeCount,
  sentenceMcqsCount,
  onOpenTest,
  onOpenMatch,
  onOpenSentence,
}: {
  kunlikLoaded: boolean;
  grammar1Done: boolean;
  grammar2Done: boolean;
  grammar3Done: boolean;
  ruleMcqsCount: number;
  matchSetsCount: number;
  sentenceArrangeCount: number;
  sentenceMcqsCount: number;
  onOpenTest?: () => void;
  onOpenMatch?: () => void;
  onOpenSentence?: () => void;
}) {
  const { t } = useLocale();
  type Row = {
    vazifaNum: number;
    hint: string;
    Icon: LucideIcon;
    count: number;
    onPress?: () => void;
    emptyHint: string;
    sequentialLocked: boolean;
    seqHint: string | null;
  };

  const unlock2 =
    kunlikLoaded &&
    (ruleMcqsCount === 0 || grammar1Done || grammar2Done || grammar3Done);
  const unlock3 =
    kunlikLoaded &&
    (matchSetsCount === 0 || grammar2Done || grammar3Done) &&
    unlock2;

  const rows: Row[] = [
    {
      vazifaNum: 1,
      hint: t('kunlik.selectAnswer'),
      Icon: ListChecks,
      count: ruleMcqsCount,
      onPress: onOpenTest,
      emptyHint: t('kunlik.noQuestions'),
      sequentialLocked: false,
      seqHint: null,
    },
    {
      vazifaNum: 2,
      hint: t('kunlik.stepPairs'),
      Icon: Link2,
      count: matchSetsCount,
      onPress: onOpenMatch,
      emptyHint: t('kunlik.noMatchPairs'),
      sequentialLocked: matchSetsCount > 0 && !unlock2,
      seqHint: t('kunlik.seqHint2'),
    },
    {
      vazifaNum: 3,
      hint: t('kunlik.arrangeSentence'),
      Icon: Puzzle,
      count: sentenceArrangeCount,
      onPress: onOpenSentence,
      emptyHint: t('kunlik.noTasks'),
      sequentialLocked: sentenceArrangeCount > 0 && !unlock3,
      seqHint: t('kunlik.seqHint3'),
    },
  ];

  const emojiFor = (n: number) => (n === 1 ? '✅' : n === 2 ? '🔗' : '🧩');
  const shortTitleFor = (n: number) =>
    n === 1 ? "To'g'ri variant" : n === 2 ? 'Juftini toping' : 'Gap tuzish';
  const captionFor = (n: number, isActive: boolean, isDone: boolean) => {
    const num = `VAZIFA ${n}`;
    if (isDone) return `${num} · BAJARILDI`;
    if (isActive) return `${num} · HOZIR`;
    return num;
  };

  const doneCount = [grammar1Done, grammar2Done, grammar3Done].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);

  return (
    <div className="mt-2">
      {/* Header row: "3 ta vazifa" + progress */}
      <div className="mb-3 flex items-center gap-3">
        <p className="grammar-heading text-[18px] leading-none text-[#2D1B69]">
          3 ta vazifa
        </p>
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-black text-[#8B7FAB]">
            {doneCount}/3
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map(({ vazifaNum, hint, count, onPress, emptyHint, sequentialLocked, seqHint }) => {
          const empty = count === 0;
          const actionable = count > 0 && !!onPress && !sequentialLocked;
          const comingSoon = count > 0 && !onPress && !sequentialLocked;

          const slotDone =
            vazifaNum === 1 ? grammar1Done : vazifaNum === 2 ? grammar2Done : grammar3Done;
          const done = count > 0 && slotDone && !sequentialLocked;
          const active = actionable && !slotDone;
          const locked = sequentialLocked || comingSoon || (!actionable && !done && !empty);
          const disabled = empty || sequentialLocked || comingSoon;

          const emoji = emojiFor(vazifaNum);
          const shortTitle = shortTitleFor(vazifaNum);
          const caption = captionFor(vazifaNum, active, done);

          const subtitleMuted = sequentialLocked && seqHint
            ? seqHint
            : empty
              ? emptyHint
              : locked
                ? "Avval oldingi vazifani tugating"
                : hint;

          // Card style based on state
          const cardStyle: React.CSSProperties = done
            ? {
                background: '#DCFCE7',
                border: '1.5px solid #82E5B8',
                boxShadow: '0 8px 18px -8px rgba(34,197,94,0.24)',
              }
            : active
              ? {
                  background: '#5B4CE0',
                  border: 'none',
                  boxShadow: '0 14px 30px -12px rgba(91,76,224,0.55)',
                }
              : {
                  background: '#FFFFFF',
                  border: '1.5px solid #DDD7F5',
                  boxShadow: '0 6px 14px -8px rgba(45,27,105,0.06)',
                };

          const iconBg = done ? '#22C55E' : active ? 'rgba(255,255,255,0.16)' : '#F0EDFB';
          const iconTextColor = done ? '#FFFFFF' : active ? '#FFFFFF' : '#8B7FAB';
          const captionColor = done ? '#0F7C3A' : active ? 'rgba(255,255,255,0.7)' : '#8B7FAB';
          const titleColor = done ? '#0F7C3A' : active ? '#FFFFFF' : locked ? '#8B7FAB' : '#2D1B69';

          return (
            <button
              key={vazifaNum}
              type="button"
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => {
                if (actionable) onPress?.();
              }}
              className="w-full rounded-[20px] p-4 text-left transition-transform active:scale-[0.99] disabled:cursor-default"
              style={cardStyle}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[22px] leading-none ${locked ? 'grayscale' : ''}`}
                  style={{ background: iconBg, color: iconTextColor }}
                >
                  {done ? '✓' : locked ? '🔒' : emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.16em]"
                    style={{ color: captionColor }}
                  >
                    {caption}
                  </p>
                  <p
                    className="grammar-heading mt-0.5 truncate text-[18px] leading-tight"
                    style={{ color: titleColor }}
                  >
                    {shortTitle}
                  </p>
                  {!done && !active && (
                    <p
                      className="mt-0.5 truncate text-[12px] font-semibold"
                      style={{ color: locked ? '#8B7FAB' : '#8B7FAB' }}
                    >
                      {count > 0 ? `${count} ta topshiriq` : subtitleMuted}
                    </p>
                  )}
                  {done && (
                    <p className="mt-0.5 text-[12px] font-black text-[#0F7C3A]">
                      ✓ TUGADI · {count} ta
                    </p>
                  )}
                </div>

                {done ? null : active ? null : (
                  <span className="grammar-heading shrink-0 text-[14px] text-[#8B7FAB]">
                    {locked ? '' : ''}
                  </span>
                )}
              </div>

              {active && (
                <div className="mt-3">
                  <span className="flex items-center justify-center rounded-[14px] bg-[color:var(--rd-white)] px-4 py-3 text-[14px] font-black text-[#5B4CE0] shadow-[0_4px_10px_rgba(45,27,105,0.12)]">
                    Davom etish →
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {sentenceMcqsCount > 0 ? (
        <p className="mt-3 text-center text-xs text-[#8B7FAB]">
          {t('kunlik.sentenceTestSoon', { count: sentenceMcqsCount })}
        </p>
      ) : null}
    </div>
  );
}

function DailyVocabHub({ dayNumber, bundle }: { dayNumber: number; bundle: DailyCourseDayBundle }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { getDay } = useKunlikProgress();
  const w = bundle.vocabulary;
  const totalWords = w?.words?.length ?? 0;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener('daily-vocab-progress', fn as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', fn as EventListener);
  }, []);

  void tick;

  if (!w?.words?.length) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-[color:var(--rd-white)] px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
        {t('kunlik.noVocabRows')}
      </p>
    );
  }

  const p = loadDailyVocabProgress(dayNumber);
  const kp = getDay(dayNumber);
  const vocabDoneOnServer = kp.words_match;
  const step1CompletedUi = p.step1Completed || kp.words_learned > 0 || vocabDoneOnServer;
  const step2PassedUi = p.step2Passed || vocabDoneOnServer;
  const step3CompletedUi = p.step3Completed || vocabDoneOnServer;
  const learnedWords = step2PassedUi
    ? totalWords
    : p.step2Completed
      ? p.step2Correct
      : step1CompletedUi
        ? Math.max(p.step1Known, kp.words_learned)
        : 0;

  const step2Pct =
    p.step2Completed && p.step2Correct + p.step2Incorrect > 0
      ? Math.round((p.step2Correct / (p.step2Correct + p.step2Incorrect)) * 100)
      : 0;

  // 4-vazifa (iboralar) faqat shu kunda kontent bo'lsa ko'rinadi — bo'sh
  // kunlarda foydalanuvchi ochib, "ma'lumot yo'q" ekraniga tushmasin.
  const phraseCount = w?.phrases?.length ?? 0;
  const base = `/kunlik-reja/kun/${dayNumber}/lugat`;

  return (
    <VocabularyTaskList
      partTitle={t('kunlik.vocabWords')}
      learnedWords={learnedWords}
      totalWords={totalWords}
      hasServerSnapshot={totalWords > 0}
      step1Completed={step1CompletedUi}
      step1KnownDisplay={Math.max(p.step1Known, kp.words_learned)}
      step1UnknownDisplay={p.step1Unknown}
      step2Completed={p.step2Completed || vocabDoneOnServer}
      step2Passed={step2PassedUi}
      step2CorrectDisplay={Math.max(p.step2Correct, kp.words_correct)}
      step2IncorrectDisplay={p.step2Incorrect}
      step2PercentageDisplay={step2Pct}
      step3Unlocked={step2PassedUi}
      step3Completed={step3CompletedUi}
      hasPhrases={phraseCount > 0}
      step4Completed={p.step4Completed || kp.phrases_done}
      onOpenStep1={() => navigate(`${base}/tanishish`)}
      onOpenStep2={() => navigate(`${base}/test`)}
      onOpenStep3={() => navigate(`${base}/juftlik`)}
      onOpenStep4={() => navigate(`${base}/iboralar`)}
      wordPreviews={w?.words?.map((row) => row.wordRu).filter(Boolean) ?? []}
    />
  );
}

function ReadingFromBundle({ bundle, dayNumber }: { bundle: DailyCourseDayBundle; dayNumber: number }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { patchDay, getDay } = useKunlikProgress();
  const r = bundle.reading;
  const dayRow = getDay(dayNumber);
  const oqishDone = dayRow.oqish_done;
  const [finishReady, setFinishReady] = useState(oqishDone);

  useEffect(() => {
    if (oqishDone) {
      setFinishReady(true);
      return;
    }
    setFinishReady(false);
    const id = window.setTimeout(() => setFinishReady(true), 10_000);
    return () => window.clearTimeout(id);
  }, [oqishDone, dayNumber]);

  if (!r?.bodyRu && !(r?.lexemes?.length)) {
    return (
      <p className="rounded-2xl border border-[#DCEBE7] bg-[color:var(--rd-white)] px-4 py-6 text-center text-sm text-[color:var(--rd-text-muted)] shadow-sm">
        {t('kunlik.noReadingContent')}
      </p>
    );
  }

  /*
   * Matn savollari BO'LSA — «Tugatish» to'g'ridan-to'g'ri blokni yopmaydi,
   * balki testga olib o'tadi: o'qish bloki faqat 70% to'plangach yakunlanadi
   * (server ham `oqish_done` ni klientdan qabul qilmaydi).
   */
  const questionCount = r?.questions?.length ?? 0;
  const hasQuestions = questionCount > 0;

  /*
   * Testni ALLAQACHON topshirganmi (70%+).
   *
   * Bu tekshiruv `oqish_done` dan alohida: savollar qo'shilishidan OLDIN
   * o'qishni tugatgan foydalanuvchilarda `oqish_done` allaqachon `true`, va
   * ular uchun sahifada hech qanday tugma chiqmasdi — ya'ni yangi savollarni
   * umuman ko'ra olmasdi. Ularning tugallangan kunini bekor qilmaymiz, lekin
   * testga kirish yo'lini ochamiz.
   */
  const passedQuestions =
    hasQuestions &&
    Math.round(((dayRow.text_questions_correct ?? 0) / questionCount) * 100) >=
      READING_QUESTIONS_PASS_PERCENT;
  const questionsPending = hasQuestions && !passedQuestions;

  const finishReading = async () => {
    if (hasQuestions) {
      navigate(`/kunlik-reja/kun/${dayNumber}/oqish/savollar`);
      return;
    }
    // Grammatikadagi kabi: reja sahifasi mount bo'lishi bilan progressni
    // serverdan qayta o'qiydi, shuning uchun patch yozilib bo'lgunicha kutiladi.
    await patchDay(dayNumber, { oqish_done: true });
    navigate(kunlikRejaPath(dayNumber));
  };

  const title = r.title?.trim() || 'Matn';

  return (
    <div className="space-y-4">
      {/* Premium header: back tile + pill + serif title + streak badge */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(kunlikRejaPath(dayNumber))}
          aria-label={t('common.back')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[color:var(--rd-white)] text-[color:var(--rd-text)] shadow-[0_6px_16px_-6px_rgba(15,165,152,0.28)] ring-1 ring-[#DCEBE7] transition active:scale-[0.97]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
            Kun {dayNumber} · O'qish
          </p>
          <h1 className="reading-heading mt-1 text-[22px] leading-tight text-[color:var(--rd-text)]">
            {title}
          </h1>
        </div>
        <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#FFF0D2] px-3 text-[13px] font-bold text-[#E08600] ring-1 ring-[#FBD48A]">
          <span aria-hidden>🔥</span>
          <span>{dayNumber}</span>
        </span>
      </div>

      <InteractiveDailyReading title={null} bodyRu={r.bodyRu || ''} lexemes={r.lexemes} />

      {oqishDone && questionsPending ? (
        <div className="rounded-[22px] bg-[#FFF6E5] px-4 py-4 text-center ring-1 ring-[#FBD48A]">
          <p className="text-sm font-black text-[#8A5A00]">Matn savollari qo‘shildi</p>
          <p className="mt-1 text-[13px] font-semibold leading-relaxed text-[#A06A0B]">
            Matnni qanchalik tushunganingizni tekshirib ko‘ring — {questionCount} ta savol.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/kunlik-reja/kun/${dayNumber}/oqish/savollar`)}
            className="mt-3.5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#0FA598] px-4 text-[15px] font-black text-white transition active:scale-[0.99]"
          >
            Savollarga o‘tish →
          </button>
        </div>
      ) : oqishDone ? (
        <div className="rounded-[22px] bg-[#E1F5F1] px-4 py-3.5 text-center text-sm font-bold text-[#0B7167] ring-1 ring-[#BFF0E8]">
          {t('kunlik.readingDoneAlready')}
        </div>
      ) : finishReady ? (
        <button
          type="button"
          onClick={() => void finishReading()}
          className="reading-cta flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] px-4 py-3.5 text-[15px] font-bold transition hover:brightness-[1.03] active:scale-[0.99]"
        >
          <span>{hasQuestions ? 'Savollarga o‘tish' : t('common.finish')}</span>
          <span aria-hidden className="text-[16px]">{hasQuestions ? '→' : '✓'}</span>
        </button>
      ) : (
        <div className="rounded-[22px] bg-white/70 px-4 py-3.5 text-center text-[13px] leading-relaxed text-[color:var(--rd-text-muted)] ring-1 ring-[#DCEBE7] backdrop-blur">
          {t('kunlik.readingFinishDelay', { seconds: 10 })}
        </div>
      )}
    </div>
  );
}


/**
 * SpeakingTopicList — 4-blok (gapirish) ichidagi IKKI mavzu.
 *
 * 1-mavzu: ruschaga tarjima (`daily_practice_prompts`)
 * 2-mavzu: ochiq gapirish topshiriqlari (`daily_speaking_tasks`)
 *
 * 2-mavzu 1-mavzu tugagunicha yopiq turadi. Kontenti yo'q kunlarda bu ro'yxat
 * umuman chizilmaydi — chaqiruvchi tomonda tekshiriladi.
 */
function SpeakingTopicList({
  bundle,
  dayNumber,
}: {
  bundle: DailyCourseDayBundle;
  dayNumber: number;
}) {
  const navigate = useNavigate();
  const { getDay, loaded } = useKunlikProgress();

  const prompts = bundle.practice ?? [];
  const tasks = bundle.speakingTasks ?? [];
  const row = getDay(dayNumber);

  const translateDone = prompts.length > 0 && (row.speaking_level ?? 0) >= prompts.length;
  const tasksDone = tasks.length > 0 && (row.speaking_tasks_done ?? 0) >= tasks.length;

  const topics = [
    {
      n: 1,
      emoji: '🗣️',
      title: 'Ruschaga tarjima',
      subtitle: `${prompts.length} ta topshiriq`,
      done: translateDone,
      locked: false,
      onOpen: () => navigate(`/kunlik-reja/kun/${dayNumber}/gapirish/tarjima`),
    },
    {
      n: 2,
      emoji: '💬',
      title: 'Gapirish topshiriqlari',
      subtitle: translateDone
        ? `${tasks.length} ta topshiriq · ochiq javob`
        : 'Avval 1-mavzuni bajaring',
      done: tasksDone,
      locked: !translateDone,
      onOpen: () => navigate(`/kunlik-reja/kun/${dayNumber}/gapirish/topshiriqlar`),
    },
  ];

  if (!loaded) {
    return (
      <div className="flex justify-center py-16">
        <SkeletonRoyxat soni={2} className="w-full" />
      </div>
    );
  }

  const doneCount = topics.filter((x) => x.done).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="grammar-heading text-[18px] leading-none text-[#0B2A6B]">2 ta mavzu</p>
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-app-bg-muted">
            <div
              className="h-full rounded-full bg-[#12A150] transition-all duration-500"
              style={{ width: `${(doneCount / topics.length) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-black text-app-text-muted">
            {doneCount}/{topics.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {topics.map((topic) => (
          <button
            key={topic.n}
            type="button"
            disabled={topic.locked}
            onClick={topic.onOpen}
            className={`w-full rounded-[20px] border-[1.5px] p-4 text-left transition active:scale-[0.99] disabled:cursor-default ${
              topic.done
                ? 'border-[#82E5B8] bg-[#DCFCE7]'
                : topic.locked
                  ? 'border-app-border bg-white opacity-70'
                  : 'border-[#0B2A6B] bg-white shadow-app-soft'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[22px] ${
                  topic.done ? 'bg-[#22C55E] text-white' : 'bg-app-bg-muted'
                }`}
              >
                {topic.done ? '✓' : topic.locked ? '🔒' : topic.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                    topic.done ? 'text-[#0F7C3A]' : 'text-app-text-muted'
                  }`}
                >
                  MAVZU {topic.n}
                  {topic.done ? ' · BAJARILDI' : ''}
                </p>
                <p
                  className={`grammar-heading mt-0.5 truncate text-[18px] leading-tight ${
                    topic.done ? 'text-[#0F7C3A]' : topic.locked ? 'text-app-text-muted' : 'text-app-text'
                  }`}
                >
                  {topic.title}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-app-text-muted">
                  {topic.subtitle}
                </p>
              </div>
            </div>

            {!topic.locked ? (
              <div className="mt-3">
                <span
                  className={`flex items-center justify-center rounded-[14px] px-4 py-3 text-[14px] font-black ${
                    topic.done
                      ? 'bg-white text-[#0F7C3A] ring-1 ring-[#82E5B8]'
                      : 'bg-[#0B2A6B] text-white'
                  }`}
                >
                  {topic.done ? 'Takrorlash' : 'Boshlash →'}
                </span>
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function PracticeFromBundle({ bundle, dayNumber }: { bundle: DailyCourseDayBundle; dayNumber: number }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { access } = useAccess();
  const premium = Boolean(access?.subscription_active);
  const { patchDay, getDay, loaded: kunlikLoaded } = useKunlikProgress();
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);
  const [forceRetry, setForceRetry] = useState(() => searchParams.get('retry') === '1');
  const isRepeatSessionRef = useRef(searchParams.get('retry') === '1');
  const autoRetryStartedRef = useRef(false);
  const p = bundle.practice;

  const tasks: SpeakingTask[] = useMemo(
    () =>
      [...(p ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({
          id: row.id,
          uz_text: row.uzText,
          topic: 'kunlik',
          level: 'daily',
          lesson_id: null,
          sort_order: row.sortOrder,
        })),
    [p],
  );

  const savedSpeaking = kunlikLoaded ? (getDay(dayNumber).speaking_level ?? 0) : 0;
  const allSpeakingDone =
    kunlikLoaded && tasks.length > 0 && savedSpeaking >= tasks.length && !forceRetry;

  useEffect(() => {
    if (!kunlikLoaded || isRepeatSessionRef.current) return;
    if (savedSpeaking >= tasks.length) {
      isRepeatSessionRef.current = true;
    }
  }, [kunlikLoaded, savedSpeaking, tasks.length]);

  useEffect(() => {
    if (!kunlikLoaded || autoRetryStartedRef.current) return;
    if (searchParams.get('retry') !== '1') return;
    if (savedSpeaking < tasks.length) return;

    autoRetryStartedRef.current = true;
    isRepeatSessionRef.current = true;
    setForceRetry(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('retry');
        return next;
      },
      { replace: true },
    );
  }, [kunlikLoaded, savedSpeaking, tasks.length, searchParams, setSearchParams]);

  const startSpeakingRetry = () => {
    isRepeatSessionRef.current = true;
    setForceRetry(true);
  };

  const finishSpeaking = () => {
    if (!forceRetry) {
      patchDay(dayNumber, { speaking_level: tasks.length });
    }
    if (!premium && dayNumber === FREE_KUNLIK_DAY_LIMIT && !isRepeatSessionRef.current) {
      setShowFreeLimitModal(true);
      return;
    }
    /*
     * 1-mavzu (tarjima) tugadi. Shu kunda 2-mavzu bo'lsa — kun rejasiga
     * qaytarmasdan, gapirish blokining MAVZULAR ro'yxatiga qaytamiz: shunda
     * endigina ochilgan 2-mavzu darrov ko'rinadi.
     */
    const extra = bundle.speakingTasks ?? [];
    const extraDone = (getDay(dayNumber).speaking_tasks_done ?? 0) >= extra.length;
    if (extra.length > 0 && !extraDone) {
      navigate(`/kunlik-reja/kun/${dayNumber}/gapirish`);
      return;
    }
    navigate(kunlikRejaPath(dayNumber));
  };

  if (!p?.length) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-[color:var(--rd-white)] px-4 py-6 text-center text-sm text-gray-600 shadow-sm">
        {t('kunlik.noSpeakingTasks')}
      </p>
    );
  }

  if (!kunlikLoaded) {
    return (
      <div className="flex justify-center py-16">
        <SkeletonRoyxat soni={2} className="w-full" />
      </div>
    );
  }

  if (allSpeakingDone) {
    // Shu kunda 2-mavzu bo'lsa — kun rejasiga emas, MAVZULAR ro'yxatiga
    // qaytariladi: foydalanuvchi keyingi mavzuni o'sha yerdan ochadi.
    const hasSecondTopic = (bundle.speakingTasks ?? []).length > 0;
    return (
      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-emerald-800">{t('kunlik.speakingDoneAlready')}</p>
        <button
          type="button"
          onClick={() =>
            navigate(
              hasSecondTopic
                ? `/kunlik-reja/kun/${dayNumber}/gapirish`
                : kunlikRejaPath(dayNumber),
            )
          }
          className="mt-4 min-h-[44px] w-full rounded-2xl border border-emerald-300 bg-[color:var(--rd-white)] px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          {hasSecondTopic ? 'Mavzularga qaytish' : t('kunlik.backToPlan')}
        </button>
        <button
          type="button"
          onClick={startSpeakingRetry}
          className="mt-3 min-h-[44px] w-full rounded-2xl bg-[#12A150] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0F8A44]"
        >
          {t('home.questRepeat')}
        </button>
      </div>
    );
  }

  const resumeIdx = forceRetry ? 0 : Math.min(savedSpeaking, tasks.length - 1);
  const exerciseKey = `speaking-${dayNumber}-${forceRetry ? 'retry' : savedSpeaking}`;

  return (
    <>
      {showFreeLimitModal ? (
        <KunlikFreeLimitModal
          onClose={() => {
            setShowFreeLimitModal(false);
            navigate(kunlikRejaPath(dayNumber));
          }}
        />
      ) : null}
      <SpeakingExercise
        key={exerciseKey}
        tasks={tasks}
        topicLabel={t('kunlik.daySpeaking', { day: dayNumber })}
        useInlineCheck={true}
        kunlikDayNumber={dayNumber}
        embedded
        initialResumeIndex={resumeIdx}
        onCheckpoint={(completed) => {
          if (!forceRetry) patchDay(dayNumber, { speaking_level: completed });
        }}
        onFinish={finishSpeaking}
        onBack={() => navigate(kunlikRejaPath(dayNumber))}
      />
    </>
  );
}
