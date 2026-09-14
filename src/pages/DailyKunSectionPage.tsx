import { SkeletonRoyxat } from '../components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Check, Link2, ListChecks, Lock, PlayCircle, Puzzle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import type { DailyCourseDayBundle, DailyCourseMcq } from '../../shared/dailyCourseDay';
import {
  READING_QUESTIONS_PASS_PERCENT,
  isValidDailyCourseDay,
  FREE_KUNLIK_DAY_LIMIT,
  canEnterKunlikDayContent,
} from '../../shared/dailyCourseDay';
import { isKunlikDayReadyForSuhbat } from '../../shared/kunlikDayCompletion';
import { VocabularyTaskList } from '../components/vocabulary/VocabularyTaskList';
import { InteractiveDailyReading } from '../components/daily/InteractiveDailyReading';
import SpeakingExercise from '../components/speaking/SpeakingExercise';
import UstozDoska from '../components/lesson/UstozDoska';
import { fetchKunSavollari, type DoskaVazifa, type KunSavol } from '../api/ustozDoska';
import type { SpeakingTask } from '../api/speaking';
import type { KunlikDayPatch } from '../api/kunlikProgress';
import { loadDailyVocabProgress } from '../utils/dailyVocabProgress';
import { xaritaYoli } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import { useLocale } from '../context/LocaleContext';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { useQurilmaOrqaga } from '../hooks/useQurilmaOrqaga';
import { useAccess } from '../context/AccessContext';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';

/*
 * Kunning bloklari. `savol-javob` — BESHINCHI blok: ustoz bilan jonli
 * suhbat. Ilgari u grammatika oqimining oxirgi bosqichi edi va o'quvchi
 * unga faqat grammatika ichiga kirib borgandagina duch kelardi; endi u
 * bosh sahifada mustaqil blok bo'lib turadi.
 */
