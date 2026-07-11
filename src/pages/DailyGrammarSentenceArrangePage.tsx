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
import { isKunlikGrammarFullyDone } from '../../shared/kunlikProgressMerge';
import { getSentenceArrangeDisplayPrompt } from '../utils/sentenceArrangeDisplayPrompt';
import { normSentenceArrangeAnswer } from '../../shared/sentenceArrangeAnswer';
import { playCorrectSound, playWrongSound } from '../utils/sound';

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
    if (isKunlikGrammarFullyDone(row)) return;
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
      playCorrectSound();
    } else {
      setCheckStatus('wrong');
      setFeedback("Noto'g'ri. Yana urinib ko‘ring yoki «Tozalash» bilan boshidan.");
      playWrongSound();
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
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-gray-700">Sahifa topilmadi.</p>
        <button type="button" className="mt-4 text-[#0B2A6B] underline" onClick={() => navigate(kunlikRejaPath(dayNumber))}>
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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
      </div>
    );
  }

  if (error || tasks.length === 0 || !current) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
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
    <div className="grammar-theme min-h-screen pb-28">
      <main className="mx-auto w-full max-w-lg px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[#DDD7F5] bg-white text-[#2D1B69] shadow-[0_4px_10px_rgba(91,76,224,0.08)]"
            aria-label={t('common.back')}
          >
            ‹
          </button>
          <p className="grammar-heading flex-1 text-[16px] leading-none text-[#2D1B69]">
            Grammatika · Gap tuzish
          </p>
        </div>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
              }}
            />
          </div>
        )}

        {!finished ? (
          <div className="mt-5 rounded-[24px] border border-[#DDD7F5] bg-white p-5 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)] sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
              VAZIFA 3 · GAP TUZISH
            </p>
            <p className="grammar-heading mt-3 text-center text-[22px] leading-tight text-[#2D1B69]">
              {getSentenceArrangeDisplayPrompt(current.promptText, current.promptLang)}
            </p>

            <div className="mt-6 min-h-[3.25rem] rounded-2xl border-2 border-dashed border-[#C7BFEE] bg-[#F5F2FE] px-4 py-3 text-center text-[18px] font-black leading-snug text-[#2D1B69]">
              {sentenceAnswer.length ? sentenceAnswer.join(' ') : '—'}
            </div>

            <div className={`mt-5 grid w-full gap-2.5 ${gridCols}`}>
              {sentencePool.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.used || checkStatus === 'correct'}
                  onClick={() => moveWordToAnswer(item, idx)}
                  className={`grammar-heading flex min-h-[50px] w-full items-center justify-center rounded-full border-[1.5px] px-3 py-2.5 text-center text-[15px] transition-all active:scale-[0.98] ${
                    item.used
                      ? 'cursor-not-allowed border-[#E7E1F8] bg-[#F5F2FE] text-[#B0A8CE] opacity-50'
                      : 'border-[#DDD7F5] bg-white text-[#2D1B69] shadow-[0_4px_10px_-6px_rgba(45,27,105,0.1)]'
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
                className="grammar-heading min-h-[50px] rounded-full border-[1.5px] border-[#DDD7F5] bg-white py-3 text-[14px] text-[#5B4CE0] shadow-[0_8px_18px_-10px_rgba(91,76,224,0.28)] disabled:opacity-50"
              >
                Tozalash
              </button>
              <button
                type="button"
                onClick={handleCheck}
                disabled={checkStatus === 'correct'}
                className="grammar-heading min-h-[50px] rounded-full bg-[#5B4CE0] py-3 text-[14px] text-white shadow-[0_14px_28px_-12px_rgba(91,76,224,0.55)] disabled:opacity-50"
              >
                Tekshirish
              </button>
            </div>

            {feedback ? (
              <div className="mt-4 flex justify-center">
                <span
                  key={`fb-${taskIndex}-${feedback}-${checkStatus}`}
                  className={`${checkStatus === 'wrong' ? 'msg-shake' : 'msg-pop'} rounded-full px-4 py-2 text-sm font-black ${
                    checkStatus === 'correct'
                      ? 'bg-[#DCFCE7] text-[#0F7C3A] shadow-[0_6px_14px_-8px_rgba(34,197,94,0.35)]'
                      : checkStatus === 'wrong'
                        ? 'bg-[#FEEBEB] text-[#B4282E] shadow-[0_6px_14px_-8px_rgba(180,40,46,0.35)]'
                        : 'bg-[#EDE9FB] text-[#5B4CE0]'
                  }`}
                >
                  {checkStatus === 'correct' ? '✓' : checkStatus === 'wrong' ? '✕' : '💡'} {feedback}
                </span>
              </div>
            ) : null}

            {checkStatus === 'correct' ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleNext}
                  className="grammar-heading min-h-[50px] rounded-full bg-[#22C55E] px-8 py-3 text-[15px] text-white shadow-[0_14px_28px_-10px_rgba(34,197,94,0.55)]"
                >
                  {taskIndex < tasks.length - 1 ? 'Keyingisi →' : 'Yakunlash'}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] p-6 text-center shadow-[0_14px_30px_-14px_rgba(34,197,94,0.25)]">
            <p className="grammar-heading text-[22px] text-[#0F7C3A]">Yaxshi! 🎉</p>
            <p className="mt-2 text-sm font-black text-[#0F7C3A]">Barcha gaplar tuzildi.</p>
            <button
              type="button"
              onClick={handleBack}
              className="grammar-heading mt-5 min-h-[50px] rounded-full bg-[#22C55E] px-8 py-3 text-[15px] text-white shadow-[0_14px_28px_-10px_rgba(34,197,94,0.55)]"
            >
              Grammatikaga qaytish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
