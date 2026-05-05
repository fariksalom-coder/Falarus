import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import type { VocabularyEntry } from '../data/vocabularyContent';
import { dailyWordsToEntries } from '../utils/dailyVocabEntries';
import { loadDailyVocabProgress, patchDailyVocabProgress } from '../utils/dailyVocabProgress';
import { groupEntriesForPairs } from '../components/vocabulary/vocabExerciseUtils';
import {
  VocabularyPairsExercise,
  buildPairGroups,
} from '../components/vocabulary/exercises/VocabularyPairsExercise';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';

export default function DailyVocabPairsPage() {
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

  const [pairGroupIndex, setPairGroupIndex] = useState(0);
  const [pairSelectedLeft, setPairSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [pairMessage, setPairMessage] = useState('');
  const [wrongPairIds, setWrongPairIds] = useState<string[] | null>(null);
  const savedStep3Ref = useRef(false);

  const [progress, setProgress] = useState(() => loadDailyVocabProgress(dayNumber));
  useEffect(() => {
    setProgress(loadDailyVocabProgress(dayNumber));
  }, [dayNumber]);
  useEffect(() => {
    const fn = () => setProgress(loadDailyVocabProgress(dayNumber));
    window.addEventListener('daily-vocab-progress', fn as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', fn as EventListener);
  }, [dayNumber]);

  const pairGroups = useMemo(() => buildPairGroups(groupEntriesForPairs(entries)), [entries]);

  const persistStep3IfNeeded = useCallback(() => {
    if (savedStep3Ref.current || pairGroups.length === 0) return;
    savedStep3Ref.current = true;
    patchDailyVocabProgress(dayNumber, { step3Completed: true });
    patchDay(dayNumber, { words_match: true });
  }, [dayNumber, pairGroups.length, patchDay]);

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

  useEffect(() => {
    savedStep3Ref.current = false;
    setPairGroupIndex(0);
    setPairSelectedLeft(null);
    setMatched([]);
    setPairMessage('');
    setWrongPairIds(null);
  }, [entries]);

  /** Oxirgi guruhda «Tugatish» faqat `onFinish` chaqiradi, `pairGroupIndex` oshmaydi — saqlash shu yerda ham bo‘lishi kerak */
  useEffect(() => {
    if (pairGroups.length === 0 || pairGroupIndex < pairGroups.length || savedStep3Ref.current) return;
    persistStep3IfNeeded();
  }, [pairGroupIndex, pairGroups.length, persistStep3IfNeeded]);

  const handleFinishPairsHub = useCallback(() => {
    persistStep3IfNeeded();
    navigate(hubPath);
  }, [persistStep3IfNeeded, navigate, hubPath]);

  const currentGroup = pairGroups[pairGroupIndex];

  const onPickRight = (id: string) => {
    if (!currentGroup || !pairSelectedLeft) return;
    if (matched.includes(id)) return;
    const left = currentGroup.left.find((l) => l.id === pairSelectedLeft);
    const right = currentGroup.right.find((r) => r.id === id);
    if (!left || !right) return;
    if (left.pairId === right.pairId) {
      setMatched((m) => [...m, left.id, right.id]);
      setPairMessage("To'g'ri!");
      setPairSelectedLeft(null);
    } else {
      setPairMessage("Xato, yana urinib ko'ring.");
      setWrongPairIds([left.id, right.id]);
      setTimeout(() => {
        setWrongPairIds(null);
        setPairSelectedLeft(null);
        setPairMessage('');
      }, 600);
    }
  };

  const onNextPairGroup = () => {
    setPairGroupIndex((i) => i + 1);
    setMatched([]);
    setPairSelectedLeft(null);
    setPairMessage('');
    setWrongPairIds(null);
  };

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

  if (!progress.step2Passed) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <main className="mx-auto max-w-[720px] px-4 py-8 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={handleBack} className="mb-6 text-sm font-medium text-slate-600">
            ← Orqaga
          </button>
          <div className="rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Lock className="h-7 w-7 text-red-400" />
            </div>
            <p className="mt-4 text-xl font-semibold text-slate-900">Juftliklar qulflangan</p>
            <p className="mt-2 text-sm text-slate-600">
              Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/kunlik-reja/kun/${dayNumber}/lugat/test`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-indigo-700"
            >
              Testga qaytish
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

        <VocabularyPairsExercise
          pairGroups={pairGroups}
          pairGroupIndex={pairGroupIndex}
          pairSelectedLeft={pairSelectedLeft}
          matched={matched}
          pairMessage={pairMessage}
          wrongPairIds={wrongPairIds}
          pointsEarnedMessage={null}
          onPickLeft={(id) => setPairSelectedLeft(id)}
          onPickRight={onPickRight}
          onNextGroup={onNextPairGroup}
          onFinish={handleFinishPairsHub}
        />
      </main>
    </div>
  );
}