const SECTIONS = ['grammatika', 'lugat', 'oqish', 'gapirish', 'savol-javob'] as const;
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
  const { access: kirishHuquqi } = useAccess();
  /* Oltin a'zoda hamma kun ochiq — to'lov to'sig'i unga tegishli emas. */
  const premiumOchiq =
    Boolean(kirishHuquqi?.subscription_active) || Boolean(kirishHuquqi?.golden);
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
          onClick={() => navigate(xaritaYoli())}
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

  /*
   * TO'LOV TO'SIG'I — BO'LIM SAHIFASIDA HAM.
   *
   * Server obunasiz kunni baribir rad etadi, lekin ekranda sabab
   * ko'rinmasdi: o'quvchi bo'sh yoki xato sahifaga tushardi. Manzilni
   * qo'lda yozib yoki eski havola orqali kelgan odam ham nima uchun
   * ochilmayotganini bilishi kerak.
   */
  if (!canEnterKunlikDayContent(dayNumber, premiumOchiq)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FA] px-5 text-center">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full text-[26px]"
          style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
        >
          👑
        </span>
        <p className="mt-3 text-[17px] font-black text-[#0B2A6B]">
          {dayNumber}-kun obuna bilan ochiladi
        </p>
        <p className="mt-2 max-w-[34ch] text-[13.5px] font-semibold leading-snug text-slate-600">
          1-kun bepul. To'lovdan keyin 182 kunning hammasi ochiladi.
        </p>
        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          className="mt-5 flex min-h-[48px] w-full max-w-[300px] items-center justify-center gap-2 rounded-[14px] bg-[#0B2A6B] px-4 text-[14px] font-black text-white shadow-[0_10px_24px_-12px_rgba(11,42,107,0.8)] transition active:scale-[0.99]"
        >
          To'lov qilish
          <ArrowRight className="h-4 w-4" strokeWidth={2.8} />
        </button>
        <button
          type="button"
          onClick={() => navigate(xaritaYoli())}
          className="mt-3 min-h-[44px] text-[13.5px] font-bold text-slate-500"
        >
          Xaritaga qaytish
        </button>
      </div>
    );
  }

  const isGrammar = sec === 'grammatika';
  const isLugat = sec === 'lugat';
  const isOqish = sec === 'oqish';
  // Suhbat grammatika oqimidan ko'chirildi — ko'rinishi o'sha binafsha mavzu.
  const isSuhbat = sec === 'savol-javob';
  const usePurpleTheme = isGrammar || isLugat || isSuhbat;
  const themeClass = usePurpleTheme ? 'grammar-theme' : isOqish ? 'reading-theme' : 'bg-[#F5F7FA]';
  return (
    <div className={`min-h-screen pb-28 ${themeClass}`}>
      <main className="mx-auto max-w-md space-y-4 px-4 pb-5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {isOqish ? null : (
          <button
            type="button"
            onClick={() => navigate(xaritaYoli())}
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
        {!loading && !err && bundle && sec === 'savol-javob' && (
          <SuhbatFromBundle dayNumber={dayNumber} bundle={bundle} />
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

/**
 * Doska uchun kunning VAZIFALARI. Ustoz mavzuni umumiy gapirmaydi — aynan
 * shu mashqlarni kengaytirib tushuntiradi, ya'ni o'quvchi mashqqa kirishdan
 * oldin nima talab qilinishini va nega shundayligini biladi.
 *
 * Modul darajasida turadi: bir xil ro'yxat ham grammatika darsiga, ham
 * alohida blokka chiqarilgan savol-javobga kerak.
 */
function doskaVazifalariniYig(g: DailyCourseDayBundle['grammar'] | null | undefined): DoskaVazifa[] {
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
}

function GrammarFromBundle({ dayNumber, bundle }: { dayNumber: number; bundle: DailyCourseDayBundle }) {
  const navigate = useNavigate();
  const { getDay, loaded: kunlikLoaded, patchDay } = useKunlikProgress();
  const grammarGapPatchSent = useRef(false);
  const g = bundle.grammar;
  const kp = kunlikLoaded ? getDay(dayNumber) : null;

  /**
   * Doska uchun kunning VAZIFALARI. Ustoz mavzuni umumiy gapirmaydi — aynan
   * shu mashqlarni kengaytirib tushuntiradi, ya'ni o'quvchi mashqqa kirishdan
   * oldin nima talab qilinishini va nega shundayligini biladi.
   */
  const doskaVazifalar = useMemo<DoskaVazifa[]>(() => doskaVazifalariniYig(g), [g]);

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
          grammar1Done={kp?.grammar_1 ?? false}
          grammar2Done={kp?.grammar_2 ?? false}
          grammar3Done={kp?.grammar_3 ?? false}
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
    (s) => s.wordBank.length > 0 && String(s.answerRu ?? '').trim() !== '',
  );
  /*
   * Tanlov ekranidagi "1/3" nishoni uchun: kunda umuman nechta mashq bor
   * va nechtasi bajarilgan. Kunda bo'lmagan mashq sanoqqa kirmaydi.
   */
  const jamiMashq = [testBor, juftlikBor, gapBor].filter(Boolean).length;
  const bajarilganMashq =
    (testBor && kp?.grammar_1 ? 1 : 0) +
    (juftlikBor && kp?.grammar_2 ? 1 : 0) +
    (gapBor && kp?.grammar_3 ? 1 : 0);

  const birinchiVazifaYoli =
    testBor && !kp?.grammar_1
      ? grammatikaYoli('test-variantlar')
      : juftlikBor && !kp?.grammar_2
        ? grammatikaYoli('juftlik')
        : gapBor && !kp?.grammar_3
          ? grammatikaYoli('gap-tuzish')
          : null;

  /* Sarlavha bir marta ajratiladi — har renderda uch marta emas. */
  const sarlavha = g.topic?.title ? sarlavhaBolaklari(g.topic.title) : null;

  // Bir ekranda bitta blok. Kunda bo'lmagan blok bosqich sifatida ham chiqmaydi.
  const steps: GrammarStep[] = [];
  if (g.topic?.title) {
    steps.push({
      key: 'doska',
      label: 'Video dars',
      ownPrimary: true,
      fullscreen: true,
      node: ({ bosqichga, tanlovga }) => (
        <UstozDoska
          key={`${dayNumber}-${g.topic!.title}`}
          mavzu={g.topic!.title}
          nazariya={g.topic!.theoryText}
          kun={dayNumber}
          vazifalar={doskaVazifalar}
          keyingiNomi="Vazifalar"
          toliqEkran
          /* Tepadagi "ortga" — grammatikadan chiqmaydi, tanlovga qaytaradi. */
          onChiqish={tanlovga}
          /*
            Dars tugagach o'quvchi TO'G'RIDAN-TO'G'RI birinchi bajarilmagan
            mashqqa tushadi — mashqlar esa o'zaro zanjirlangan (test ->
            juftlik -> gap tuzish). Oqimning o'zi ham "Vazifalar" bosqichiga
            suriladi: mashqdan qaytganda doska qaytadan ochilib ketmasin.
          */
          onTugadi={() => {
            bosqichga('vazifa');
            if (birinchiVazifaYoli) {
              mashqqaOtishniBelgila(dayNumber);
              navigate(birinchiVazifaYoli);
            }
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
        onOpenTest={
          testBor
            ? () => {
                mashqqaOtishniBelgila(dayNumber);
                navigate(grammatikaYoli('test-variantlar'));
              }
            : undefined
        }
        onOpenMatch={
          juftlikBor
            ? () => {
                mashqqaOtishniBelgila(dayNumber);
                navigate(grammatikaYoli('juftlik'));
              }
            : undefined
        }
        onOpenSentence={
          gapBor
            ? () => {
                mashqqaOtishniBelgila(dayNumber);
                navigate(grammatikaYoli('gap-tuzish'));
              }
            : undefined
        }
      />
    ),
  });
  /*
   * JONLI SAVOL-JAVOB endi bu oqimda EMAS.
   *
   * U grammatikaning oxirgi bosqichi edi va o'quvchi unga faqat grammatika
   * ichiga kirib borgandagina duch kelardi. Endi kunning mustaqil 5-bloki:
   * bosh sahifadan `/kunlik-reja/kun/:kun/savol-javob` ochiladi
   * (`SuhbatFromBundle`). Ekranning o'zi o'zgarmadi.
   */

  return (
    <div className="space-y-5">
      {/*
        Sarlavha — MARKAZDA. Chapga tekislangan uzun qalin matn ekranning
        bir yonini bosib turardi; markaz esa ikkita kartaning o'qi bilan
        bir chiziqqa tushadi va ekran muvozanatli ko'rinadi.

        Qavs ichidagi ruscha nom pastda, kichikroq va bosiqroq — ko'z avval
        o'zbekcha nomni oladi, keyin kerak bo'lsa ruschasini.
      */}
      {sarlavha ? (
        <header className="mx-auto mb-1 max-w-[460px] px-1 text-center">
          <h1 className="grammar-heading mx-auto max-w-[20ch] text-[26px] leading-[1.14] text-[#2D1B69] sm:text-[30px]">
            {sarlavha.asosiy}
          </h1>
          {sarlavha.izoh ? (
            <p className="mx-auto mt-2 max-w-[32ch] text-[13.5px] font-semibold leading-snug text-[#8B7FAB]">
              {sarlavha.izoh}
            </p>
          ) : null}
          <span
            aria-hidden
            className="mx-auto mt-4 block h-[3px] w-10 rounded-full"
            style={{ background: 'linear-gradient(90deg, #5B4CE0, #A78BFA)' }}
          />
        </header>
      ) : null}

      <GrammarStepFlow
        dayNumber={dayNumber}
        steps={steps}
        bajarilganMashq={bajarilganMashq}
        jamiMashq={jamiMashq}
        kunlikLoaded={kunlikLoaded}
      />
    </div>
  );
}

/** Bosqich o'z yakunida oqimni boshqarishi uchun beriladigan vositalar. */
type OqimApi = {
  /** Keyingi bosqichga o'tkazadi; oxirgi bosqichda `null`. */
  keyingiga: (() => void) | null;
  /** Keyingi bosqichning nomi — tugmada yoziladi. */
  keyingiNomi?: string;
  /** Ma'lum bosqichga o'tkazadi (kaliti bo'yicha; topilmasa hech narsa qilmaydi). */
  bosqichga: (kalit: string) => void;
  /**
   * Tanlov ekraniga qaytaradi ("Video dars" / "Vazifalar").
   *
   * Darsdan chiqqan odam grammatikadan BUTUNLAY chiqib ketmasin: u
   * ko'pincha darsni to'xtatib, mashqqa o'tmoqchi bo'ladi.
   */
  tanlovga: () => void;
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

/*
 * MASHQDAN QAYTISH BELGISI.
 *
 * MUAMMO: oqim qolgan bosqichni `localStorage` da saqlar va HAR kirishda
 * tiklardi. Natijada o'quvchi grammatikadan butunlay chiqib, keyin qaytadan
 * kirsa ham o'sha joyda — masalan "Vazifalar" da — qolib ketardi va darsni
 * qaytadan ko'ra olmasdi.
 *
 * LEKIN saqlashni butunlay olib tashlab bo'lmaydi: u mashqdan (test/juftlik/
 * gap tuzish) qaytganda doska QAYTA OCHILIB ketmasligi uchun qo'yilgan.
 *
 * Yechim — bosqich faqat MASHQDAN QAYTGANDA tiklanadi. Mashqqa o'tishdan
 * oldin shu belgi qo'yiladi, qaytishda esa ishlatilib O'CHIRILADI. Boshqa
 * har qanday kirishda oqim boshidan — doskadagi darsdan — ochiladi.
 *
 * `sessionStorage`: ilova yopilsa belgi o'zi yo'qoladi. Ustiga vaqt chegarasi
 * ham bor — mashqni ochib tashlab ketilgan holat abadiy qolib ketmasin.
 */
const GRAMMAR_RETURN_KEY = 'falarus:kun-grammatika-qaytish';
const GRAMMAR_RETURN_TTL_MS = 60 * 60_000;

/** Mashqqa o'tishdan oldin chaqiriladi. */
function mashqqaOtishniBelgila(dayNumber: number): void {
  try {
    sessionStorage.setItem(`${GRAMMAR_RETURN_KEY}:${dayNumber}`, String(Date.now()));
  } catch {
    /* saqlab bo'lmasa oqim baribir ishlaydi — shunchaki doskadan boshlanadi */
  }
}

/** Qaytish belgisini o'qib, DARHOL o'chiradi (bir martalik). */
function mashqdanQaytdimi(dayNumber: number): boolean {
  try {
    const kalit = `${GRAMMAR_RETURN_KEY}:${dayNumber}`;
    const xom = sessionStorage.getItem(kalit);
    if (!xom) return false;
    sessionStorage.removeItem(kalit);
    const vaqt = Number(xom);
    return Number.isFinite(vaqt) && Date.now() - vaqt < GRAMMAR_RETURN_TTL_MS;
  } catch {
    return false;
  }
}

/*
 * VIDEO DARS BIR MARTA AVTOMATIK, KEYIN — TANLOV.
 *
 * Kunning grammatikasiga BIRINCHI kirganda doskadagi dars o'zi
 * boshlanadi: o'quvchi mavzuni avval tushunib olsin.
 *
 * Ikkinchi va undan keyingi kirishlarda esa tanlov ekrani chiqadi —
 * "Video dars" va "Vazifalar". Sabab: o'tilgan kunga qaytgan odam ko'pincha
 * mashqni qaytarish uchun kiradi, uni har safar 10 daqiqalik darsdan
 * o'tkazish noto'g'ri. Aksincha, darsni qayta eshitmoqchi bo'lsa ham
 * bir bosishda ochadi.
 *
 * `localStorage`: qurilmada saqlanadi va sessiyadan keyin ham qoladi.
 * Bundan tashqari kunda mashqlardan bittasi bajarilgan bo'lsa ham tanlov
 * ko'rsatiladi — boshqa qurilmadan kirgan odam ham qaytadan darsga
 * tushib qolmasin.
 */
const DOSKA_KORILDI_KEY = 'falarus:kun-doska-korildi';

function doskaKorildimi(dayNumber: number): boolean {
  try {
    return localStorage.getItem(`${DOSKA_KORILDI_KEY}:${dayNumber}`) === '1';
  } catch {
    return false;
  }
}

function doskaniBelgila(dayNumber: number): void {
  try {
    localStorage.setItem(`${DOSKA_KORILDI_KEY}:${dayNumber}`, '1');
  } catch {
    /* saqlanmasa — keyingi safar ham dars o'zi boshlanadi, zarari yo'q */
  }
}

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

/**
 * Sarlavhani ikkiga ajratadi: qisqa NOM va uning izohi (misollar / tarjima).
 *
 * NEGA: mavzu nomlari uzun va telefon ekranida uch-to'rt qatorni egallaydi —
 * ko'z qayerga qarashni bilmaydi. Qalin qisqa nom + ostida bosiqroq izoh
 * ancha tez o'qiladi.
 *
 * MUHIM — 182 KUN BIR XIL KO'RINISHI KERAK. Ilgari bu yerda faqat oxiridagi
 * QAVS tekshirilardi, holbuki 182 kundan atigi 2 tasi shunday yozilgan:
 *
 *     qavs bilan  ....  2 kun    "Shaxs olmoshlari (Личные местоимения)"
 *     ikki nuqta  .... 147 kun   "Kasb: Я сварщик. А вы?"
 *     uzun tire   ....  21 kun   "Что случилось? — потерял, сломал"
 *     ajratgichsiz ...  12 kun   "Har bir feʼl oʻz shaklini talab qiladi"
 *
 * Ya'ni 1-kun ikki qatorli chiroyli sarlavha bilan ochilar, qolgan 180 kun
 * esa bitta uzun qator bo'lib qolardi. Endi uch ajratgich ham tanilади:
 * 182 kundan 172 tasi ikki qatorli, qolgan 10 tasi haqiqatan bir bo'lak.
 *
 * AJRATGICH TANLASH: bir nechta nomzod bo'lsa, davomi KIRILLDA boshlanadigani
 * olinadi. 85-kun aynan shuning uchun: "Bitta shakl — toʻrt vazifa: на
 * работу…" — tire bo'yicha kesilsa o'zbekcha nom ikkiga bo'linib ketardi.
 */
function sarlavhaBolaklari(xom: string): {
  asosiy: string;
  izoh: string | null;
} {
  // Bazadagi ba'zi sarlavhalarda markdown qoldig'i bor (24-kun: "**в** yoki
  // **на**?") — ekranda yulduzcha bo'lib ko'rinardi.
  const t = String(xom ?? '')
    .replace(/\*\*/g, '')
    .trim();
  if (!t) return { asosiy: '', izoh: null };

  const qavs = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(t);
  if (qavs && qavs[1].trim().length >= 3 && qavs[2].trim()) {
    return { asosiy: qavs[1].trim(), izoh: qavs[2].trim() };
  }

  const nomzodlar: { chap: string; ong: string }[] = [];
  for (let i = 3; i < t.length - 1; i += 1) {
    if (t[i] !== ':' && t[i] !== '—') continue;
    const chap = t.slice(0, i).trim();
    const ong = t.slice(i + 1).trim();
    if (chap.length >= 3 && ong) nomzodlar.push({ chap, ong });
  }
  if (nomzodlar.length > 0) {
    const kirillDan = nomzodlar.find((n) => /^[«"']?[А-ЯЁа-яё]/.test(n.ong));
    const tanlangan = kirillDan ?? nomzodlar[0];
    return { asosiy: tanlangan.chap, izoh: tanlangan.ong };
  }

  // "Sonlar 1–20. Сколько это стоит?" — nuqtadan keyin ruscha misol.
  const nuqta = /^(.{3,}?)\.\s+([А-ЯЁ].*)$/.exec(t);
  if (nuqta && nuqta[2].trim()) return { asosiy: nuqta[1].trim(), izoh: nuqta[2].trim() };

  return { asosiy: t, izoh: null };
}

/** Tanlov ekrani orqasidagi jonli lavha. */
const TANLOV_FON_VIDEO = '/kunlik/dars-fon.mp4';
const TANLOV_FON_POSTER = '/kunlik/dars-fon.jpg';

/**
 * TANLOV EKRANINING JONLI FONI.
 *
 * Ekranda ikkita plitkadan boshqa hech narsa yo'q va u yarim bo'sh
 * ko'rinardi. Orqa fonga dars qilayotgan bolalar lavhasi qo'yiladi:
 * ekran tirik bo'ladi, lekin lavha diqqatni tortmaydi — ustidan parda
 * tushadi va harakat sekinlashtiriladi.
 *
 * Fayl bo'lmasa yoki brauzer o'ynata olmasa qatlam butunlay o'chadi va
 * sahifa avvalgi foni bilan qoladi — video yo'qligi ekranni buzmaydi.
 *
 * `-z-10`: qatlam sahifa MATNIDAN orqada, lekin sahifa fonidan oldinda.
 * Sahifa foni oq bo'lgani uchun u `body` sinfi orqali shaffof qilinadi.
 */
function TanlovFonVideo() {
  const reduce = useReducedMotion();
  const [xato, setXato] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (xato) return;
    document.body.classList.add('kunlik-fon-video');
    return () => document.body.classList.remove('kunlik-fon-video');
  }, [xato]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    // Lavha diqqatni tortmasin — sekin oqadi.
    el.playbackRate = 0.75;
    void el.play().catch(() => undefined);
  }, [reduce]);

  if (xato) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {reduce ? (
        <img
          src={TANLOV_FON_POSTER}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setXato(true)}
        />
      ) : (
        <video
          ref={videoRef}
          src={TANLOV_FON_VIDEO}
          poster={TANLOV_FON_POSTER}
          muted
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
          onError={() => setXato(true)}
        />
      )}
      {/* Parda — sarlavha va plitkalar kontrasti saqlanadi. */}
      <div className="kunlik-fon-parda" />
    </div>
  );
}

/**
 * Bajarilgan mashqlar halqasi.
 *
 * Raqamdan ko'ra tezroq o'qiladi: o'quvchi bosishdan oldin qancha qolganini
 * bir qarashda ko'radi. Tugaganda halqaning o'rniga belgi qo'yiladi.
 */
function MashqHalqasi({
  qiymat,
  jami,
  rang,
  fon,
  tugagan,
  kichik = false,
}: {
  qiymat: number;
  jami: number;
  rang: string;
  fon: string;
  tugagan: boolean;
  /** Bo'lim sarlavhasidagi ixcham o'lcham. */
  kichik?: boolean;
}) {
  const r = 15.5;
  const aylana = 2 * Math.PI * r;
  const ulush = jami > 0 ? Math.min(Math.max(qiymat / jami, 0), 1) : 0;

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center ${kichik ? 'h-9 w-9' : 'h-11 w-11'}`}
    >
      <svg viewBox="0 0 40 40" className={`-rotate-90 ${kichik ? 'h-9 w-9' : 'h-11 w-11'}`}>
        <circle cx="20" cy="20" r={r} fill="none" stroke={fon} strokeWidth="4" />
        {/*
          Nol progressda chizilmaydi: `strokeLinecap="round"` nol uzunlikdagi
          chiziqni ham dumaloq nuqta qilib ko'rsatardi va halqa tepasida
          tushunarsiz dog' turardi.
        */}
        {ulush > 0 ? (
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={rang}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${aylana * ulush} ${aylana}`}
            style={{
              transition: 'stroke-dasharray 600ms cubic-bezier(0.32,0.72,0,1)',
            }}
          />
        ) : null}
      </svg>
      <span
        className={`absolute font-black leading-none ${kichik ? 'text-[10px]' : 'text-[11px]'}`}
        style={{ color: rang }}
      >
        {tugagan ? (
          <Check className={kichik ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={3.4} />
        ) : (
          `${qiymat}/${jami}`
        )}
      </span>
    </span>
  );
}

