/**
 * WordRiseGamePage — «So'z savati» o'yini.
 *
 * O'yinchi bitta RODNI tanlaydi, ekranda esa uchala rodning so'zlari aralash
 * ko'tariladi. Faqat tanlangan rodga tegishli so'zni bosish kerak:
 *
 *   - o'ziniki    → savatga uchadi, ball qo'shiladi
 *   - begonasi    → xato: ball kamayadi, uch xatodan keyin o'yin tugaydi
 *   - o'ziniki tepaga chiqib ketdi → o'yin tugaydi
 *   - begonasi tepaga chiqib ketdi → hech narsa bo'lmaydi
 *
 * Qoidalar (rodlar, aralashma, tezlik, ball) `shared/wordRise.ts` da va testlar
 * bilan qoplangan — bu fayl faqat ko'rinishni boshqaradi.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import {
  MAX_MISTAKES,
  MAX_ON_SCREEN,
  WORD_RISE_GENDERS,
  WORD_RISE_GENDER_META,
  WRONG_PENALTY,
  genderWords,
  pickNextWord,
  spawnDelayMs,
  travelMs,
  wordScore,
  type RussianGender,
} from '../../shared/wordRise';
import { playCorrectSound, playWrongSound } from '../utils/sound';

/** Bosilgan so'z ustida ko'rinadigan «+N» yozuvi qancha turadi (ms). */
const POP_MS = 700;

/** Tepadagi xavf chizig'i — so'z shu yerga tegsa o'yin tugaydi (px). */
const DANGER_Y = 62;
/** Savatga uchish animatsiyasi (ms). */
const CATCH_MS = 420;
/** So'z yo'lining necha foizidan keyin «xavfli» deb belgilanadi. */
const DANGER_FROM = 0.74;

/**
 * ROD RANGLARI — o'yin bo'ylab BITTA joydan.
 *
 * Rang bu o'yinda ma'no tashiydi: o'yinchi qaysi rodni yig'ayotganini rangdan
 * eslab qoladi (ko'k — мужской, pushti — женский, yashil — средний). Ilgari
 * bu gradientlar faqat menyu tugmasining ichida yozilgan edi va o'yin
 * maydonida umuman ishlatilmasdi — savat ham, hisob ham rangsiz turardi.
 */
const ROD_RANGI: Record<RussianGender, { ochiq: string; tuq: string; nur: string }> = {
  m: { ochiq: '#3B82F6', tuq: '#1D4ED8', nur: 'rgba(59,130,246,0.55)' },
  f: { ochiq: '#F472B6', tuq: '#DB2777', nur: 'rgba(244,114,182,0.55)' },
  n: { ochiq: '#34D399', tuq: '#059669', nur: 'rgba(52,211,153,0.55)' },
};

const ROD_YORLIGI: Record<RussianGender, string> = { m: 'ОН', f: 'ОНА', n: 'ОНО' };

/**
 * SAVAT — o'yin maydonining tepasidagi nishon.
 *
 * Ilgari bu oddiy 🧺 emoji edi: qurilmaga qarab har xil ko'rinardi, rangi
 * o'yin bilan bog'lanmasdi va so'z tutilganda hech qanday javob bermasdi.
 * Endi u chizilgan savat — gardishi tanlangan rod rangida va ustida o'sha
 * rodning yorlig'i turadi, ya'ni o'yinchi «nimani yig'ayapman» degan savolga
 * ekranning o'zidan javob oladi.
 *
 * So'z tutilganda savat sakraydi va atrofida nur yonadi — bu «tushdi» degan
 * eng tez signal, ballni o'qishdan ko'ra tezroq yetib boradi.
 */
