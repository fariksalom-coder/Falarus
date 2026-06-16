import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import { dailyMcqsToChoiceTasks, type DailyChoiceTask } from '../utils/dailyGrammarMcqs';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function DailyGrammarRuleMcqPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const { patchDay } = useKunlikProgress();
  const grammar1PatchSent = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DailyChoiceTask[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  /** Variant matni takrorlansa ham tugma va kalit noyob bo‘lishi uchun indeks. */
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const backPath = `/kunlik-reja/kun/${dayNumber}/grammatika`;

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
      const mcqs = bundle.grammar?.ruleMcqs ?? [];
      const norm = dailyMcqsToChoiceTasks(mcqs);
      setTasks(norm);
      if (norm.length === 0) {
        setError(
          mcqs.length === 0
            ? 'Bu kun uchun test savollari hali qo‘shilmagan.'
            : 'Savollar shakli noto‘g‘ri (variantlar yoki to‘g‘ri indeks).',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCurrentIndex(0);
    setFinished(false);
    setCorrectCount(0);
    setStatus('idle');
    setMessage('');
    setSelectedOptionIndex(null);
    grammar1PatchSent.current = false;
  }, [tasks]);

  useEffect(() => {
    if (!finished || grammar1PatchSent.current) return;
    grammar1PatchSent.current = true;
    patchDay(dayNumber, { grammar_1: true });
  }, [finished, dayNumber, patchDay]);

  const currentTask = tasks[currentIndex];
  const progress = useMemo(
    () => ((currentIndex + (finished ? 1 : 0)) / Math.max(tasks.length, 1)) * 100,
    [currentIndex, finished, tasks.length],
  );

  useEffect(() => {
    if (!currentTask) return;
    setStatus('idle');
    setMessage('');
    setChoiceOptions(shuffle(currentTask.options));
    setSelectedOptionIndex(null);
  }, [currentIndex, currentTask]);

  const handleBack = () => navigate(backPath);

  const handleNext = () => {
    if (status !== 'correct') return;
    setCorrectCount((c) => c + 1);
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex((p) => p + 1);
      return;
    }
    patchDay(dayNumber, { grammar_1: true });
    navigate(`/kunlik-reja/kun/${dayNumber}/grammatika/juftlik`, { replace: true });
  };

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

  if (error || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="mt-2 text-sm">{error ?? 'Savollar yo‘q.'}</p>
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
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 pb-28">
      <main className="mx-auto w-full max-w-lg px-4 py-6">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          {t('common.back')}
        </button>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {!finished && currentTask && (
          <div className="mt-6 rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)] sm:p-5">
            <p className="text-base font-bold text-gray-900">{currentTask.prompt}</p>

            <div className="mt-4 space-y-2">
              {choiceOptions.map((option, optionIndex) => {
                const isSelected = selectedOptionIndex === optionIndex;
                const showCorrect = status === 'correct' && isSelected;
                const showWrong = status === 'wrong' && isSelected;
                const className = showCorrect
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : showWrong
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-blue-300';
                return (
                  <button
                    key={`${currentIndex}-${optionIndex}`}
                    type="button"
                    onClick={() => {
                      if (status === 'correct') return;
                      setSelectedOptionIndex(optionIndex);
                      const ok = option === currentTask.correct;
                      if (ok) {
                        setStatus('correct');
                        setMessage('To‘g‘ri!');
                      } else {
                        setStatus('wrong');
                        setMessage('Noto‘g‘ri. Yana urinib ko‘ring.');
                      }
                    }}
                    className={`min-h-[48px] w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all active:scale-[0.98] ${className}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {message ? (
              <p
                className={`mt-4 text-center text-sm font-medium ${
                  status === 'wrong' ? 'text-red-600' : status === 'correct' ? 'text-emerald-700' : 'text-gray-600'
                }`}
              >
                {message}
              </p>
            ) : null}

            {status === 'correct' && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[48px] rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  {currentIndex < tasks.length - 1 ? 'Keyingisi' : 'Yakunlash'}
                </button>
              </div>
            )}
          </div>
        )}

        {finished ? (
          <div className="mt-8 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
            <p className="text-lg font-bold text-emerald-900">Tabriklaymiz!</p>
            <p className="mt-2 text-sm text-emerald-800">
              Natija: {correctCount} / {tasks.length}
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-4 min-h-[48px] rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white"
            >
              Grammatikaga qaytish
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
