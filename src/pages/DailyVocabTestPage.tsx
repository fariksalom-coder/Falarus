import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import type { VocabularyEntry } from '../data/vocabularyContent';
import { dailyWordsToEntries } from '../utils/dailyVocabEntries';
import { loadDailyVocabProgress, patchDailyVocabProgress } from '../utils/dailyVocabProgress';
import { buildTestQuestions } from '../components/vocabulary/vocabExerciseUtils';
import { VocabularyTestExercise } from '../components/vocabulary/exercises/VocabularyTestExercise';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';

export default function DailyVocabTestPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const { patchDay } = useKunlikProgress();
  const hubPath = `/kunlik-reja/kun/${dayNumber}/lugat`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);

  const [testIndex, setTestIndex] = useState(0);
  const [testSelected, setTestSelected] = useState<string | null>(null);
  const [testCorrect, setTestCorrect] = useState(0);
  const savedStep2Ref = useRef(false);

  const [progress, setProgress] = useState(() => loadDailyVocabProgress(dayNumber));
  useEffect(() => {
    setProgress(loadDailyVocabProgress(dayNumber));
  }, [dayNumber]);
  useEffect(() => {
    const fn = () => setProgress(loadDailyVocabProgress(dayNumber));
    window.addEventListener('daily-vocab-progress', fn as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', fn as EventListener);
  }, [dayNumber]);

  const load = useCallback(async () => {
    if (!token || !isValidDailyCourseDay(dayNumber)) {
      setLoading(false);
      setError(!token ? 'Kirish kerak' : 'Kun raqami noto‘g‘ri');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bundle = await getDailyCourseDay(token, dayNumber);
      const mapped = dailyWordsToEntries(bundle.vocabulary?.words ?? []);
      setEntries(mapped);
      if (mapped.length === 0) {
        setError('Bu kun uchun lug‘at bo‘sh.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const testQuestions = useMemo(() => buildTestQuestions(entries), [entries]);

  useEffect(() => {
    savedStep2Ref.current = false;
    setTestIndex(0);
    setTestSelected(null);
    setTestCorrect(0);
  }, [entries]);

  useEffect(() => {
    const n = testQuestions.length;
    if (n === 0 || testIndex < n || savedStep2Ref.current) return;
    savedStep2Ref.current = true;
    const pct = Math.round((testCorrect / n) * 100);
    const passed = pct >= 80;
    patchDailyVocabProgress(dayNumber, {
      step2Completed: true,
      step2Correct: testCorrect,
      step2Incorrect: n - testCorrect,
      step2Passed: passed,
    });
    patchDay(dayNumber, { words_correct: testCorrect });
  }, [testIndex, testQuestions.length, testCorrect, dayNumber, patchDay]);

  const handleBack = () => navigate(hubPath);

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <p className="text-slate-700">Sahifa topilmadi.</p>
      </div>
    );
  }

  if (gatePending) {
    return <KunlikSequentialGateSpinner />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || entries.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-950">{error ?? 'Maʼlumot yo‘q.'}</p>
          <button type="button" onClick={handleBack} className="mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">
            Orqaga
          </button>
        </main>
      </div>
    );
  }

  const step1Done = progress.step1Completed;

  if (!step1Done) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <main className="mx-auto max-w-[720px] px-4 py-8 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={handleBack} className="mb-6 text-sm font-medium text-slate-600">
            ← Orqaga
          </button>
          <div className="rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Lock className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 text-xl font-semibold text-slate-900">Test qulflangan</p>
            <p className="mt-2 text-sm text-slate-600">Testni boshlash uchun avval tanishishni tugating.</p>
            <button
              type="button"
              onClick={() => navigate(`/kunlik-reja/kun/${dayNumber}/lugat/tanishish`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-indigo-700"
            >
              Tanishishga o‘tish
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-[720px] px-4 py-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← Orqaga
        </button>

        <VocabularyTestExercise
          questions={testQuestions}
          testIndex={testIndex}
          testSelected={testSelected}
          testCorrect={testCorrect}
          pointsEarnedMessage={null}
          summaryFromServer={null}
          onChoose={(option) => {
            const currentTest = testQuestions[testIndex];
            if (!currentTest || testSelected) return;
            setTestSelected(option);
            if (option === currentTest.correct) setTestCorrect((v) => v + 1);
          }}
          onNext={() => {
            setTestSelected(null);
            setTestIndex((i) => i + 1);
          }}
          onContinueToPairs={() => navigate(`/kunlik-reja/kun/${dayNumber}/lugat/juftlik`)}
          onRetry={() => {
            savedStep2Ref.current = false;
            setTestIndex(0);
            setTestSelected(null);
            setTestCorrect(0);
          }}
        />
      </main>
    </div>
  );
}
