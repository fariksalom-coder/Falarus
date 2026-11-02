/**
 * WordChainGamePage — "So'z zanjiri" o'yini.
 *
 * Qoida: kompyuter so'z aytadi, o'yinchi uning OXIRGI harfidan boshlanadigan
 * yangi so'z yozadi. Ishlatilgan so'z qayta ishlatilmaydi.
 *
 * Vaqt: o'yinchiga har yurishda 30 soniya; kompyuter "o'ylayotgandek" 3-5
 * soniyada javob beradi (darhol javob bersa o'yin sun'iy tuyulardi).
 *
 * Qoidalar mantig'i `shared/wordChain.ts` da va testlar bilan qoplangan —
 * bu fayl faqat ko'rinish va vaqtni boshqaradi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { TurnArena } from '../components/games/TurnArena';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import {
  buildIndex,
  chainLetter,
  checkAnswer,
  pickComputerWord,
  pickStartWord,
} from '../../shared/wordChain';
import {
  WORD_CHAIN_LEVELS,
  WORD_CHAIN_WORDS,
  wordsUpToLevel,
  type WordChainLevel,
} from '../data/wordChainWords';
import DarajaTanlash, { type DarajaVarianti } from '../components/games/DarajaTanlash';
import { DARAJA_NOMI, hajmYozuvi, namunaSozlar } from '../components/games/darajalar';
import { playCorrectSound, playWrongSound } from '../utils/sound';

/** O'yinchiga beriladigan vaqt (soniya). */
const TURN_SECONDS = 30;
/** Kompyuter "o'ylash" oralig'i (ms). */
const THINK_MIN_MS = 3000;
const THINK_MAX_MS = 5000;
/** Bitta harfni «yozish» vaqti. */
const TYPE_MS_PER_LETTER = 70;
/**
 * Kompyuter yozib bo'lgach navbat DARHOL o'tib ketmasin: o'yinchi javobni
 * o'qishga ulgurmay qolardi. Shu qadar pauza qilib, so'zni ko'rsatib turamiz.
 */
const REVEAL_MS = 1600;

/**
 * `typing` — kompyuter so'zni HARF-BAHARF «yozayotgan» payt. Ilgari so'z
 * birdan paydo bo'lardi va o'yinchi kompyuter nima qilganini ko'rmasdi.
 */
/** O'yinning rangi — o'yinlar ro'yxatidagi kartochkasi bilan bir xil. */
const RANG = '#12B37A';
const RANG_TUQ = '#0B7F63';

type Phase = 'menu' | 'thinking' | 'typing' | 'reveal' | 'player' | 'over';
type Turn = { word: string; by: 'computer' | 'player' };

/**
 * Daraja tanlash: nom + o'sha darajaning so'zlaridan namuna.
 *
 * A1/B2 kodi ekrandan olib tashlandi — o'quvchiga u hech nima demaydi.
 * Namunalar esa darhol tushuntiradi: «bu darajada shunaqa so'zlar bo'ladi».
 * O'yin tanlangan darajagacha bo'lgan hamma so'zni oladi, shuning uchun
 * o'ngdagi son — o'sha to'plamning hajmi.
 */
const DARAJA_VARIANTLARI: DarajaVarianti[] = WORD_CHAIN_LEVELS.map((lv) => ({
  kalit: lv,
  nom: DARAJA_NOMI[lv],
  namunalar: namunaSozlar(WORD_CHAIN_WORDS[lv] ?? []),
  hajm: hajmYozuvi(wordsUpToLevel(lv).length, "so'z"),
}));