/**
 * Grammatikaga QAYTA kirganda chiqadigan tanlov.
 *
 * Ikki yo'l teng ko'rsatiladi — kim mavzuni qayta tushunmoqchi, kim
 * mashqni bajarmoqchi. Birinchi kirishda bu ekran umuman chiqmaydi:
 * o'quvchi avval darsni ko'radi.
 *
 * SHAKL: ro'yxat emas, ikkita KATTA plitka. Ro'yxat ikki qatordan iborat
 * bo'lganda ekran yarim bo'sh va tugallanmagan ko'rinardi; plitkalar esa
 * ekranni to'ldiradi va barmoq uchun ancha keng nishon bo'ladi.
 *
 * BITTA ASOSIY HARAKAT: davom etadigan ish to'ldirilgan (binafsha) plitka,
 * ikkinchisi oq. Mashqlar tugagach asosiy harakat "Video dars"ga o'tadi.
 */
function GrammatikaTanlov({
  onDars,
  onVazifalar,
  bajarilgan,
  jami,
  qulf,
}: {
  onDars: () => void;
  onVazifalar: () => void;
  /** Bajarilgan mashqlar soni. */
  bajarilgan: number;
  /** Kunda umuman nechta mashq bor. */
  jami: number;
  /** Video darsga hali kirilmagan — vazifalar yopiq. */
  qulf: boolean;
}) {
  const tugagan = jami > 0 && bajarilgan >= jami;
  // Vazifalar yopiq bo'lsa, asosiy harakat — albatta dars.
  const darsAsosiy = tugagan || qulf;
  /* Yopiq plitka bosilganda sababi ko'rsatiladi (aks holda "ishlamayapti"). */
  const [ogoh, setOgoh] = useState(false);

  // Ogohlantirish o'zi so'nadi; sahifadan chiqilsa taymer tozalanadi.
  useEffect(() => {
    if (!ogoh) return;
    const t = setTimeout(() => setOgoh(false), 2600);
    return () => clearTimeout(t);
  }, [ogoh]);

  const toldirilgan: React.CSSProperties = {
    background: 'linear-gradient(150deg, #5B4CE0 0%, #7C3AED 55%, #6D28D9 100%)',
    border: '1.5px solid transparent',
    boxShadow: '0 22px 40px -20px rgba(91,76,224,0.8)',
  };
  const oq: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1.5px solid #E9E4F8',
    boxShadow: '0 14px 30px -22px rgba(45,27,105,0.45)',
  };

  const plitka =
    'group relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[26px] p-[18px] text-left';

  return (
    <>
      <TanlovFonVideo />
      {/*
        PLITKALAR EKRAN O'RTASIDA.

        Ilgari ular sarlavhaga yopishib turardi va ekranning pastki yarmi
        butunlay bo'sh qolardi. Endi qolgan balandlikning o'rtasiga tushadi:
        sarlavha bilan orasi ochiladi, barmoq esa ekranning eng qulay —
        o'rta — qismiga tushadi.

        `svh` (kichik ko'rinish balandligi) bejiz tanlangan emas: telefon
        brauzerlarida manzil qatori sirg'alganda `vh` sakraydi va plitkalar
        joyidan siljib ketardi.
      */}
      <div className="relative mx-auto flex min-h-[46svh] w-full max-w-[520px] items-center">
        <div className="grid w-full grid-cols-2 gap-3.5">
          {/* ── VIDEO DARS ── */}
          <motion.button
            type="button"
            onClick={onDars}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05,
              type: 'spring',
              stiffness: 320,
              damping: 30,
            }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className={plitka}
            style={darsAsosiy ? toldirilgan : oq}
          >
            {/* Yumshoq yorug'lik — plitka tekis "qog'oz" bo'lib qolmasin. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full"
              style={{
                background: darsAsosiy ? 'rgba(255,255,255,0.13)' : 'rgba(91,76,224,0.07)',
              }}
            />
            <span
              aria-hidden
              className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px]"
              style={
                darsAsosiy
                  ? { background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }
                  : { background: '#F1EEFC', color: '#5B4CE0' }
              }
            >
              <PlayCircle className="h-[26px] w-[26px]" strokeWidth={2.1} />
            </span>
            <span className="relative">
              <span
                className="block text-[17px] font-black leading-tight tracking-[-0.01em]"
                style={{ color: darsAsosiy ? '#FFFFFF' : '#2D1B69' }}
              >
                Video dars
            </span>
              <ArrowRight
                className="mt-2 h-[18px] w-[18px] transition-transform group-hover:translate-x-1"
                strokeWidth={2.8}
                style={{
                  color: darsAsosiy ? 'rgba(255,255,255,0.85)' : '#C4B8E0',
                }}
              />
            </span>
          </motion.button>

          {/* ── VAZIFALAR ── */}
          <motion.button
            type="button"
            onClick={() => {
              if (qulf) {
                setOgoh(true);
                return;
              }
              onVazifalar();
            }}
            aria-disabled={qulf}
            initial={{ opacity: 0, y: 16 }}
            animate={
              ogoh ? { opacity: 1, y: 0, x: [0, -7, 7, -4, 4, 0] } : { opacity: 1, y: 0, x: 0 }
            }
            transition={
              ogoh
                ? { duration: 0.42, ease: 'easeInOut' }
                : { delay: 0.13, type: 'spring', stiffness: 320, damping: 30 }
            }
            whileHover={qulf ? undefined : { y: -3 }}
            whileTap={{ scale: 0.98 }}
            className={plitka}
            style={
              qulf
                ? {
                    background: '#F7F6FC',
                    border: '1.5px solid #E9E4F8',
                    boxShadow: 'none',
                  }
                : tugagan
                  ? {
                      background: '#F2FDF6',
                      border: '1.5px solid #A7E8C4',
                      boxShadow: '0 14px 30px -22px rgba(34,197,94,0.5)',
                    }
                  : toldirilgan
            }
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full"
              style={{
                background: qulf
                  ? 'rgba(45,27,105,0.03)'
                  : tugagan
                    ? 'rgba(34,197,94,0.08)'
                    : 'rgba(255,255,255,0.13)',
              }}
            />
            <span className="relative flex items-start justify-between gap-2">
              <span
                aria-hidden
                className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px]"
                style={
                  qulf
                    ? { background: '#EFECF9', color: '#A79BC7' }
                    : tugagan
                      ? { background: '#22C55E', color: '#FFFFFF' }
                      : { background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }
                }
              >
                <ListChecks className="h-[26px] w-[26px]" strokeWidth={2.1} />
            </span>
              {qulf ? (
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: '#EFECF9', color: '#A79BC7' }}
                >
                  <Lock className="h-[18px] w-[18px]" strokeWidth={2.6} />
                </span>
              ) : jami > 0 ? (
                <MashqHalqasi
                  qiymat={bajarilgan}
                  jami={jami}
                  tugagan={tugagan}
                  rang={tugagan ? '#16A34A' : '#FFFFFF'}
                  fon={tugagan ? 'rgba(22,163,74,0.18)' : 'rgba(255,255,255,0.25)'}
                />
              ) : null}
            </span>
            <span className="relative">
              <span
                className="block text-[17px] font-black leading-tight tracking-[-0.01em]"
                style={{
                  color: qulf ? '#A79BC7' : tugagan ? '#0F7C3A' : '#FFFFFF',
                }}
              >
                Vazifalar
            </span>
              {qulf ? (
                <span className="mt-1.5 block text-[11.5px] font-bold leading-snug text-[#B3A9CF]">
                  {ogoh ? 'Avval video darsni oching' : ''}
                </span>
              ) : (
                <ArrowRight
                  className="mt-2 h-[18px] w-[18px] transition-transform group-hover:translate-x-1"
                  strokeWidth={2.8}
                  style={{
                    color: tugagan ? '#5FC98C' : 'rgba(255,255,255,0.85)',
                  }}
                />
              )}
            </span>
          </motion.button>
        </div>
      </div>
    </>
  );
}

