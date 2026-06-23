import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import type { DailyGrammarSentenceArrange } from '../../shared/dailyCourseDay';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { getSentenceArrangeDisplayPrompt } from '../utils/sentenceArrangeDisplayPrompt';
import { normSentenceArrangeAnswer } from '../../shared/sentenceArrangeAnswer';

type PoolItem = { id: string; word: string; used: boolean };

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function DailyGrammarSentenceArrangePage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const backPath = `/kunlik-reja/kun/${dayNumber}/grammatika`;
  const { getDay, loaded: kunlikLoaded, patchDay } = useKunlikProgress();
  const grammar3PatchSent = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DailyGrammarSentenceArrange[]>([]);

  const [taskIndex, setTaskIndex] = useState(0);
  const [sentencePool, setSentencePool] = useState<PoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [feedback, setFeedback] = useState('');
  const [finished, setFinished] = useState(false);
  const [ruleMcqsCount, setRuleMcqsCount] = useState(0);
  const [matchHasPairs, setMatchHasPairs] = useState(false);

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
      setRuleMcqsCount(bundle.grammar?.ruleMcqs?.length ?? 0);
      const sets = bundle.grammar?.matchSets ?? [];
      setMatchHasPairs(sets.some((s) => s.pairs.length > 0));
      const rows = [...(bundle.grammar?.sentenceArrange ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      const usable = rows.filter((t) => t.wordBank.length > 0 && String(t.answerRu ?? '').trim() !== '');
      setTasks(usable);
      if (usable.length === 0) {
        setError(rows.length === 0 ? 'Bu kun uchun gap tuzish topshiriqlari yo‘q.' : 'So‘z banki yoki javob bo‘sh.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato');
      setRuleMcqsCount(0);
      setMatchHasPairs(false);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTaskIndex(0);
    setFinished(false);
    setCheckStatus('idle');
    setFeedback('');
    setSentenceAnswer([]);
    grammar3PatchSent.current = false;
  }, [tasks]);

  useEffect(() => {
    if (!kunlikLoaded || loading || error || tasks.length === 0) return;
    const row = getDay(dayNumber);
    if (ruleMcqsCount > 0 && !row.grammar_1) {
      navigate(backPath, { replace: true });
      return;
    }
    if (matchHasPairs && !row.grammar_2) {
      navigate(backPath, { replace: true });
    }
  }, [
    kunlikLoaded,
    loading,
    error,
    tasks.length,
    ruleMcqsCount,
    matchHasPairs,
    dayNumber,
    getDay,
    navigate,
    backPath,
  ]);

  useEffect(() => {
    if (!finished || grammar3PatchSent.current) return;
    grammar3PatchSent.current = true;
    patchDay(dayNumber, { grammar_3: true });
  }, [finished, dayNumber, patchDay]);

  const current = tasks[taskIndex];

  useEffect(() => {
    if (!current || finished) return;
    const words = shuffle([...current.wordBank]);
    setSentencePool(words.map((word, idx) => ({ id: `${idx}-${word}`, word, used: false })));
    setSentenceAnswer([]);
    setCheckStatus('idle');
    setFeedback('');
  }, [taskIndex, current, finished]);

  const progress = useMemo(() => {
    if (finished || tasks.length === 0) return 100;
    return ((taskIndex + (checkStatus === 'correct' ? 1 : 0)) / Math.max(tasks.length, 1)) * 100;
  }, [taskIndex, checkStatus, finished, tasks.length]);

  const moveWordToAnswer = (item: PoolItem, idx: number) => {
    if (checkStatus === 'correct') return;
    if (item.used) return;
    if (checkStatus === 'wrong') {
      setCheckStatus('idle');
      setFeedback('');
    }
    setSentenceAnswer((prev) => [...prev, item.word]);
    setSentencePool((prev) => prev.map((p, i) => (i === idx ? { ...p, used: true } : p)));
  };

  const clearSentence = () => {
    if (checkStatus === 'correct') return;
    setSentencePool((prev) => prev.map((p) => ({ ...p, used: false })));
    setSentenceAnswer([]);
    setCheckStatus('idle');
    setFeedback('');
  };

  const handleCheck = () => {
    if (!current || checkStatus === 'correct') return;
    if (sentenceAnswer.length === 0) {
      setFeedback('Avval so‘zlarni tanlang.');
      setCheckStatus('wrong');
      return;
    }
    const built = normSentenceArrangeAnswer(sentenceAnswer.join(' '));
    const ok = built === normSentenceArrangeAnswer(current.answerRu);
    if (ok) {
      setCheckStatus('correct');
      setFeedback("To'g'ri!");
    } else {
      setCheckStatus('wrong');
      setFeedback("Noto'g'ri. Yana urinib ko‘ring yoki «Tozalash» bilan boshidan.");
    }
  };

  const handleNext = () => {
    if (checkStatus !== 'correct') return;
    if (taskIndex < tasks.length - 1) {
      setTaskIndex((i) => i + 1);
      return;
    }
    setFinished(true);
  };

  const handleBack = () => navigate(backPath);

  const gridCols =
    sentencePool.length <= 1 ? 'grid-cols-1' : sentencePool.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-6">
        <p className="text-gray-700">Sahifa topilmadi.</p>
        <button type="button" className="mt-4 text-blue-600 underline" onClick={() => navigate(kunlikRejaPath(dayNumber))}>
          {t('kunlik.backToPlan')}
        </button>
      </div>
    );
  }

  if (gatePending) {
    return <KunlikSequentialGateSpinner />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || tasks.length === 0 || !current) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm">{error ?? 'Maʼlumot yo‘q.'}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 min-h-[44px] rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
          >
            {t('common.back')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-28 text-slate-900">
      <main className="mx-auto w-full max-w-lg px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          {t('common.back')}
        </button>

        {!finished && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/90">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {!finished ? (
          <div className="mt-5 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.14)] sm:p-6">
            <p className="text-center text-sm font-medium text-slate-500">Gapni tuzing</p>
            <p className="mt-3 text-center text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
              {getSentenceArrangeDisplayPrompt(current.promptText, current.promptLang)}
            </p>

            <div className="mt-6 min-h-[3.25rem] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/90 px-4 py-3 text-center text-lg font-semibold leading-snug text-slate-900">
              {sentenceAnswer.length ? sentenceAnswer.join(' ') : '—'}
            </div>

            <div className={`mt-5 grid w-full gap-2.5 ${gridCols}`}>
              {sentencePool.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.used || checkStatus === 'correct'}
                  onClick={() => moveWordToAnswer(item, idx)}
                  className={`flex min-h-[48px] w-full items-center justify-center rounded-2xl border px-3 py-2.5 text-center text-sm font-semibold leading-snug transition-all active:scale-[0.98] ${
                    item.used
                      ? 'cursor-not-allowed border-slate-200/80 bg-slate-50 text-slate-400 opacity-40'
                      : 'border-blue-200 bg-white text-blue-900 shadow-[0_2px_10px_rgba(37,99,235,0.06)] hover:border-blue-300 hover:bg-blue-50/90'
                  }`}
                >
                  {item.word}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={clearSentence}
                disabled={checkStatus === 'correct'}
                className="min-h-[48px] rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Tozalash
              </button>
              <button
                type="button"
                onClick={handleCheck}
                disabled={checkStatus === 'correct'}
                className="min-h-[48px] rounded-2xl bg-[#2563EB] py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                Tekshirish
              </button>
            </div>

            {feedback ? (
              <p
                className={`mt-4 text-center text-sm font-medium ${
                  checkStatus === 'correct' ? 'text-emerald-600' : checkStatus === 'wrong' ? 'text-red-600' : 'text-slate-600'
                }`}
              >
                {feedback}
              </p>
            ) : null}

            {checkStatus === 'correct' ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[48px] rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  {taskIndex < tasks.length - 1 ? 'Keyingisi' : 'Yakunlash'}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
            <p className="text-lg font-bold text-emerald-900">Yaxshi!</p>
            <p className="mt-2 text-sm text-emerald-800">Barcha gaplar tuzildi.</p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-5 min-h-[48px] rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white"
            >
              Grammatikaga qaytish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
