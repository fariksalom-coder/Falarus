/**
 * VerbConjugationGamePage — «Fe'l ustasi» o'yini.
 *
 * Qoida: ekranda shaxs olmoshi va bo'sh joy turadi («Я ___»), pastda esa
 * infinitiv. O'yinchi to'g'ri tuslangan shaklni tanlaydi.
 *
 * Chalg'ituvchi javoblar AYNAN SHU fe'lning boshqa shakllari (пишешь, пишет,
 * пишут) — tasodifiy so'zlar emas. Shuning uchun o'yinchi taxmin qila olmaydi,
 * shaxs qo'shimchasini bilishi shart bo'ladi. Uzbek tilida shaxs-son boshqacha
 * ishlagani uchun aynan shu joy o'quvchiga eng qiyin keladi.
 *
 * Ma'lumot `src/data/russianVerbConjugation.ts` da — AI ajratgan va morfologiya
 * qoidalari bilan qayta tekshirilgan, shuning uchun bu yerda tekshiruv yo'q.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  History,
  Play,
  RotateCcw,
  Rocket,
  Trophy,
  X,
} from 'lucide-react';
import { VERB_PRONOUNS } from '../data/russianVerbConjugation';
import { VERB_ZAMONLARI, type VerbZamonlari } from '../data/russianVerbTenses';
import { playCorrectSound, playWrongSound } from '../utils/sound';

/**
 * O'YIN ZAMONLAR BO'YICHA BO'LINADI.
 *
 * Ilgari fe'llar A1–B2 darajasiga ajratilardi. Rus tilini o'rganayotgan odam
 * uchun esa fe'lning eng qiyin joyi daraja emas — ZAMON: uch zamon uch xil
 * yasaladi va o'zbek tilida bunday bo'linish yo'q.
 *
 * Har fe'l o'z zamoniga aniq joylashtirilgan (`russianVerbTenses.ts`):
 * tugallangan fe'lning hozirgi zamoni YO'Q («напишу» — kelasi zamon), shuning
 * uchun u hozirgi zamon guruhida umuman qatnashmaydi.
 */
type Zamon = 'hozir' | 'otgan' | 'kelasi';

const ZAMON_NOMI: Record<Zamon, string> = {
  hozir: 'Hozirgi zamon',
  otgan: "O'tgan zamon",
  kelasi: 'Kelasi zamon',
};

/**
 * O'TGAN ZAMONDA EGA BOSHQACHA.
 *
 * Rus tilida o'tgan zamon shaxsga emas, JINS va SONGA qarab o'zgaradi:
 * он читал / она читала / оно читало / они читали. O'zbek tilida jins
 * umuman yo'q, shuning uchun o'quvchi uchun eng qiyin joy aynan shu.
 */
const OTGAN_EGALAR = ['Он', 'Она', 'Оно', 'Они'];

/**
 * HAR ZAMONNING O'Z BELGISI VA RANGI.
 *
 * Kirish ekranida uchta zamon yonma-yon turadi va ular bir-biridan darhol
 * ajralib turishi kerak. Vaqt yo'nalishi belgidan ham o'qiladi: orqaga
 * qaytarish — o'tgan, ijro — hozirgi, raketa — kelasi. O'quvchi zamon nomini
 * o'qib ulgurmasa ham, qaysi biri qayerdaligini rang va belgidan eslab qoladi.
 */
const ZAMON_USLUBI: Record<
  Zamon,
  { ochiq: string; tuq: string; Belgi: typeof History }
> = {
  otgan: { ochiq: '#8B5CF6', tuq: '#6D28D9', Belgi: History },
  hozir: { ochiq: '#F59E0B', tuq: '#D97706', Belgi: Play },
  kelasi: { ochiq: '#0EA5A5', tuq: '#0F766E', Belgi: Rocket },
};

/** Kirish ekranidagi tartib: vaqt chapdan o'ngga oqadi. */
const ZAMON_TARTIBI: Zamon[] = ['otgan', 'hozir', 'kelasi'];