/**
 * Grammatika kuni bosqichma-bosqich ko'rsatiladi: bir ekranda bitta blok.
 * Ilgari tushuntirish, nazariya va vazifalar bitta uzun ro'yxatda turardi —
 * o'quvchi qaysi biridan boshlashni bilmasdi.
 */
function GrammarStepFlow({
  dayNumber,
  steps,
  bajarilganMashq,
  jamiMashq,
  kunlikLoaded,
}: {
  dayNumber: number;
  steps: GrammarStep[];
  /** Bajarilgan mashqlar soni (boshqa qurilmadagi progress ham shu yerda). */
  bajarilganMashq: number;
  /** Kunda umuman nechta mashq bor. */
  jamiMashq: number;
  /** Kunlik progress yuklandimi — qaror shuni kutadi. */
  kunlikLoaded: boolean;
}) {
  /* Kunga avval kirilganini bildiruvchi belgi: bittasi bajarilgan bo'lsa. */
  const mashqBajarilgan = bajarilganMashq > 0;
  const [index, setIndex] = useState(0);
  /**
   * `null` — hali hal qilinmagan (birinchi render), `true` — bosqich
   * ko'rsatiladi, `false` — tanlov ekrani. Boshlang'ich `null` bo'lishi
   * shart: aks holda tanlov kerak bo'lgan kunda dars bir lahza chaqnab
   * ketardi.
   */
  const [tanlandi, setTanlandi] = useState<boolean | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const doskaBor = steps.some((st) => st.key === 'doska');
  const vazifaJoyi = steps.findIndex((st) => st.key === 'vazifa');

  /*
   * Bosqich FAQAT mashqdan qaytganda tiklanadi — qolgan hamma holatda
   * oqim boshidan ochiladi.
   *
   * Kunga QAYTA kirilgan bo'lsa (dars allaqachon ko'rilgan yoki mashq
   * bajarilgan) — avval TANLOV: "Video dars" yoki "Vazifalar".
   */
  const qarorKuni = useRef<number | null>(null);
  /** Progress kechiksa ham cheksiz kutmaymiz. */
  const [kutishTugadi, setKutishTugadi] = useState(false);
  /*
   * Qaytish belgisi BIR MARTALIK: o'qilishi bilan o'chadi. Effekt esa ikki
   * marta ishga tushishi mumkin (React StrictMode, yoki progress kelgach
   * qayta hisoblanishi) — shuning uchun natija kun bo'yicha eslab qolinadi,
   * aks holda ikkinchi o'qishda mashqdan qaytgan odam tanlov ekraniga
   * uloqtirilardi.
   */
  const qaytishBelgisi = useRef<{ kun: number; qiymat: boolean } | null>(null);
  const qaytdimi = useCallback((kun: number) => {
    if (qaytishBelgisi.current?.kun !== kun) {
      qaytishBelgisi.current = { kun, qiymat: mashqdanQaytdimi(kun) };
    }
    return qaytishBelgisi.current.qiymat;
  }, []);

  useEffect(() => {
    qarorKuni.current = null;
    setTanlandi(null);
    setKutishTugadi(false);
    const t = setTimeout(() => setKutishTugadi(true), 1500);
    return () => clearTimeout(t);
  }, [dayNumber]);

  useEffect(() => {
    if (steps.length === 0) return;
    if (qarorKuni.current === dayNumber) return;

    if (qaytdimi(dayNumber)) {
      let saved = 0;
      try {
        saved = Number(localStorage.getItem(`${GRAMMAR_STEP_KEY}:${dayNumber}`) ?? 0);
      } catch {
        saved = 0;
      }
      qarorKuni.current = dayNumber;
      setIndex(Number.isFinite(saved) ? Math.min(Math.max(saved, 0), steps.length - 1) : 0);
      setTanlandi(true);
      return;
    }

    /*
     * Qurilmada belgi bo'lsa — kutishning hojati yo'q. Bo'lmasa serverdagi
     * progressni kutamiz: oyin oldin tugatilgan kunga boshqa qurilmadan
     * kirgan odam qaytadan darsga tushib qolmasin.
     */
    const belgi = doskaBor && doskaKorildimi(dayNumber);
    if (!belgi && !kunlikLoaded && !kutishTugadi) return;

    qarorKuni.current = dayNumber;
    setIndex(0);
    setTanlandi(!(doskaBor && (belgi || mashqBajarilgan)));
  }, [dayNumber, steps.length, doskaBor, mashqBajarilgan, kunlikLoaded, kutishTugadi, qaytdimi]);

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

  const safeIndex = Math.min(index, Math.max(steps.length - 1, 0));

  /*
   * Dars ochilishi bilan "ko'rildi" deb belgilanadi. Tugashini kutmaymiz:
   * darsni yarmida tashlab ketgan odam ham keyingi kirishda tanlovni
   * ko'rsin — xohlasa o'sha yerdan darsni qayta ochadi.
   */
  const joriyKalit = steps[safeIndex]?.key;
  useEffect(() => {
    if (tanlandi && joriyKalit === 'doska') doskaniBelgila(dayNumber);
  }, [tanlandi, joriyKalit, dayNumber]);

  /*
   * Telefonning "ortga" tugmasi bosqichdan TANLOVGA qaytarsin.
   *
   * Bosqichlar URL'ni o'zgartirmaydi, shuning uchun ular tarixda ko'rinmasdi
   * va "ortga" bir zumda kunlik rejaga uloqtirardi — o'quvchi darsning
   * o'rtasida bo'lsa ham.
   */
  const tanlovgaQaytish = useQurilmaOrqaga(tanlandi === true, () => setTanlandi(false));

  if (steps.length === 0) return null;

  /*
   * VAZIFALAR QULFI: video darsga KIRMAGUNCHA mashqlar yopiq.
   *
   * Mavzuni ko'rmasdan mashq bajarish o'quvchiga foyda bermaydi. Qulf
   * darsning o'zi ochilishi bilan yechiladi — dars oxirigacha o'tirishga
   * majburlamaymiz, lekin mashqqa yo'l darsdan o'tadi.
   *
   * MUHIM: ilgari bu yerda "bitta mashq bajarilgan bo'lsa ochiq" degan
   * yon yo'l bor edi va shu sababli kun qayta ochilganda vazifalar darsga
   * kirmasdan ham ochiq turardi. Yon yo'l olib tashlandi.
   */
  const vazifaQulf = doskaBor && !doskaKorildimi(dayNumber);

  /* TANLOV EKRANI — kunga qayta kirilganda. */
  if (tanlandi === null) return <SkeletonRoyxat soni={2} />;
  if (!tanlandi) {
    return (
      <GrammatikaTanlov
        bajarilgan={bajarilganMashq}
        jami={jamiMashq}
        qulf={vazifaQulf}
        onDars={() => {
          setTanlandi(true);
          goTo(0);
        }}
        onVazifalar={() => {
          if (vazifaQulf) return;
          setTanlandi(true);
          goTo(vazifaJoyi >= 0 ? vazifaJoyi : 0);
        }}
      />
    );
  }

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
    // `tanlovgaQaytish` — tarix yozuvini ham iste'mol qiladi (hook izohiga qarang).
    tanlovga: tanlovgaQaytish,
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

      {/*
        BOSQICH KO'RSATKICHI OLIB TASHLANDI ("2 / 2 · Vazifalar" va chiziqlar).
        Dars to'liq ekranda ochiladi, ya'ni bu chrome FAQAT vazifalar
        bosqichida ko'rinardi va har doim oxirgi bosqichni — "2 / 2" ni —
        ko'rsatib turardi. Hech qanday ma'lumot bermaydigan, lekin ekranning
        eng qimmatli tepa qismini egallaydigan bo'lak edi. Bosqich nomi endi
        bo'limning O'Z sarlavhasida turadi.
      */}

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
              /*
               * "Ortga" — oldingi bosqich DARS bo'lsa, darsni qayta ochmaydi,
               * TANLOV ekraniga qaytaradi. Aks holda vazifalardan chiqmoqchi
               * bo'lgan odam har safar video darsning ichiga tushib qolardi.
               */
              onClick={() =>
                steps[safeIndex - 1]?.key === 'doska'
                  ? tanlovgaQaytish()
                  : goTo(safeIndex - 1)
              }
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

/**
 * 5-BLOK — ustoz bilan jonli savol-javob.
 *
 * Ilgari grammatika oqimining oxirgi bosqichi edi (`GrammarStepFlow` ichida).
 * Ekran va uning mantig'i o'zgarmadi — aynan o'sha `UstozDoska qism="suhbat"`,
 * faqat endi kunning mustaqil bloki sifatida o'z sahifasida ochiladi.
 */
function SuhbatFromBundle({ dayNumber, bundle }: { dayNumber: number; bundle: DailyCourseDayBundle }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { patchDay, getDay, loaded: kunlikLoaded, practicePromptCountByDay } = useKunlikProgress();
  const { access } = useAccess();
  const g = bundle.grammar;

  /*
   * SUHBAT SAVOLLARI — KUNNING TO'RT BO'LIMIDAN.
   *
   * Har bo'limdan bittadan: grammatika, lug'at, o'qish, gapirish. Ilgari
   * savollar darsning ichidan chiqardi va faqat grammatikaga tegishli
   * bo'lardi — o'quvchi lug'at, matn va gapirish ustida ishlagan bo'lsa
   * ham yakuniy suhbat ulardan hech narsa so'ramasdi.
   *
   * Savollar kelmasa suhbat baribir ochiladi: ustoz mavzu bo'yicha o'zi
   * suhbatni olib ketadi, oqim to'xtab qolmaydi.
   */
  const [suhbatSavollari, setSuhbatSavollari] = useState<KunSavol[] | null>(null);
  const [savollarYuklandi, setSavollarYuklandi] = useState(false);
  const doskaVazifalar = useMemo<DoskaVazifa[]>(() => doskaVazifalariniYig(g), [g]);

  useEffect(() => {
    if (!token) return;
    let bekor = false;
    setSavollarYuklandi(false);
    fetchKunSavollari(token, dayNumber)
      .then((s) => {
        if (!bekor) setSuhbatSavollari(s.length > 0 ? s : null);
      })
      .catch(() => {
        if (!bekor) setSuhbatSavollari(null);
      })
      .finally(() => {
        if (!bekor) setSavollarYuklandi(true);
      });
    return () => {
      bekor = true;
    };
  }, [token, dayNumber]);

  /*
   * QULF — DASTLABKI TO'RT BLOK TUGAMAGUNCHA OCHILMAYDI.
   *
   * Bosh sahifada kartani qulflash yetarli emas edi: manzilni qo'lda yozib
   * yoki eski havola orqali to'g'ridan-to'g'ri kirib bo'lardi. Suhbat
   * kunning YAKUNI — mavzu mashqlar bilan mustahkamlangach o'tiladi,
   * shuning uchun tekshiruv sahifaning o'zida ham turadi.
   *
   * Oltin a'zo (support hisobi) bundan mustasno — bosh sahifadagi qoida
   * bilan bir xil.
   */
  const oltin = Boolean(access?.golden);
  const kp = kunlikLoaded ? getDay(dayNumber) : null;
  const tayyor =
    oltin ||
    (kp ? isKunlikDayReadyForSuhbat({ ...kp, day_number: dayNumber }, practicePromptCountByDay) : false);

  /*
   * Progress yuklanmaguncha SUHBAT KO'RSATILMAYDI.
   *
   * Aks holda qulf hisoblanguncha `UstozDoska` mount bo'lib, ustoz gapira
   * boshlardi — ya'ni yopiq bo'lishi kerak bo'lgan suhbat bir zumga
   * ochilib ketardi.
   */
  if (!kunlikLoaded || !savollarYuklandi) {
    return <SkeletonRoyxat soni={2} className="py-4" />;
  }

  if (!tayyor) {
    return (
      <div className="rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-5 text-center">
        <p className="text-[15px] font-black text-[#2D1B69]">Savol-javob hali ochilmagan</p>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[#8B7FAB]">
          Bu kunning dastlabki to‘rt bo‘limini tugatganingizdan keyin ochiladi.
        </p>
        <button
          type="button"
          onClick={() => navigate(xaritaYoli())}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
        >
          Kunlik rejaga qaytish
        </button>
      </div>
    );
  }

  const mavzu = g?.topic?.title ?? '';
  if (!mavzu) {
    return (
      <div className="rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-5 text-center">
        <p className="text-[14px] font-bold text-[#2D1B69]">Bu kunda suhbat mavzusi yo'q.</p>
        <button
          type="button"
          onClick={() => navigate(xaritaYoli())}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
        >
          Kunlik reja
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8B7FAB]">
          {`KUN ${dayNumber} · SAVOL-JAVOB`}
        </p>
        <h1 className="grammar-heading mt-1.5 text-[26px] leading-[1.1] text-[#2D1B69]">{mavzu}</h1>
      </div>

      <UstozDoska
        key={`suhbat-${dayNumber}-${mavzu}`}
        qism="suhbat"
        mavzu={mavzu}
        nazariya={g!.topic!.theoryText}
        kun={dayNumber}
        vazifalar={doskaVazifalar}
        savollarManbasi={suhbatSavollari ?? undefined}
        /*
          Savol topilmadi — blok BAJARILDI deb belgilanmaydi, shunchaki
          kunlik rejaga qaytariladi. Aks holda o'quvchi bitta ham savolga
          javob bermay turib kunni yopib olardi.
        */
        onSavolYoq={() => navigate(xaritaYoli())}
        keyingiNomi="Kunlik reja"
        /*
          Belgi SAQLANIB BO'LGACH qaytamiz: bosh sahifa progressni darhol
          o'qiydi va patch yetib bormasa kun yana "tugallanmagan" bo'lib
          ko'rinardi.
        */
        onTugadi={() => {
          void patchDay(dayNumber, { suhbat_done: true }).finally(() => {
            navigate(xaritaYoli());
          });
        }}
      />
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

  /** Grammatika bloki har doim uchta mashqdan iborat. */
  const JAMI_VAZIFA = 3;
  const doneCount = [grammar1Done, grammar2Done, grammar3Done].filter(Boolean).length;
  const hammasiBajarildi = doneCount >= JAMI_VAZIFA;

  return (
    <div className="mt-2">
      {/*
        BO'LIM SARLAVHASI — RAMKADA.

        Ilgari tepada ikkita alohida bo'lak turardi: oqim ko'rsatkichi
        ("2 / 2 · Vazifalar") va yupqa "3 ta vazifa" qatori. Ikkalasi ham
        bir xil narsani aytardi, ammo ekranda ikki qavat joy egallardi va
        hech biri bo'limning boshlanishini ko'rsatib turmasdi.

        Endi bitta ixcham ramka: nomi, qancha qolgani va halqali ko'rsatkich.

        RANGI DOIM KO'K — bajarilgan holatda ham yashilga o'tmaydi. Ilgari
        o'tardi va natijada sarlavha pastdagi uchta yashil "bajarildi"
        kartasidan farq qilmay qolardi: ko'z ro'yxatning qayerdan
        boshlanganini topa olmasdi. Sarlavha karta emas — u BO'LIM NOMI,
        shuning uchun ranggi ham, o'lchami ham ro'yxatdan ajralib turadi.
      */}
      <div className="mb-6 flex items-center gap-3 rounded-[16px] border-[1.5px] border-[#DDD7F5] bg-[#F7F5FF] px-3.5 py-2.5">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#5B4CE0] text-white"
        >
          <ListChecks className="h-[19px] w-[19px]" strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase leading-none tracking-[0.14em] text-[#5B4CE0]">
            Vazifalar
          </p>
          <p className="mt-1 text-[11.5px] font-semibold leading-none text-[#8B7FAB]">
            {hammasiBajarildi ? 'Hammasi bajarildi' : `Yana ${JAMI_VAZIFA - doneCount} ta vazifa`}
          </p>
        </div>
        <MashqHalqasi
          kichik
          qiymat={doneCount}
          jami={JAMI_VAZIFA}
          tugagan={hammasiBajarildi}
          rang="#5B4CE0"
          fon="#E6E1F7"
        />
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
                    <p className="mt-0.5 truncate text-[12px] font-semibold text-[#8B7FAB]">
                      {count > 0 && !locked ? `${count} ta topshiriq` : subtitleMuted}
                    </p>
                  )}
                  {done && (
                    <p className="mt-0.5 text-[12px] font-black text-[#0F7C3A]">
                      ✓ TUGADI · {count} ta
                    </p>
                  )}
                </div>
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
  /*
   * Lug'at progressi `localStorage` da turadi va hodisa orqali xabar beradi.
   * State'ning o'zi kerak emas — faqat qayta chizish kerak.
   */
  const [, qaytaChiz] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    window.addEventListener('daily-vocab-progress', qaytaChiz);
    return () => window.removeEventListener('daily-vocab-progress', qaytaChiz);
  }, []);

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
    navigate(xaritaYoli());
  };

  const title = r.title?.trim() || 'Matn';

  return (
    <div className="space-y-4">
      {/* Premium header: back tile + pill + serif title + streak badge */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(xaritaYoli())}
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
    navigate(xaritaYoli());
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
                : xaritaYoli(),
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
            navigate(xaritaYoli());
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
        onBack={() => navigate(xaritaYoli())}
      />
    </>
  );
}
