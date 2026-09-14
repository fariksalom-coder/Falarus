/**
 * DailyReadingQuestionsPage — 3-blok (o'qish) matnidan keyingi tushunish testi.
 *
 * QOIDA: kamida 70% to'plamaguncha o'qish bloki YAKUNLANMAYDI va o'quvchi
 * keyingi vazifaga o'ta olmaydi — testni qaytadan ishlashi kerak.
 *
 * Javob kaliti brauzerga umuman yuborilmaydi: har bir javobni server
 * tekshiradi va o'sha yerda qayd etadi (iboralar bilan bir xil model).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import {
  isValidDailyCourseDay,
  READING_QUESTIONS_PASS_PERCENT,
  type DailyTextQuestion,
} from '../../shared/dailyCourseDay';
import {
  answerTextQuestion,
  finishTextQuestions,
  startTextQuestions,
  type TextQuestionFinishResult,
} from '../api/kunlikProgress';
import { xaritaYoli } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import { playCorrectSound, playWrongSound } from '../utils/sound';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

type Verdict = { choice: number; correct: boolean; correctIndex: number };

export default function DailyReadingQuestionsPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const readingPath = `/kunlik-reja/kun/${dayNumber}/oqish`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DailyTextQuestion[]>([]);

  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [result, setResult] = useState<TextQuestionFinishResult | null>(null);
  const savedRef = useRef(false);

  const load = useCallback(async () => {
    if (!token || !isValidDailyCourseDay(dayNumber)) {
      setLoading(false);
      setError(!token ? t('auth.loginRequired') : t('kunlik.invalidDay'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bundle = await getDailyCourseDay(token, dayNumber);
      const rows = [...(bundle.reading?.questions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setQuestions(rows);
      if (rows.length === 0) setError('Bu kunda matn savollari yo‘q.');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Yangi urinish — serverdagi eski javoblar tozalanadi. */
  const resetAttempt = useCallback(async () => {
    savedRef.current = false;
    setIndex(0);
    setVerdict(null);
    setChecking(false);
    setAnswerError('');
    setResult(null);
    if (questions.length > 0) {
      try {
        await startTextQuestions(token, dayNumber);
      } catch {
        /* tozalanmasa ham javoblar qayta yoziladi */
      }
    }
  }, [questions.length, token, dayNumber]);

  useEffect(() => {
    void resetAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  const onChoose = async (optionIndex: number) => {
    if (verdict !== null || checking) return;
    const current = questions[index];
    if (!current) return;
    setChecking(true);
    setAnswerError('');
    try {
      const res = await answerTextQuestion(token, dayNumber, current.id, optionIndex);
      setVerdict({ choice: res.choice, correct: res.correct, correctIndex: res.correctIndex });
      if (res.correct) playCorrectSound();
      else playWrongSound();
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : 'Javob tekshirilmadi, qayta urinib ko‘ring');
    } finally {
      setChecking(false);
    }
  };

  const finish = useCallback(async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    try {
      setResult(await finishTextQuestions(token, dayNumber));
    } catch (e) {
      savedRef.current = false;
      setAnswerError(e instanceof Error ? e.message : 'Natija saqlanmadi');
    }
  }, [token, dayNumber]);

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-slate-700">Sahifa topilmadi.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-950">{error ?? t('common.noData')}</p>
          <button
            type="button"
            onClick={() => navigate(readingPath)}
            className="mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
          >
            {t('common.back')}
          </button>
        </main>
      </div>
    );
  }

  const current = questions[index];
  const total = questions.length;

  // ─── Yakuniy ekran ───────────────────────────────────────────────────────
  if (result) {
    const passed = result.passed;
    return (
      <div className="reading-theme min-h-screen px-4 py-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <main className="mx-auto max-w-[720px]">
          <div
            className="rounded-[24px] p-8 text-center ring-1"
            style={{
              background: passed ? '#E7F7EF' : '#FEF0F0',
              boxShadow: '0 10px 28px -18px rgba(15,23,42,0.25)',
            }}
          >
            <span
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: passed ? '#22C55E' : '#E5484D' }}
            >
              {passed ? (
                <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.4} />
              ) : (
                <XCircle className="h-9 w-9 text-white" strokeWidth={2.4} />
              )}
            </span>

            <p className="mt-4 text-[20px] font-black text-app-text">
              {passed ? 'Test topshirildi!' : 'Test topshirilmadi'}
            </p>
            <p className="mt-1.5 text-[15px] font-bold text-app-text">
              {result.correct} / {result.total} to‘g‘ri · {result.percent}%
            </p>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-app-text-muted">
              {passed
                ? 'O‘qish bloki yakunlandi. Keyingi vazifaga o‘tishingiz mumkin.'
                : `Keyingi vazifaga o‘tish uchun kamida ${result.passPercent}% kerak. Testni qaytadan ishlang.`}
            </p>

            {passed ? (
              <button
                type="button"
                onClick={() => navigate(xaritaYoli())}
                className="mt-6 flex h-13 w-full items-center justify-center rounded-full bg-[#0FA598] py-3.5 text-[15px] font-black text-white active:scale-[0.99]"
              >
                Kun rejasiga qaytish →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void resetAttempt()}
                  className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#0FA598] py-3.5 text-[15px] font-black text-white active:scale-[0.99]"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2.6} />
                  Qaytadan ishlash
                </button>
                <button
                  type="button"
                  onClick={() => navigate(readingPath)}
                  className="mt-3 w-full text-center text-[13.5px] font-bold text-app-text-muted hover:underline"
                >
                  Matnni qayta o‘qish
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Savol ekrani ────────────────────────────────────────────────────────
  const answered = verdict !== null;
  const last = index + 1 >= total;

  return (
    <div className="reading-theme min-h-screen px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto max-w-[720px]">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(readingPath)}
            aria-label={t('common.back')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-app-text shadow-app-soft ring-1 ring-[#DCEBE7] active:scale-[0.97]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-app-text-muted">
              Kun {dayNumber} · Matn savollari
            </p>
            <p className="mt-0.5 text-[15px] font-black text-app-text">
              {index + 1}/{total} · o‘tish uchun {READING_QUESTIONS_PASS_PERCENT}%
            </p>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[#D6ECE7]">
          <div
            className="h-full rounded-full bg-[#0FA598] transition-all duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <div className="mt-4 rounded-[22px] bg-white p-5 shadow-app-soft ring-1 ring-[#DCEBE7]">
          <p className="text-[19px] font-black leading-snug text-app-text">{current.questionRu}</p>
        </div>

        <div className="mt-4 flex flex-col gap-[10px]">
          {current.options.map((opt, i) => {
            const isPicked = verdict?.choice === i;
            const isCorrect = answered && i === verdict.correctIndex;
            const isWrong = isPicked && !verdict.correct;

            let cls =
              'flex min-h-[60px] w-full items-center gap-3 rounded-[16px] bg-white px-4 py-3 text-left text-[16px] font-bold text-app-text shadow-app-soft ring-1 ring-[#DCEBE7] transition-all';
            let badge = 'bg-[#E7F3F1] text-[#0B7167]';
            if (isCorrect) {
              cls =
                'flex min-h-[60px] w-full items-center gap-3 rounded-[16px] bg-[#DCFCE7] px-4 py-3 text-left text-[16px] font-bold text-[#0F7C3A] shadow-app-soft ring-1 ring-[#82E5B8] transition-all';
              badge = 'bg-[#22C55E] text-white';
            } else if (isWrong) {
              cls =
                'flex min-h-[60px] w-full items-center gap-3 rounded-[16px] bg-[#FEEBEB] px-4 py-3 text-left text-[16px] font-bold text-[#B4282E] shadow-app-soft ring-1 ring-[#F5B5B5] transition-all';
              badge = 'bg-[#E5484D] text-white';
            } else if (answered || checking) {
              cls += ' opacity-70';
            }

            return (
              <button
                key={i}
                type="button"
                disabled={answered || checking}
                onClick={() => void onChoose(i)}
                className={cls}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-black ${badge}`}
                >
                  {OPTION_LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        {answerError ? (
          <p className="mt-3 rounded-2xl bg-[#FEEBEB] px-3 py-2 text-center text-[13px] font-bold text-[#B4282E]">
            {answerError}
          </p>
        ) : null}

        {checking && !answered ? (
          <p className="mt-4 text-center text-[13px] font-bold text-app-text-muted">Tekshirilmoqda…</p>
        ) : null}

        {answered ? (
          <button
            type="button"
            onClick={() => {
              if (last) {
                void finish();
              } else {
                setVerdict(null);
                setIndex((i) => i + 1);
              }
            }}
            className="mt-5 flex h-[54px] w-full items-center justify-center rounded-full bg-[#0FA598] text-[16px] font-black text-white active:scale-[0.99]"
          >
            {last ? 'Yakunlash →' : 'Keyingi savol →'}
          </button>
        ) : null}
      </main>
    </div>
  );
}