/**
 * O'YINNING RANGI — o'yinlar ro'yxatidagi kartochkasi bilan BIR XIL.
 *
 * Ilgari kartochka sariq, o'yinning ichi esa ko'k edi: bosgan odam boshqa
 * joyga tushgandek his qilardi. Rang — o'yinning kimligini bildiruvchi eng
 * kuchli belgi, shuning uchun u bir joydan olinadi.
 */
const RANG = '#F59E0B';
const RANG_TUQ = '#D97706';

/** Bir raundda nechta savol. */
const ROUND_SIZE = 10;
/** Har savolga beriladigan vaqt (soniya). */
const QUESTION_SECONDS = 15;
/** To'g'ri javob uchun asosiy ball; qolgani vaqt va seriyadan. */
const BASE_POINTS = 10;
/**
 * XATO JAVOB UCHUN JARIMA.
 *
 * To'g'ri javobdan kamroq (10 + vaqt + seriya): o'yin jazolash uchun emas,
 * o'rgatish uchun. Lekin jarima BO'LMASA tanlovni o'ylamay bosish bepul
 * bo'lardi — hisob faqat o'sardi.
 *
 * Vaqt tugagani ham xato deb hisoblanadi: aks holda javobni bilmagan o'yinchi
 * uchun eng foydali yo'l — hech narsa bosmasdan kutish bo'lib qolardi.
 */
const JARIMA = 5;
/** Javobdan keyin natijani ko'rsatib turish (ms) — o'yinchi o'qib ulgursin. */
const REVEAL_MS = 1250;

const BEST_KEY = 'falarus.verbGame.best';

/** Zamon guruhidagi fe'llar. */
function zamonToplami(zamon: Zamon): VerbZamonlari[] {
  if (zamon === 'hozir') return VERB_ZAMONLARI.filter((v) => v.hozir);
  if (zamon === 'kelasi') return VERB_ZAMONLARI.filter((v) => v.kelasi);
  return VERB_ZAMONLARI;
}

/** Fe'lning tanlangan zamondagi oltala (o'tganda to'rtta) shakli. */
function zamonShakllari(v: VerbZamonlari, zamon: Zamon): string[] | null {
  if (zamon === 'hozir') return v.hozir;
  if (zamon === 'otgan') return v.otgan;
  return v.kelasi?.shakllar ?? null;
}

/**
 * Menyudagi NAMUNA — zamon qanday yasalishini bir qarashda ko'rsatadi.
 *
 * Tanish fe'llardan olinadi (читать, писать, жить): o'quvchi ularni allaqachon
 * biladi, shuning uchun e'tibor SHAKLGA tushadi. Bazada bo'lmasa, o'sha
 * zamondagi birinchi oson fe'lga tushiladi.
 */
function zamonNamunalari(zamon: Zamon): string[] {
  const tanish = ['читать', 'писать', 'жить'];
  const olingan: string[] = [];
  const nomzodlar = [
    ...tanish
      .map((inf) => VERB_ZAMONLARI.find((v) => v.inf === inf))
      .filter((v): v is VerbZamonlari => Boolean(v)),
    ...zamonToplami(zamon).filter((v) => v.daraja === 'A1'),
  ];

  for (const v of nomzodlar) {
    if (olingan.length >= 3) break;
    const shakllar = zamonShakllari(v, zamon);
    if (!shakllar) continue;
    // Har namunada boshqa ega: он / она / они — farqi ko'rinib tursin.
    // O'tgan zamonda «оно» olinmaydi: u kam uchraydi va namuna g'alati
    // eshitiladi («оно жило») — jins farqi «он/она» da allaqachon ko'rinadi.
    const i = zamon === 'otgan' ? [0, 1, 3][olingan.length] : [0, 1, 5][olingan.length];
    const ega = zamon === 'otgan' ? OTGAN_EGALAR[i] : VERB_PRONOUNS[i].split(' / ')[0];
    olingan.push(`${ega.toLowerCase()} ${shakllar[i]}`);
  }
  return olingan;
}


type Question = {
  inf: string;
  uz: string;
  /** Ekranda turadigan ega: «Я», «Она» … */
  ega: string;
  options: string[];
  correct: string;
};