function Savat({
  rod,
  tutilgan,
  reduce,
}: {
  rod: RussianGender;
  /** Tutilgan so'zlar soni — har o'zgarganda savat javob beradi. */
  tutilgan: number;
  reduce: boolean;
}) {
  const rang = ROD_RANGI[rod];
  const id = `savat-${rod}`;

  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-[4] -translate-x-1/2">
      {/* Tutilganda yonadigan nur */}
      <AnimatePresence>
        {tutilgan > 0 ? (
          <motion.span
            key={tutilgan}
            aria-hidden
            className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg"
            style={{ background: rang.nur }}
            initial={{ opacity: 0.7, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        ) : null}
      </AnimatePresence>

      {/* Doimiy yumshoq nur — savat qorong'i maydonda "nishon" bo'lib turadi. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-12 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
        style={{ background: rang.nur, opacity: 0.35 }}
      />

      <motion.div
        className="relative"
        animate={reduce ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.svg
          key={tutilgan}
          width="96"
          height="76"
          viewBox="0 0 96 76"
          aria-hidden
          initial={reduce ? false : { scale: 1 }}
          animate={reduce ? {} : { scale: [1, 1.1, 1] }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.5))' }}
        >
          <defs>
            {/* Tanasi: yuqoridan yorug', pastga qarab qorayadi. */}
            <linearGradient id={`${id}-tana`} x1="0" y1="0" x2="0.25" y2="1">
              <stop offset="0%" stopColor="#F0C085" />
              <stop offset="55%" stopColor="#C08A4A" />
              <stop offset="100%" stopColor="#7E5227" />
            </linearGradient>
            {/* Gardish — rod rangi; tepasi ochiqroq, pastki qismi to'qroq. */}
            <linearGradient id={`${id}-gardish`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rang.ochiq} />
              <stop offset="100%" stopColor={rang.tuq} />
            </linearGradient>
            {/* Savat ichi — chuqurlik hissi uchun. */}
            <radialGradient id={`${id}-ichi`} cx="0.5" cy="0.35" r="0.75">
              <stop offset="0%" stopColor="#2A1B0C" />
              <stop offset="100%" stopColor="#120A03" />
            </radialGradient>
            {/* Chap yonidagi yorug'lik chizig'i. */}
            <linearGradient id={`${id}-nur`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Yerdagi soya — savat "osilib" turmasin. */}
          <ellipse cx="48" cy="72" rx="26" ry="4" fill="rgba(0,0,0,0.35)" />

          {/* TANASI */}
          <path
            d="M13 24 L21 62 Q23 68 30 68 L66 68 Q73 68 75 62 L83 24 Z"
            fill={`url(#${id}-tana)`}
          />

          {/* Gardish ostidagi soya — halqa tanaga "o'tirgan"dek ko'rinsin */}
          <path d="M13.6 27 Q48 34 82.4 27 L81.6 31 Q48 38 14.4 31 Z" fill="rgba(60,32,8,0.28)" />

          {/* Tagi — to'q chiziq, savat yerga tayangandek */}
          <path d="M21.8 62 Q48 67 74.2 62 L75 62 Q73 68 66 68 L30 68 Q23 68 21 62 Z" fill="rgba(60,32,8,0.3)" />

          {/* TO'QUV — ko'ndalang qatorlar (tanasi torayishiga ergashadi) */}
          <g stroke="rgba(74,42,12,0.42)" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M14.8 31 Q48 37 81.2 31" />
            <path d="M16.6 39 Q48 44.5 79.4 39" />
            <path d="M19 50 Q48 55.5 77 50" />
            <path d="M21 60 Q48 65 75 60" />
          </g>
          {/* TO'QUV — bo'ylama tayoqchalar */}
          <g stroke="rgba(74,42,12,0.26)" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M31 25 L29 67" />
            <path d="M48 25 L48 68" />
            <path d="M65 25 L67 67" />
          </g>
          {/* Yorug'lik — chap yon */}
          <path d="M16 26 L23 62" stroke={`url(#${id}-nur)`} strokeWidth="3" strokeLinecap="round" />

          {/* SAVAT ICHI — ochiq og'iz, chuqurlik ko'rinishi uchun */}
          <ellipse cx="48" cy="24" rx="35" ry="9.5" fill={`url(#${id}-ichi)`} />

          {/* GARDISH — halqa (tashqi ellipsdan ichkisi kesib olinadi) */}
          <path
            d="M48 12 C67.3 12 83 17.4 83 24 C83 30.6 67.3 36 48 36 C28.7 36 13 30.6 13 24 C13 17.4 28.7 12 48 12 Z
               M48 16.5 C33.6 16.5 21.5 20.1 21.5 24 C21.5 27.9 33.6 31.5 48 31.5 C62.4 31.5 74.5 27.9 74.5 24 C74.5 20.1 62.4 16.5 48 16.5 Z"
            fill={`url(#${id}-gardish)`}
            fillRule="evenodd"
          />
          {/* Gardishning yuqori yorug'i — hajm bersin */}
          <path
            d="M48 12.8 C64.5 12.8 78 17.3 79.8 22 C74 18.2 61.8 15.6 48 15.6 C34.2 15.6 22 18.2 16.2 22 C18 17.3 31.5 12.8 48 12.8 Z"
            fill="rgba(255,255,255,0.34)"
          />

          {/* YORLIQ — savat oldidagi taxtacha */}
          <rect x="30" y="42.5" width="36" height="14" rx="7" fill="rgba(28,16,4,0.42)" />
          <text
            x="48"
            y="52.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            letterSpacing="0.6"
            fill="#FFFFFF"
            opacity="0.95"
          >
            {ROD_YORLIGI[rod]}
          </text>
        </motion.svg>
      </motion.div>
    </div>
  );
}

type Phase = 'menu' | 'playing' | 'over';

type RisingWord = {
  id: number;
  word: string;
  /** Shu so'z o'yinchi tanlagan rodgami — bosilganda shu hal qiladi. */
  target: boolean;
  /** Xato bosilganda qisqa vaqt qizarib turadi. */
  rejected: boolean;
  /** Gorizontal joylashuv (foiz) — so'zlar ustma-ust tushmasin. */
  leftPct: number;
  travel: number;
  danger: boolean;
  caught: boolean;
};

export default function WordRiseGamePage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('menu');
  const [gender, setGender] = useState<RussianGender>('m');
  const [mistakes, setMistakes] = useState(0);
  const [words, setWords] = useState<RisingWord[]>([]);
  const [score, setScore] = useState(0);
  const [caught, setCaught] = useState(0);
  const [best, setBest] = useState(0);
  const [pops, setPops] = useState<{ id: number; text: string; leftPct: number; top: number }[]>([]);
  const [lostWord, setLostWord] = useState('');
  const [overReason, setOverReason] = useState<'missed' | 'mistakes'>('missed');
  /**
   * Tugash ekrani darrov bosilmasin: o'yinchi so'zni bosganda barmoq ko'tarilishi
   * yangi ekrandagi tugmaga «arvoh klik» bo'lib tushardi va o'yin o'zidan-o'zi
   * qayta boshlanardi.
   */
  const [armed, setArmed] = useState(true);
  const [arena, setArena] = useState({ w: 0, h: 0 });

  const arenaRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const usedRef = useRef<Set<string>>(new Set());
  const spawnRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  /** Spawn tsikli eski holatni ko'rmasligi uchun — jonli qiymatlar. */
  const liveRef = useRef({
    words: [] as RisingWord[],
    caught: 0,
    mistakes: 0,
    phase: 'menu' as Phase,
  });

  const meta = WORD_RISE_GENDER_META[gender];

  /** Maydon o'lchami — so'z qayerdan chiqib qayergacha borishini hisoblash uchun. */
  useLayoutEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const measure = () => setArena({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // Taymerlar ichidagi kod eng SO'NGGI holatni ko'rishi kerak — shuning uchun
  // muhim qiymatlar ref'ga ko'chiriladi.
  useEffect(() => {
    liveRef.current = { ...liveRef.current, words, caught, phase };
  }, [words, caught, phase]);

  const clearTimers = useCallback(() => {
    if (spawnRef.current) window.clearTimeout(spawnRef.current);
    spawnRef.current = null;
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const endGame = useCallback(
    (word: string, reason: 'missed' | 'mistakes' = 'missed') => {
      clearTimers();
      setLostWord(word);
      setOverReason(reason);
      setPhase('over');
      setArmed(false);
      const arm = window.setTimeout(() => setArmed(true), 500);
      timeoutsRef.current.push(arm);
      playWrongSound();
      // Telefon tebranadi — mag'lubiyat sezilsin.
      try {
        navigator.vibrate?.([130, 70, 240]);
      } catch {
        /* qo'llab-quvvatlamaydigan brauzerlarda e'tiborsiz qoldiriladi */
      }
    },
    [clearTimers],
  );

  /** Yangi so'zni maydonga chiqaradi va keyingisini rejalashtiradi. */
  const spawn = useCallback(() => {
    if (liveRef.current.phase !== 'playing') return;
    const onScreen = liveRef.current.words.filter((w) => !w.caught);
    if (onScreen.length < MAX_ON_SCREEN) {
      const picked = pickNextWord(
        gender,
        usedRef.current,
        onScreen.map((w) => w.word),
      );
      if (picked) {
        const next = picked.word;
        usedRef.current.add(next);
        const id = ++idRef.current;
        const travel = travelMs(next, { caught: liveRef.current.caught });
        // Boshqa so'zlar bilan ustma-ust tushmasin: bo'sh yo'lakni tanlaymiz.
        const busy = onScreen.map((w) => w.leftPct);
        const lanes = [22, 38, 50, 62, 78];
        const free = lanes.filter((l) => busy.every((b) => Math.abs(b - l) > 13));
        const leftPct = (free.length ? free : lanes)[
          Math.floor(Math.random() * (free.length ? free.length : lanes.length))
        ];
        setWords((prev) => [
          ...prev,
          {
            id,
            word: next,
            target: picked.gender === gender,
            leftPct,
            travel,
            danger: false,
            rejected: false,
            caught: false,
          },
        ]);
        // Yo'lning oxiriga yaqinlashganda FAQAT o'z so'zi ogohlantiradi —
        // begona so'z tepaga chiqib ketsa hech narsa bo'lmaydi.
        if (picked.gender === gender) {
          const warn = window.setTimeout(
            () => setWords((prev) => prev.map((w) => (w.id === id ? { ...w, danger: true } : w))),
            Math.round(travel * DANGER_FROM),
          );
          timeoutsRef.current.push(warn);
        }
      }
    }
    spawnRef.current = window.setTimeout(spawn, spawnDelayMs({ caught: liveRef.current.caught }));
  }, [gender]);

  const startGame = useCallback(
    (chosen: RussianGender) => {
      clearTimers();
      usedRef.current = new Set();
      idRef.current = 0;
      setGender(chosen);
      setWords([]);
      setPops([]);
      setScore(0);
      setCaught(0);
      setMistakes(0);
      setLostWord('');
      setPhase('playing');
      liveRef.current = { words: [], caught: 0, mistakes: 0, phase: 'playing' };
    },
    [clearTimers],
  );

  // O'yin boshlanishi bilan so'z chiqarish tsikli ishga tushadi.
  useEffect(() => {
    if (phase !== 'playing') return;
    spawnRef.current = window.setTimeout(spawn, 600);
    return () => {
      if (spawnRef.current) window.clearTimeout(spawnRef.current);
      spawnRef.current = null;
    };
  }, [phase, spawn]);

  /** O'z rodidagi so'z bosildi — savatga uchadi. */
  const catchWord = useCallback((target: RisingWord) => {
    const gained = wordScore(target.word);
    setWords((prev) => prev.map((w) => (w.id === target.id ? { ...w, caught: true } : w)));
    setScore((s) => s + gained);
    // «+N» yozuvi so'z turgan joyda paydo bo'ladi
    setPops((prev) => [
      ...prev,
      { id: target.id, text: `+${gained}`, leftPct: target.leftPct, top: 0 },
    ]);
    const popTimer = window.setTimeout(
      () => setPops((prev) => prev.filter((p) => p.id !== target.id)),
      POP_MS,
    );
    timeoutsRef.current.push(popTimer);
    setCaught((c) => {
      const next = c + 1;
      setBest((b) => Math.max(b, next));
      return next;
    });
    playCorrectSound();
    const t = window.setTimeout(
      () => setWords((prev) => prev.filter((w) => w.id !== target.id)),
      CATCH_MS + 60,
    );
    timeoutsRef.current.push(t);
  }, []);

  /** Begona rodning so'zi bosildi — jarima va xato hisobi. */
  const rejectWord = useCallback(
    (target: RisingWord) => {
      setWords((prev) => prev.map((w) => (w.id === target.id ? { ...w, rejected: true } : w)));
      setScore((s) => Math.max(0, s - WRONG_PENALTY));
      setPops((prev) => [
        ...prev,
        { id: -target.id, text: `−${WRONG_PENALTY}`, leftPct: target.leftPct, top: 0 },
      ]);
      const popTimer = window.setTimeout(
        () => setPops((prev) => prev.filter((p) => p.id !== -target.id)),
        POP_MS,
      );
      timeoutsRef.current.push(popTimer);
      playWrongSound();
      try {
        navigator.vibrate?.(60);
      } catch {
        /* qo'llab-quvvatlamaydigan brauzerlarda e'tiborsiz qoldiriladi */
      }
      const nextMistakes = liveRef.current.mistakes + 1;
      liveRef.current.mistakes = nextMistakes;
      setMistakes(nextMistakes);
      if (nextMistakes >= MAX_MISTAKES) {
        endGame(target.word, 'mistakes');
        return;
      }
      // Qizil belgi qisqa vaqtdan keyin o'chadi — so'z ko'tarilishda davom etadi.
      const reset = window.setTimeout(
        () => setWords((prev) => prev.map((w) => (w.id === target.id ? { ...w, rejected: false } : w))),
        520,
      );
      timeoutsRef.current.push(reset);
    },
    [endGame],
  );

  /** So'z bosildi: o'ziniki bo'lsa savatga, bo'lmasa xato. */
  const tapWord = useCallback(
    (w: RisingWord) => {
      if (w.caught || w.rejected || liveRef.current.phase !== 'playing') return;
      if (w.target) catchWord(w);
      else rejectWord(w);
    },
    [catchWord, rejectWord],
  );

  const startY = Math.max(arena.h - 34, DANGER_Y + 40);

  return (
    <div className="bg-app-bg pb-[92px]">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-app-bg/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/games')}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-app-text ring-1 ring-app-border transition active:scale-95"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-black text-app-text">So'z savati</h1>
          <p className="text-[12px] font-bold text-app-text-muted">
            {phase === 'menu'
              ? "Rodni tanlang va faqat o'shanisini bosing"
              : `${meta.ru} · ${score} ball`}
          </p>
        </div>
        {phase !== 'menu' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-app-text ring-1 ring-app-border">
            <Trophy className="h-3.5 w-3.5 text-[#F59E0B]" /> {best}
          </span>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[560px] px-4">
        {phase === 'menu' ? (
          <div className="space-y-4">
            {/*
              KIRISH EKRANI — faqat uchta rod.

              Ilgari bu yerda qoidalar ro'yxati (to'rt qator) va «Eslatma»
              kartasi turardi: o'yinchi o'ynashdan oldin butun matnni o'qishi
              kerak edi. Qoidalar o'yinning o'zida ko'rinadi — so'z savatga
              uchadi, xato bosilganda yurak so'nadi, ball kamayadi. Shuning
              uchun bu yerda faqat TANLOV qoldi; sarlavhadagi bir qator
              yo'l-yo'riq ham yetarli.

              Har kartochkada rodning nomi, o'zbekcha izohi va TANIB OLISH
              QOIDASI (-а/-я, -о/-е, undosh) bor — o'quvchiga aynan shu kerak.
            */}
            <div className="space-y-2.5">
              {WORD_RISE_GENDERS.map((g) => {
                const m = WORD_RISE_GENDER_META[g];
                const count = genderWords(g).length;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => startGame(g)}
                    className="flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left text-white shadow-[0_14px_30px_-16px_rgba(15,23,42,0.55)] transition active:scale-[0.99]"
                    style={{
                      background: `linear-gradient(135deg, ${ROD_RANGI[g].ochiq} 0%, ${ROD_RANGI[g].tuq} 100%)`,
                    }}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/18 text-[18px] font-black">
                      {ROD_YORLIGI[g]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-black">{m.ru}</span>
                      <span className="mt-0.5 block text-[12px] font-bold text-white/75">
                        {m.uz} · {m.hint}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-black">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {phase === 'over' ? (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="overflow-hidden rounded-[24px] p-6 text-center text-white shadow-[0_18px_44px_-18px_rgba(185,28,28,0.7)]"
              style={{ background: 'linear-gradient(150deg, #7F1D1D 0%, #B91C1C 55%, #DC2626 100%)' }}
            >
              <p className="grammar-heading text-[64px] font-black leading-none tracking-tight">404</p>
              <p className="mt-1 text-[17px] font-black">Siz yutqazdingiz</p>
              <p className="mt-2 text-[13.5px] font-bold text-white/80">
                {overReason === 'mistakes'
                  ? `${MAX_MISTAKES} marta begona rodni bosdingiz`
                  : lostWord
                    ? `«${lostWord}» — ${meta.ru}, uni bosib ulgurmadingiz`
                    : "So'zni bosib ulgurmadingiz"}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="rounded-2xl bg-white/15 px-3 py-2 text-[13px] font-black ring-1 ring-white/20">
                  {score} ball
                </span>
                <span className="rounded-2xl bg-white/15 px-3 py-2 text-[13px] font-black ring-1 ring-white/20">
                  {caught} so'z
                </span>
              </div>
            </motion.div>
            <button
              type="button"
              onClick={() => startGame(gender)}
              disabled={!armed}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[15px] font-black text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" /> Yana o'ynash
            </button>
            <button
              type="button"
              onClick={() => setPhase('menu')}
              disabled={!armed}
              className="min-h-[48px] w-full rounded-2xl bg-white text-[14px] font-bold text-app-text ring-1 ring-app-border disabled:opacity-60"
            >
              Rodni o'zgartirish
            </button>
          </div>
        ) : null}

        {phase === 'playing' ? (
          <div className="space-y-3">
            <div
              ref={arenaRef}
              className="relative h-[min(66vh,540px)] overflow-hidden rounded-[24px]"
              style={{ background: 'linear-gradient(180deg, #0B1220 0%, #111C33 55%, #16233F 100%)' }}
            >
              {/* Fon: yulduzchalar */}
              {!reduce
                ? [12, 31, 47, 63, 79, 88].map((left, i) => (
                    <motion.span
                      key={left}
                      aria-hidden
                      className="absolute h-1 w-1 rounded-full bg-white/40"
                      style={{ left: `${left}%`, top: `${18 + i * 12}%` }}
                      animate={{ opacity: [0.15, 0.6, 0.15] }}
                      transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))
                : null}

              {/* Xavf chizig'i va savat */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 z-[3]"
                style={{ top: DANGER_Y }}
              >
                <div className="h-[2px] w-full bg-[repeating-linear-gradient(90deg,rgba(239,68,68,0.9)_0_10px,transparent_10px_18px)]" />
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-[62px]"
                style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.16), transparent)' }}
              />
              <Savat rod={gender} tutilgan={caught} reduce={reduce} />

              {/* Ko'tarilayotgan so'zlar — bosilsa savatga uchadi */}
              {arena.h > 0 ? (
                <AnimatePresence>
                  {words.map((w) => (
                    <motion.button
                      key={w.id}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        tapWord(w);
                      }}
                      aria-label={`${w.word} — bosish`}
                      className="absolute z-[2] whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-[17px] font-black shadow-[0_10px_22px_-12px_rgba(0,0,0,0.8)]"
                      style={{
                        left: `${w.leftPct}%`,
                        maxWidth: '86%',
                        touchAction: 'manipulation',
                        background: w.caught
                          ? 'linear-gradient(135deg,#22A552,#16A34A)'
                          : w.rejected
                            ? 'linear-gradient(135deg,#EF4444,#991B1B)'
                            : w.danger
                              ? 'linear-gradient(135deg,#F97316,#C2410C)'
                              : 'linear-gradient(135deg,#FFFFFF,#E2E8F0)',
                        color: w.caught || w.rejected || w.danger ? '#FFFFFF' : '#0F172A',
                      }}
                      initial={{ y: startY, x: '-50%', opacity: 0, scale: 0.9 }}
                      animate={
                        w.caught
                          ? {
                              y: 6,
                              x: '-50%',
                              left: '50%',
                              opacity: 0,
                              scale: 0.35,
                              transition: { duration: CATCH_MS / 1000, ease: 'easeIn' },
                            }
                          : {
                              y: DANGER_Y,
                              x: '-50%',
                              opacity: 1,
                              scale: 1,
                              transition: {
                                y: { duration: w.travel / 1000, ease: 'linear' },
                                opacity: { duration: 0.25 },
                                scale: { duration: 0.25 },
                              },
                            }
                      }
                      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
                      onAnimationComplete={() => {
                        // Faqat ko'tarilish tugaganda mag'lubiyat — savatga
                        // uchish animatsiyasi ham shu hodisani chaqiradi.
                        // Begona rod tepaga chiqib ketsa — u sizniki emas, shunchaki
                        // yo'qoladi. Faqat o'z rodingizni qo'ldan chiqarish mag'lubiyat.
                        if (w.caught || w.rejected || liveRef.current.phase !== 'playing') return;
                        if (w.target) endGame(w.word);
                        else setWords((prev) => prev.filter((x) => x.id !== w.id));
                      }}
                    >
                      {w.word}
                    </motion.button>
                  ))}
                </AnimatePresence>
              ) : null}

              {/* Bosilgan so'z uchun «+N» */}
              <AnimatePresence>
                {pops.map((p) => (
                  <motion.span
                    key={p.id}
                    aria-hidden
                    className="pointer-events-none absolute z-[5] text-[15px] font-black"
                    data-kind={p.text.startsWith('+') ? 'plus' : 'minus'}
                    style={{
                      left: `${p.leftPct}%`,
                      color: p.text.startsWith('+') ? '#4ADE80' : '#F87171',
                    }}
                    initial={{ y: DANGER_Y + 60, x: '-50%', opacity: 1, scale: 0.9 }}
                    animate={{ y: DANGER_Y + 6, x: '-50%', opacity: 0, scale: 1.25 }}
                    transition={{ duration: POP_MS / 1000, ease: 'easeOut' }}
                  >
                    {p.text}
                  </motion.span>
                ))}
              </AnimatePresence>

              {/*
                HISOB PANELI.

                Ilgari bu yerda uchta bir xil kulrang tugmacha turardi va
                ularning qaysi biri muhimligi bilinmasdi. Endi bitta shisha
                panel: BALL eng yirik raqam (o'yinning maqsadi), yonida
                tutilgan so'zlar soni, o'ng chetda esa qolgan urinishlar —
                yurak shaklida, chunki «uchta nuqta» hech narsa demasdi.
              */}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[4]">
                <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/[0.08] px-3.5 py-2 ring-1 ring-white/15 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="flex items-baseline gap-1">
                      {/* Raqam har o'zgarganda bir sakraydi — ball qo'shilgani
                          ko'z bilan ham seziladi. */}
                      <motion.span
                        key={score}
                        initial={reduce ? false : { scale: 1.35, color: '#4ADE80' }}
                        animate={{ scale: 1, color: '#FFFFFF' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                        className="text-[20px] font-black leading-none text-white"
                      >
                        {score}
                      </motion.span>
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/55">
                        ball
                      </span>
                    </span>

                    <span aria-hidden className="h-4 w-px bg-white/15" />

                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: ROD_RANGI[gender].ochiq }}
                      />
                      <span className="text-[14px] font-black leading-none text-white">
                        {caught}
                      </span>
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/55">
                        so'z
                      </span>
                    </span>
                  </div>

                  <span
                    className="flex items-center gap-1"
                    aria-label={`${MAX_MISTAKES - mistakes} urinish qoldi`}
                  >
                    {Array.from({ length: MAX_MISTAKES }).map((_, i) => {
                      const tirik = i < MAX_MISTAKES - mistakes;
                      return (
                        <motion.svg
                          key={i}
                          width="15"
                          height="14"
                          viewBox="0 0 24 22"
                          aria-hidden
                          animate={{ scale: tirik ? 1 : 0.82, opacity: tirik ? 1 : 0.32 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                        >
                          <path
                            d="M12 21S1.5 14.4 1.5 7.6A5.6 5.6 0 0 1 12 4.8 5.6 5.6 0 0 1 22.5 7.6C22.5 14.4 12 21 12 21Z"
                            fill={tirik ? '#F87171' : 'rgba(255,255,255,0.22)'}
                          />
                        </motion.svg>
                      );
                    })}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-center text-[12.5px] font-semibold text-app-text-secondary">
              Faqat <b className="text-app-text">{meta.ru}</b> ({meta.hint}) so'zlarini bosing
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