export default function WordChainGamePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [level, setLevel] = useState<WordChainLevel>('A1');
  const [phase, setPhase] = useState<Phase>('menu');
  /** Kompyuter yozayotgan so'z va nechta harfi ochilgani. */
  const [typing, setTyping] = useState<{ word: string; revealed: number } | null>(null);
  const [chain, setChain] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  const [overReason, setOverReason] = useState<string>('');
  const [best, setBest] = useState(0);

  const usedRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const thinkRef = useRef<number | null>(null);
  /** Harf-baharf yozish intervali — o'yin to'xtaganda tozalanishi shart. */
  const typeRef = useRef<number | null>(null);
  /** Yozilgan so'zni ko'rsatib turish pauzasi. */
  const revealRef = useRef<number | null>(null);

  /** Kompyuter faqat lug'atdan javob beradi; o'yinchi esa istalgan so'zni yozishi mumkin. */
  const index = useMemo(() => buildIndex(wordsUpToLevel(level)), [level]);

  const lastWord = chain.length > 0 ? chain[chain.length - 1].word : '';
  const requiredLetter = lastWord ? chainLetter(lastWord) : '';
  const playerScore = chain.filter((t) => t.by === 'player').length;
  /** Kompyuterning oxirgi so'zi — panelda «javob berdi» holatida ko'rsatiladi. */
  const lastComputerWord = [...chain].reverse().find((t) => t.by === 'computer')?.word ?? null;

  /**
   * Sahifa ichki konteynerda skroll bo'ladi (`window.scrollTo` ishlamaydi).
   * Klaviatura ochilib ekran surilib ketsa — shu funksiya tepaga qaytaradi.
   */
  const scrollToTop = useCallback(() => {
    let el: HTMLElement | null = rootRef.current?.parentElement ?? null;
    while (el) {
      if (el.scrollHeight > el.clientHeight + 8) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      el = el.parentElement;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (thinkRef.current) window.clearTimeout(thinkRef.current);
    if (typeRef.current) window.clearInterval(typeRef.current);
    if (revealRef.current) window.clearTimeout(revealRef.current);
    timerRef.current = null;
    thinkRef.current = null;
    typeRef.current = null;
    revealRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const finish = useCallback(
    (reason: string) => {
      clearTimers();
      setPhase('over');
      setOverReason(reason);
      setBest((b) => Math.max(b, chain.filter((t) => t.by === 'player').length));
      playWrongSound();
    },
    [chain, clearTimers],
  );

  /**
   * Kompyuter navbati: 3-5 soniya "o'ylaydi", so'ng so'zni harf-baharf
   * «yozadi» va shundan keyingina navbat o'yinchiga o'tadi.
   */
  const computerTurn = useCallback(
    (fromWord: string) => {
      setPhase('thinking');
      setTyping(null);
      const delay = THINK_MIN_MS + Math.random() * (THINK_MAX_MS - THINK_MIN_MS);
      thinkRef.current = window.setTimeout(() => {
        const letter = chainLetter(fromWord);
        const word = pickComputerWord({ index, letter, used: usedRef.current });
        if (!word) {
          // Kompyuterda so'z qolmadi — o'yinchi yutdi.
          clearTimers();
          setPhase('over');
          setOverReason(`Kompyuterda «${letter.toUpperCase()}» harfiga so'z qolmadi. Siz yutdingiz!`);
          setBest((b) => Math.max(b, playerScore));
          playCorrectSound();
          return;
        }
        usedRef.current.add(word);

        // Yozish animatsiyasi: har harf ketma-ket ochiladi.
        setPhase('typing');
        setTyping({ word, revealed: 0 });
        let i = 0;
        typeRef.current = window.setInterval(() => {
          i += 1;
          setTyping({ word, revealed: i });
          if (i >= word.length) {
            if (typeRef.current) window.clearInterval(typeRef.current);
            typeRef.current = null;
            // Yozib bo'lgach — zanjirga qo'shiladi, javob bir oz ko'rinib
            // turadi va shundan keyingina navbat o'yinchiga o'tadi.
            setChain((c) => [...c, { word, by: 'computer' }]);
            setPhase('reveal');
            revealRef.current = window.setTimeout(() => {
              revealRef.current = null;
              setPhase('player');
              setSecondsLeft(TURN_SECONDS);
              window.setTimeout(() => {
                inputRef.current?.focus();
                scrollToTop();
              }, 50);
            }, REVEAL_MS);
          }
        }, TYPE_MS_PER_LETTER);
      }, delay);
    },
    [index, clearTimers, playerScore, scrollToTop],
  );

  /** O'yinchi navbatidagi sanoq. */
  useEffect(() => {
    if (phase !== 'player') return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => finish('Vaqt tugadi ⏱'), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [phase, finish]);

  function startGame() {
    clearTimers();
    usedRef.current = new Set();
    const first = pickStartWord({ index, used: usedRef.current });
    if (!first) return;
    usedRef.current.add(first);
    setChain([{ word: first, by: 'computer' }]);
    setAnswer('');
    setHint(null);
    setOverReason('');
    setPhase('player');
    setSecondsLeft(TURN_SECONDS);
    window.setTimeout(() => {
      inputRef.current?.focus();
      scrollToTop();
    }, 60);
  }

  function submit() {
    if (phase !== 'player') return;
    // Lug'at SHART EMAS: o'quvchi istalgan so'zni yozadi, faqat bosh harfi
    // to'g'ri kelsa va so'z takrorlanmasa yetarli.
    const res = checkAnswer({
      answer,
      requiredLetter,
      used: usedRef.current,
    });
    if (!res.ok) {
      // `strict` o'chirilgani uchun union narrowing ishlamaydi — xabarni
      // to'g'ridan-to'g'ri o'qiymiz (loyihada shu uslub qabul qilingan).
      setHint((res as { message?: string }).message ?? "Javob to'g'ri emas");
      playWrongSound();
      return;
    }
    usedRef.current.add(res.word);
    setChain((c) => [...c, { word: res.word, by: 'player' }]);
    setAnswer('');
    setHint(null);
    playCorrectSound();
    computerTurn(res.word);
  }

  const timeColor = secondsLeft > 15 ? '#22A552' : secondsLeft > 7 ? '#F59E0B' : '#EF4444';

  return (
    <div ref={rootRef} className="bg-app-bg pb-[92px]">
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
          <h1 className="truncate text-[17px] font-black text-app-text">So'z zanjiri</h1>
          <p className="text-[12px] font-bold text-app-text-muted">
            {phase === 'menu' ? 'Oxirgi harfdan so\'z toping' : `${DARAJA_NOMI[level]} · ${playerScore} ball`}
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
            <div className="rounded-[24px] bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
              <p className="text-[15px] font-bold leading-snug text-app-text">
                Kompyuter so'z aytadi. Siz uning <b>oxirgi harfidan</b> boshlanadigan yangi
                so'z yozasiz.
              </p>
              <ul className="mt-3 space-y-2 text-[13.5px] font-semibold text-app-text-muted">
                <li>⏱ Har javobga <b className="text-app-text">30 soniya</b></li>
                <li>🔁 Ishlatilgan so'z qayta ishlatilmaydi</li>
                <li>✅ Istalgan so'z bo'ladi — lug'atda bo'lishi shart emas</li>
                <li>✍️ «ь», «ъ», «ы», «й» bilan tugasa — undan oldingi harf olinadi</li>
              </ul>
            </div>

            <DarajaTanlash
              variantlar={DARAJA_VARIANTLARI}
              tanlangan={level}
              onTanla={(k) => setLevel(k as WordChainLevel)}
              rang={RANG}
            />

            <button
              type="button"
              onClick={startGame}
              style={{ background: RANG, boxShadow: `0 14px 30px -12px ${RANG_TUQ}` }}
              className="min-h-[54px] w-full rounded-2xl text-[16px] font-black text-white transition active:scale-[0.99]"
            >
              Boshlash
            </button>
          </div>
        ) : null}

        {phase === 'over' ? (
          <div className="space-y-4">
            <div className="rounded-[24px] bg-white p-6 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
              <p className="text-[42px] font-black leading-none text-app-text">{playerScore}</p>
              <p className="mt-1 text-[13px] font-bold text-app-text-muted">to'g'ri so'z</p>
              <p className="mt-3 text-[14.5px] font-bold text-app-text">{overReason}</p>
              {requiredLetter ? (
                <p className="mt-1 text-[13px] text-app-text-muted">
                  Kerak edi: «{requiredLetter.toUpperCase()}» harfi bilan
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={startGame}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[15px] font-black text-white transition active:scale-[0.99]"
            >
              <RotateCcw className="h-4 w-4" /> Yana o'ynash
            </button>
            <button
              type="button"
              onClick={() => setPhase('menu')}
              className="min-h-[48px] w-full rounded-2xl bg-white text-[14px] font-bold text-app-text ring-1 ring-app-border"
            >
              Darajani o'zgartirish
            </button>
          </div>
        ) : null}

        {phase === 'thinking' || phase === 'typing' || phase === 'reveal' || phase === 'player' ? (
          <div className="flex flex-col gap-3">
            {/*
              Tartib: oxirgi so'z → navbat maydoni. Kompyuter va o'yinchi
              bitta kartada, chap va o'ng burchakda turadi.
            */}
            {/* Oxirgi so'z */}
            <div className="rounded-[24px] bg-white p-5 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                Oxirgi so'z
              </p>
              {/*
                So'z va kerakli harf BITTA animatsiya blokida: alohida bo'lsa,
                almashish paytida eski so'z bilan yangi harf bir zumda birga
                ko'rinib qolardi (mos kelmagandek tuyulardi).
              */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={lastWord}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <p className="mt-1.5 text-[30px] font-black leading-tight text-app-text">
                    {lastWord.slice(0, -1)}
                    <span className="text-[#2563EB]">{lastWord.slice(-1)}</span>
                  </p>
                  <p className="mt-2 text-[14px] font-bold text-app-text-muted">
                    Endi{' '}
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB] align-middle text-[16px] font-black text-white">
                      {requiredLetter.toUpperCase()}
                    </span>{' '}
                    harfidan boshlang
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Kompyuter va o'yinchi — bitta maydonda, ikki burchakda */}
            <TurnArena
              ref={inputRef}
              turn={phase === 'player' ? 'player' : 'computer'}
              computer={
                phase === 'thinking'
                  ? { kind: 'thinking' }
                  : phase === 'typing' && typing
                    ? { kind: 'typing', word: typing.word, revealed: typing.revealed }
                    : lastComputerWord
                      ? { kind: 'done', word: lastComputerWord }
                      : { kind: 'idle' }
              }
              playerAvatarUrl={user?.avatarUrl ?? null}
              value={answer}
              onChange={(v) => {
                setAnswer(v);
                if (hint) setHint(null);
              }}
              onSubmit={submit}
              requiredLetter={requiredLetter}
              secondsLeft={secondsLeft}
              totalSeconds={TURN_SECONDS}
              timeColor={timeColor}
            />

            {hint ? (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-[#FDECEC] px-4 py-2.5 text-[13.5px] font-bold text-[#B91C1C]"
              >
                {hint}
              </motion.p>
            ) : null}

            {/* Zanjir tarixi */}
            {chain.length > 1 ? (
              <div className="rounded-[24px] bg-white p-4 shadow-[0_10px_26px_rgba(148,163,184,0.1)]">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-app-text-muted">
                  Zanjir · {chain.length} so'z
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chain.map((t, i) => (
                    <span
                      key={`${t.word}-${i}`}
                      className={`rounded-lg px-2 py-1 text-[12.5px] font-bold ${
                        t.by === 'player'
                          ? 'bg-[#E7F7ED] text-[#177A3C]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.word}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