type Miss = { pronoun: string; inf: string; correct: string; picked: string | null };

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Savol yasaydi. Chalg'ituvchilar shu fe'lning AYNAN SHU ZAMONDAGI boshqa
 * shakllaridan olinadi — tasodifiy so'zlar emas, shuning uchun o'yinchi
 * taxmin qila olmaydi, shaklni bilishi shart bo'ladi.
 *
 * Ba'zi fe'lda shakllar takrorlanadi (мы/вы yoki qaytim fe'llarning o'tgan
 * zamoni), uch xil chalg'ituvchi yig'ilmasa — fe'l o'tkazib yuboriladi.
 */
function buildQuestion(verb: VerbZamonlari, zamon: Zamon): Question | null {
  const shakllar = zamonShakllari(verb, zamon);
  if (!shakllar || !shakllar.length) return null;

  const egalar = zamon === 'otgan' ? OTGAN_EGALAR : VERB_PRONOUNS;
  const i = Math.floor(Math.random() * shakllar.length);
  const correct = shakllar[i];
  const others = shuffle([...new Set(shakllar.filter((f) => f !== correct))]);
  if (others.length < 3) return null;

  return {
    inf: verb.inf,
    uz: verb.uz,
    ega: egalar[i] ?? egalar[0],
    options: shuffle([correct, ...others.slice(0, 3)]),
    correct,
  };
}

export default function VerbConjugationGamePage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [zamon, setZamon] = useState<Zamon>('hozir');
  const [phase, setPhase] = useState<'menu' | 'play' | 'result'>('menu');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [misses, setMisses] = useState<Miss[]>([]);
  /**
   * Har savolning natijasi — tepadagi chiziqchalar shu ro'yxatdan rang oladi.
   * `misses` yetmaydi: unda faqat xatolar bor va ular nechanchi savol ekani
   * yozilmaydi, ya'ni chiziqchani to'g'ri bo'yash uchun ishlatib bo'lmaydi.
   */
  const [natijalar, setNatijalar] = useState<Array<'togri' | 'xato'>>([]);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [best, setBest] = useState(0);
  /** Oxirgi javob uchun berilgan ball — kartaning tepasida uchib chiqadi. */
  const [gain, setGain] = useState<number | null>(null);

  const tickRef = useRef<number | null>(null);
  const nextRef = useRef<number | null>(null);
  /**
   * Bitta savolga ikki marta javob yozilmasin. `picked` holati yetarli emas:
   * taymer tugashi va bosish bir vaqtda kelsa, React holatni ulgurib
   * yangilamaydi va ikkala javob ham hisoblanib ketardi.
   */
  const lockRef = useRef(false);
  const answerRef = useRef<(choice: string | null) => void>(() => {});
  /** Ball hisoblash uchun — `answer` ni har soniyada qayta yaratmaslik maqsadida. */
  const secondsLeftRef = useRef(QUESTION_SECONDS);
  secondsLeftRef.current = secondsLeft;

  const question = questions[index] ?? null;
  const answered = picked !== null;

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    if (Number.isFinite(saved)) setBest(saved);
  }, []);

  const clearTimers = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (nextRef.current) window.clearTimeout(nextRef.current);
    tickRef.current = null;
    nextRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /**
   * Raundni boshlaydi. Zamon PARAMETR bilan keladi: kartaga bosilganda
   * `setZamon` hali qo'llanmagan bo'ladi (React holatni keyingi chizishda
   * yangilaydi), ya'ni holatdan o'qilsa eski zamon bilan savol yasalardi.
   */
  const startRound = useCallback((tanlangan: Zamon) => {
    clearTimers();
    setZamon(tanlangan);
    const toplam = zamonToplami(tanlangan);
    const picks: Question[] = [];
    const usedInf = new Set<string>();
    /*
     * Raund OSON fe'llardan boshlanadi.
     *
     * Bazada 1111 fe'l bor va ularning ko'pi kam uchraydigan, kitobiy so'zlar
     * («аннулировать»). Agar hammasi tasodifiy aralashtirilsa, o'yinchi
     * birinchi savoldayoq tanimagan fe'liga duch keladi va zamon shaklini
     * emas, so'zning o'zini taxmin qila boshlaydi. Shuning uchun avval A1/A2,
     * keyin qolganlari.
     */
    const oson = shuffle(toplam.filter((v) => v.daraja === 'A1' || v.daraja === 'A2'));
    const qolgani = shuffle(toplam.filter((v) => v.daraja !== 'A1' && v.daraja !== 'A2'));
    for (const verb of [...oson, ...qolgani]) {
      if (picks.length >= ROUND_SIZE) break;
      if (usedInf.has(verb.inf)) continue;
      const q = buildQuestion(verb, tanlangan);
      if (!q) continue;
      usedInf.add(verb.inf);
      picks.push(q);
    }
    if (picks.length === 0) return;
    lockRef.current = false;
    setQuestions(picks);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setMisses([]);
    setNatijalar([]);
    setGain(null);
    setSecondsLeft(QUESTION_SECONDS);
    setPhase('play');
  }, [clearTimers]);

  /** Javobni qayd etadi. `choice === null` — vaqt tugagani. */
  const answer = useCallback(
    (choice: string | null) => {
      if (!question || lockRef.current) return;
      lockRef.current = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;

      const isCorrect = choice === question.correct;
      setPicked(choice ?? '');
      setNatijalar((n) => [...n, isCorrect ? 'togri' : 'xato']);

      if (isCorrect) {
        const nextStreak = streak + 1;
        // Tez javob va uzun seriya ko'proq ball beradi — shoshilishga arziydi.
        const earned = BASE_POINTS + secondsLeftRef.current + Math.min(nextStreak, 10) * 2;
        setScore((s) => s + earned);
        setGain(earned);
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setCorrectCount((c) => c + 1);
        playCorrectSound();
      } else {
        setStreak(0);
        // Hisob manfiyga tushmaydi — o'yinchi «qarzdor» bo'lib qolmasin.
        setScore((s) => Math.max(0, s - JARIMA));
        setGain(-JARIMA);
        setMisses((m) => [
          ...m,
          {
            pronoun: question.ega,
            inf: question.inf,
            correct: question.correct,
            picked: choice,
          },
        ]);
        playWrongSound();
      }

      const isLast = index + 1 >= questions.length;
      nextRef.current = window.setTimeout(() => {
        lockRef.current = false;
        setPicked(null);
        setGain(null);
        setSecondsLeft(QUESTION_SECONDS);
        if (isLast) setPhase('result');
        else setIndex(index + 1);
      }, REVEAL_MS);
    },
    [index, question, questions.length, streak],
  );

  /**
   * Taymer `answer` ga bevosita bog'lanmaydi: `answer` har soniyada qayta
   * yaratilardi va effekt intervalni sekundiga bir marta o'chirib-yoqib turardi.
   * Shuning uchun eng oxirgi `answer` ref orqali chaqiriladi.
   */
  useEffect(() => {
    answerRef.current = answer;
  });

  /** Savol taymeri — har yangi savolda qaytadan boshlanadi. */
  useEffect(() => {
    if (phase !== 'play' || answered) return;
    // Qolgan vaqtni haqiqiy soatdan hisoblaymiz — tab fonga o'tsa ham to'g'ri qoladi.
    const startedAt = Date.now();
    setSecondsLeft(QUESTION_SECONDS);
    tickRef.current = window.setInterval(() => {
      const left = QUESTION_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = null;
        setSecondsLeft(0);
        answerRef.current(null);
        return;
      }
      setSecondsLeft(left);
    }, 250);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [phase, answered, index]);

  /**
   * Raund tugagach rekordni saqlaymiz. Yozish `setBest` updater'i ichida emas —
   * React updater'ni ikki marta chaqirishi mumkin, u yerda nojo'ya ta'sir bo'lmasin.
   */
  const bestRef = useRef(0);
  bestRef.current = best;
  useEffect(() => {
    if (phase !== 'result' || score <= bestRef.current) return;
    window.localStorage.setItem(BEST_KEY, String(score));
    setBest(score);
  }, [phase, score]);

  const quit = () => {
    clearTimers();
    lockRef.current = false;
    if (phase === 'play') {
      setPhase('menu');
      return;
    }
    navigate('/games');
  };

  const tenseLabel = ZAMON_NOMI[zamon];


  return (
    <div className="min-h-screen bg-app-bg pb-[84px]">
      <header className="mx-auto flex w-full max-w-[560px] items-center gap-3 px-4 pb-4 pt-2.5">
        <button
          type="button"
          onClick={quit}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-surface text-app-text ring-1 ring-app-border transition active:scale-95"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-black text-app-text">Fe'l ustasi</h1>
          <p className="text-[12px] font-bold text-app-text-muted">
            {phase === 'play'
              ? `${ZAMON_NOMI[zamon]} · ${score} ball`
              : "To'g'ri shaklni tanlang"}
          </p>
        </div>

        {/* Seriya — har to'g'ri javobda alanga kattalashib qo'yadi. */}
        <AnimatePresence>
          {phase === 'play' && streak > 1 ? (
            <motion.span
              key={streak}
              initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2.5 py-1.5 text-[12px] font-black text-[#B45309] ring-1 ring-[#FCD9A5]"
            >
              <Flame className="h-3.5 w-3.5" strokeWidth={2.6} /> {streak}
            </motion.span>
          ) : null}
        </AnimatePresence>

        {phase === 'menu' && best > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-app-surface px-3 py-1.5 text-[12px] font-black text-app-text ring-1 ring-app-border">
            <Trophy className="h-3.5 w-3.5 text-[#F59E0B]" /> {best}
          </span>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[560px] px-4">
        <AnimatePresence mode="wait">
          {/* ------------------------------ MENYU ------------------------------ */}
          {phase === 'menu' ? (
            <motion.div
              key="menu"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/*
                KIRISH EKRANI — faqat uchta zamon.

                Ilgari bu yerda qoidalar ro'yxati (vaqt, seriya, savol soni,
                xatolar) turardi va o'yinchi o'ynashdan oldin to'rt qatorni
                o'qishi kerak edi. Qoidalarning hammasi o'yinning o'zida
                ko'rinadi: taymer aylanadi, seriya olov bilan chiqadi, ball
                uchib ketadi. Shuning uchun bu yerda faqat TANLOV qoldi.

                Kartaga bosilishi bilan raund boshlanadi — «Boshlash» tugmasi
                keraksiz qadam edi.
              */}
              {ZAMON_TARTIBI.map((z) => {
                const uslub = ZAMON_USLUBI[z];
                const { Belgi } = uslub;
                const namunalar = zamonNamunalari(z);
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => startRound(z)}
                    className="flex w-full items-center gap-3.5 rounded-[22px] p-4 text-left text-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.6)] transition active:scale-[0.99]"
                    style={{
                      background: `linear-gradient(135deg, ${uslub.ochiq} 0%, ${uslub.tuq} 100%)`,
                    }}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/18">
                      <Belgi className="h-6 w-6" strokeWidth={2.4} aria-hidden />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-black leading-tight">
                        {ZAMON_NOMI[z]}
                      </span>
                      <span className="mt-1 block truncate text-[12.5px] font-bold text-white/80">
                        {namunalar.join(' · ')}
                      </span>
                    </span>

                    <ArrowRight className="h-5 w-5 shrink-0 text-white/70" aria-hidden />
                  </button>
                );
              })}
            </motion.div>
          ) : null}

          {/* ------------------------------ O'YIN ------------------------------ */}
          {phase === 'play' && question ? (
            <motion.div
              key="play"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/*
                SAVOLLAR YO'LI — har savol bitta chiziqcha.
                To'g'ri javob YASHIL, xato QIZIL bo'lib qoladi: o'yinchi raund
                o'rtasida ham «qanday ketyapman» degan savolga bir qarashda
                javob oladi. Ilgari hammasi bir xil sariq edi va faqat nechta
                savol o'tganini ko'rsatardi.
              */}
              <div className="flex gap-1.5">
                {questions.map((_, i) => {
                  const natija = natijalar[i];
                  const joriy = i === index && !answered;
                  return (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                        joriy ? 'bg-[#F59E0B]/35' : 'bg-app-border'
                      }`}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          originX: 0,
                          background: natija === 'xato' ? '#EF4444' : '#22A552',
                        }}
                        initial={false}
                        animate={{ scaleX: natija ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Savol kartasi — har savolda yangidan sakrab chiqadi */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  /*
                    KARTANING O'ZI JAVOB BERADI: to'g'ri bo'lsa yashil, xato
                    bo'lsa qizil tusga kiradi. Ilgari faqat bo'sh joydagi
                    so'zning rangi o'zgarardi — o'yinchining ko'zi esa o'sha
                    payt pastdagi variantlarda bo'lardi va tepadagi ingichka
                    signalni sezmasdi.
                  */
                  className={`relative overflow-hidden rounded-[24px] p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 transition-colors duration-200 ${
                    !answered
                      ? 'bg-app-surface ring-app-border'
                      : picked === question.correct
                        ? 'bg-[#22A552]/10 ring-[#22A552]'
                        : 'bg-[#EF4444]/10 ring-[#EF4444]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-app-surface-elevated px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-app-text-muted ring-1 ring-app-border">
                      {tenseLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <VaqtYuguruvchi
                        seconds={QUESTION_SECONDS}
                        left={secondsLeft}
                        paused={answered}
                      />
                      <TimerRing
                        key={index}
                        seconds={QUESTION_SECONDS}
                        left={secondsLeft}
                        paused={answered}
                      />
                    </div>
                  </div>

                  {/* «Я ___» — javob berilgach bo'sh joyga so'z tushadi */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                    <span className="text-[30px] font-black leading-none text-app-text">
                      {question.ega}
                    </span>
                    <span className="relative inline-flex min-w-[132px] items-center justify-center">
                      <AnimatePresence mode="wait" initial={false}>
                        {answered ? (
                          <motion.span
                            key="filled"
                            initial={
                              prefersReducedMotion ? false : { scale: 0.5, y: -14, opacity: 0 }
                            }
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                            className={`text-[30px] font-black leading-none ${
                              picked === question.correct ? 'text-[#22A552]' : 'text-[#EF4444]'
                            }`}
                          >
                            {picked || '—'}
                          </motion.span>
                        ) : (
                          <motion.span
                            key="blank"
                            initial={false}
                            exit={{ opacity: 0 }}
                            className="block h-[3px] w-[132px] rounded-full bg-app-border"
                          />
                        )}
                      </AnimatePresence>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col items-center gap-1">
                    <span className="rounded-full bg-[#F59E0B]/12 px-3.5 py-1.5 text-[16px] font-black text-[#B45309]">
                      {question.inf}
                    </span>
                    <span className="text-[13px] font-bold text-app-text-muted">
                      {question.uz}
                    </span>
                  </div>

                  {/*
                    BALL O'ZGARISHI — kartaning CHAP chetida, pastdan tepaga.
                    Ilgari u o'rtada, fe'l va olmosh USTIDAN ko'tarilardi va
                    aynan javob o'qiladigan joyni to'sib qo'yardi. Chetda esa
                    ko'zga tashlanadi, lekin matnga xalaqit bermaydi.
                    Yashil «+» — qo'shildi, qizil «−» — ayirildi.
                  */}
                  <AnimatePresence>
                    {gain !== null ? (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, y: 6, scale: 0.85 }}
                        animate={{ opacity: 1, y: -54, scale: 1 }}
                        exit={{ opacity: 0, y: -74 }}
                        transition={{ duration: 0.75, ease: [0.22, 0.9, 0.3, 1] }}
                        className={`pointer-events-none absolute bottom-3 left-4 text-[20px] font-black ${
                          gain > 0 ? 'text-[#22A552]' : 'text-[#EF4444]'
                        }`}
                      >
                        {gain > 0 ? `+${gain}` : `−${Math.abs(gain)}`}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>

                  {/* To'g'ri javobda kartadan uchqunlar sachraydi */}
                  {answered && picked === question.correct && !prefersReducedMotion ? (
                    <Sparks />
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {/* Javob variantlari — navbat bilan pastdan chiqadi */}
              <div className="grid grid-cols-2 gap-2.5">
                {question.options.map((option, i) => {
                  const isCorrect = option === question.correct;
                  const isPicked = picked === option;
                  let tone =
                    'bg-app-surface text-app-text ring-app-border active:scale-[0.97]';
                  if (answered && isCorrect) {
                    tone = 'bg-[#22A552] text-white ring-[#22A552]';
                  } else if (answered && isPicked) {
                    tone = 'bg-[#EF4444] text-white ring-[#EF4444]';
                  } else if (answered) {
                    tone = 'bg-app-surface text-app-text-muted ring-app-border opacity-50';
                  }
                  return (
                    <motion.button
                      key={`${index}-${option}`}
                      type="button"
                      onClick={() => answer(option)}
                      disabled={answered}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                      animate={
                        answered && isPicked && !isCorrect && !prefersReducedMotion
                          ? { opacity: 1, y: 0, x: [0, -7, 7, -5, 5, 0] }
                          : { opacity: 1, y: 0, x: 0 }
                      }
                      transition={
                        answered
                          ? { duration: 0.36 }
                          : { delay: i * 0.05, type: 'spring', stiffness: 380, damping: 26 }
                      }
                      className={`flex min-h-[62px] items-center justify-center gap-1.5 rounded-2xl px-3 text-[18px] font-black shadow-[0_10px_22px_-16px_rgba(15,23,42,0.5)] ring-1 transition-colors ${tone}`}
                    >
                      {answered && isCorrect ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                      {answered && isPicked && !isCorrect ? (
                        <X className="h-4 w-4" strokeWidth={3} />
                      ) : null}
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-[12px] font-bold text-app-text-muted">
                {index + 1} / {questions.length}
              </p>
            </motion.div>
          ) : null}

          {/* ----------------------------- NATIJA ----------------------------- */}
          {phase === 'result' ? (
            <motion.div
              key="result"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="space-y-4"
            >
              <div className="rounded-[24px] bg-app-surface p-6 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 ring-app-border">
                <motion.div
                  initial={prefersReducedMotion ? false : { scale: 0.4, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.1 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F59E0B]/12 text-[32px]"
                >
                  {correctCount === questions.length ? '🏆' : correctCount >= 7 ? '🎉' : '💪'}
                </motion.div>
                <p className="mt-3 text-[13px] font-black uppercase tracking-wide text-app-text-muted">
                  Yig'ilgan ball
                </p>
                <CountUp value={score} reduced={Boolean(prefersReducedMotion)} />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="To'g'ri" value={`${correctCount}/${questions.length}`} />
                  <Stat label="Seriya" value={String(bestStreak)} />
                  <Stat label="Rekord" value={String(Math.max(best, score))} />
                </div>
              </div>

              {misses.length > 0 ? (
                <div className="rounded-[24px] bg-app-surface p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 ring-app-border">
                  <p className="text-[13px] font-black uppercase tracking-wide text-app-text-muted">
                    Takrorlash kerak
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {misses.map((m, i) => (
                      <motion.li
                        key={`${m.inf}-${i}`}
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-app-surface-elevated px-3.5 py-2.5"
                      >
                        <span className="min-w-0 text-[13px] font-bold text-app-text-muted">
                          {m.pronoun} · {m.inf}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[14px] font-black">
                          {m.picked ? (
                            <s className="text-[#EF4444]/70">{m.picked}</s>
                          ) : (
                            <span className="text-[12px] font-bold text-app-text-muted">
                              vaqt tugadi
                            </span>
                          )}
                          <span className="text-[#22A552]">{m.correct}</span>
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPhase('menu')}
                  className="min-h-[54px] rounded-2xl bg-app-surface text-[15px] font-black text-app-text ring-1 ring-app-border transition active:scale-[0.98]"
                >
                  Zamon
                </button>
                <button
                  type="button"
                  onClick={() => startRound(zamon)}
                  style={{ background: RANG, boxShadow: `0 16px 32px -14px ${RANG_TUQ}` }}
                  className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl text-[15px] font-black text-white transition active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2.6} /> Yana
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

/** Vaqt halqasi — qolgan soniya kamayganda bo'shab boradi va oxirida qizaradi. */
/**
 * VAQT YUGURUVCHISI — taymer yonidagi jonli oyna.
 *
 * Ichida haqiqiy animatsiya lavhasi ketadi: cho'lda chang ko'targanicha
 * yugurayotgan yigit (`public/games/fel-yugurish.mp4`). Emoji o'rniga video
 * qo'yilishining sababi — u qurilmaga qarab o'zgarmaydi va harakati tirik.
 *
 * ENG MUHIMI: lavha VAQTGA BOG'LIQ TEZLIKDA o'ynaydi. Vaqt to'la bo'lsa
 * sekin (0.6x) — yigit sekin yuguradi; vaqt tugay deganda 2.3x gacha
 * tezlashadi. Ya'ni shoshilish kerakligi raqamni o'qimasdan, ko'z chetida
 * ham seziladi. Javob berilgach lavha to'xtaydi.
 *
 * Harakat kamaytirilgan rejimda (`prefers-reduced-motion`) video umuman
 * o'ynatilmaydi — o'rniga bitta kadr turadi.
 */
function VaqtYuguruvchi({
  seconds,
  left,
  paused,
}: {
  seconds: number;
  left: number;
  paused: boolean;
}) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qolgan = Math.max(0, Math.min(1, left / seconds));

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    // 0.6x (vaqt ko'p) -> 2.3x (vaqt tugayapti).
    el.playbackRate = 0.6 + (1 - qolgan) * 1.7;
    if (paused) el.pause();
    else void el.play().catch(() => undefined);
  }, [qolgan, paused, reduce]);

  if (reduce) {
    return (
      <img
        src="/games/fel-yugurish.jpg"
        alt=""
        aria-hidden
        className="h-[34px] w-[92px] shrink-0 rounded-xl object-cover ring-1 ring-app-border"
      />
    );
  }

  return (
    <span className="relative h-[34px] w-[92px] shrink-0 overflow-hidden rounded-xl ring-1 ring-app-border">
      <video
        ref={videoRef}
        src="/games/fel-yugurish.mp4"
        poster="/games/fel-yugurish.jpg"
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="h-full w-full object-cover"
      />
      {/* Vaqt tugayotganda oyna qizil tus oladi — video ham ogohlantiradi. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ background: 'rgba(239,68,68,0.28)', opacity: qolgan <= 0.33 ? 1 : 0 }}
      />
    </span>
  );
}

function TimerRing({
  seconds,
  left,
  paused,
}: {
  seconds: number;
  left: number;
  paused: boolean;
}) {
  const R = 15;
  const C = 2 * Math.PI * R;
  const ratio = Math.max(0, Math.min(1, left / seconds));
  const danger = left <= 5 && !paused;
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3" className="stroke-app-border" />
        <motion.circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke={danger ? '#EF4444' : RANG}
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - ratio) }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </svg>
      <span
        className={`absolute text-[12px] font-black ${danger ? 'text-[#EF4444]' : 'text-app-text'}`}
      >
        {left}
      </span>
    </span>
  );
}

/** To'g'ri javobda kartadan sachraydigan uchqunlar. */
function Sparks() {
  const parts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.4,
        distance: 60 + Math.random() * 70,
        size: 5 + Math.random() * 5,
        color: ['#22A552', '#2563EB', '#F59E0B'][i % 3],
      })),
    [],
  );
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            scale: 0.3,
          }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ width: p.size, height: p.size, background: p.color }}
          className="absolute rounded-full"
        />
      ))}
    </span>
  );
}

/** Yakuniy ballni noldan sanab ko'rsatadi. */
function CountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const DURATION = 750;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // easeOutCubic — oxirida sekinlashadi
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <p className="text-[44px] font-black leading-none text-app-text">{shown}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-app-surface-elevated px-2 py-2.5">
      <p className="text-[16px] font-black text-app-text">{value}</p>
      <p className="text-[11px] font-bold text-app-text-muted">{label}</p>
    </div>
  );
}
