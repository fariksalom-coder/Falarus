import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, ChevronRight, Layers, ClipboardList, Puzzle, Check, Play, Lock, X } from 'lucide-react';
import { getSubtopicContent, VocabularyEntry } from '../data/vocabularyContent';
import {
  setLastPartId,
  getPartResultCount,
  setPartResultCount,
  getStageStatus,
  setStageStatus,
  getFlashcardStepCounts,
  setFlashcardStepCounts,
  type StageStatus,
} from '../utils/vocabProgress';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useResolvedVocabularySubtopicId } from '../hooks/useResolvedVocabularySubtopicId';
import { canAccessVocabularySubtopicRoute } from '../utils/vocabularyAccess';
import {
  fetchVocabularyWordGroups,
  fetchVocabularyTasksStatus,
  getCachedWordGroupsProgress,
  getCachedTasksStatus,
  setCachedTasksStatus,
  postVocabularyMatchFinish,
  type VocabularyTasksStatus,
} from '../api/vocabulary';
import { useVocabularyStepsStore } from '../state/vocabularyStepsStore';
import { StepCard } from '../components/vocabulary/ThreeStepLearning/StepCard';
import type { WordGroupStepsState } from '../api/vocabulary';

type Mode = 'cards' | 'test' | 'pairs';

function StageStatusIcon({ status }: { status: StageStatus }) {
  if (status === 'completed') return <Check className="h-4 w-4 text-emerald-600" />;
  if (status === 'in_progress') return <Play className="h-4 w-4 text-indigo-600" />;
  return <Lock className="h-4 w-4 text-slate-400" />;
}

const shuffle = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const groupByRules = (entries: VocabularyEntry[]) => {
  const groups: VocabularyEntry[][] = [];
  let i = 0;
  while (i < entries.length) {
    const remain = entries.length - i;
    if (remain <= 6 && remain !== 1) {
      groups.push(entries.slice(i));
      break;
    }
    groups.push(entries.slice(i, i + 5));
    i += 5;
  }
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    const last = groups.pop();
    if (last) groups[groups.length - 1].push(last[0]);
  }
  return groups;
};

export default function VocabularyPartPage() {
  const navigate = useNavigate();
  const { topicId, subtopicId, partId, mode: modeParam } = useParams();
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const { hasPendingPayment } = usePaymentStatus();
  const [showVocabPaywall, setShowVocabPaywall] = useState(false);
  const { resolvedId, loading: resolvingSubtopic } = useResolvedVocabularySubtopicId(
    topicId,
    subtopicId,
    token
  );
  const content = resolvedId ? getSubtopicContent(topicId, resolvedId) : undefined;
  const part = content?.parts.find((item) => item.id === partId);

  const mode: Mode | null =
    modeParam === 'cards' || modeParam === 'test' || modeParam === 'pairs' ? modeParam : null;
  const isExerciseScreen = mode !== null;
  const partUrl =
    topicId && subtopicId && partId
      ? `/vocabulary/${topicId}/${subtopicId}/${partId}`
      : '';

  const [wordGroupId, setWordGroupId] = useState<number | null>(() => {
    if (!resolvedId || !partId) return null;
    const cached = getCachedWordGroupsProgress(resolvedId);
    const group = cached?.find((g) => g.part_id === partId);
    return group?.id ?? null;
  });
  const [tasksStatus, setTasksStatus] = useState<VocabularyTasksStatus | null>(() => {
    if (!resolvedId || !partId) return null;
    const cached = getCachedWordGroupsProgress(resolvedId);
    const group = cached?.find((g) => g.part_id === partId);
    if (group?.id == null) return null;
    return getCachedTasksStatus(group.id);
  });
  const [pointsEarnedMessage, setPointsEarnedMessage] = useState<number | null>(null);

  const stepsStore = useVocabularyStepsStore();
  const stepsState = wordGroupId != null ? stepsStore.byGroup[wordGroupId] : undefined;
  const [cachedStepsState, setCachedStepsState] = useState<WordGroupStepsState | undefined>(undefined);
  /** Avoid infinite POST retries when step1 backfill keeps failing (e.g. 404). */
  const step1BackfillFailedGroupIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (wordGroupId == null) return;
    if (typeof window === 'undefined' || !('sessionStorage' in window)) return;
    try {
      const raw = sessionStorage.getItem(`vocab_steps_${wordGroupId}`);
      if (!raw) {
        setCachedStepsState(undefined);
        return;
      }
      const parsed = JSON.parse(raw) as WordGroupStepsState;
      setCachedStepsState(parsed);
    } catch {
      setCachedStepsState(undefined);
    }
  }, [wordGroupId]);

  const effectiveStepsState = stepsState ?? cachedStepsState;

  const refetchTasks = async () => {
    if (!token || wordGroupId == null) return;
    const status = await fetchVocabularyTasksStatus(token, wordGroupId);
    if (status) {
      setTasksStatus(status);
      setCachedTasksStatus(wordGroupId, status);
    }
  };

  useEffect(() => {
    if (content?.topicId && content?.subtopicId && part?.id) {
      setLastPartId(content.topicId, content.subtopicId, part.id);
    }
  }, [content?.topicId, content?.subtopicId, part?.id]);

  useEffect(() => {
    if (!token || !resolvedId || !subtopicId || !part?.id) return;
    setWordGroupId((prev) => {
      const cached = getCachedWordGroupsProgress(resolvedId);
      const group = cached?.find((g) => g.part_id === part.id);
      return group?.id ?? prev ?? null;
    });
    setTasksStatus((prev) => {
      const cached = getCachedWordGroupsProgress(resolvedId);
      const group = cached?.find((g) => g.part_id === part.id);
      if (group?.id != null) {
        const cachedStatus = getCachedTasksStatus(group.id);
        if (cachedStatus) return cachedStatus;
      }
      return prev;
    });
    let cancelled = false;
    (async () => {
      // Use canonical subtopic id instead of raw route param so Step 1 save
      // still works even if production DB is missing the latest slug backfill.
      const groups = await fetchVocabularyWordGroups(token, resolvedId);
      if (cancelled) return;
      const group = groups.find((g) => g.part_id === part.id);
      if (group) {
        setWordGroupId(group.id);
        const status = await fetchVocabularyTasksStatus(token, group.id);
        if (!cancelled && status) {
          setTasksStatus(status);
          setCachedTasksStatus(group.id, status);
        }
        if (!cancelled && token) {
          await stepsStore.fetchSteps(token, group.id);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token, resolvedId, subtopicId, part?.id, stepsStore]);

  // If flashcards finished while wordGroupId was still null, or API row still has 0/0, push saved Biladi/Bilmaydi to DB.
  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (!token || wordGroupId == null) return;
    if (getStageStatus(content.topicId, content.subtopicId, part.id, 'cards') !== 'completed') {
      return;
    }
    const local = getFlashcardStepCounts(content.topicId, content.subtopicId, part.id);
    if (!local) return;

    const st = stepsStore.byGroup[wordGroupId];
    const serverSum = (st?.step1.known ?? 0) + (st?.step1.unknown ?? 0);
    if (serverSum > 0) return;
    if (step1BackfillFailedGroupIdsRef.current.has(wordGroupId)) return;

    let cancelled = false;
    void (async () => {
      try {
        await stepsStore.submitStep1(token, wordGroupId, local.known, local.unknown);
        if (cancelled) return;
        await refetchTasks();
        await stepsStore.fetchSteps(token, wordGroupId);
      } catch (e) {
        step1BackfillFailedGroupIdsRef.current.add(wordGroupId);
        console.error('[vocabulary] backfill step1 failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    token,
    wordGroupId,
    content?.topicId,
    content?.subtopicId,
    part?.id,
    stepsStore,
    stepsState?.step1.known,
    stepsState?.step1.unknown,
  ]);

  const testQuestions = useMemo(() => {
    if (!part) return [];
    return part.entries.map((entry, index) => {
      const pool = part.entries.filter((e) => e.russian !== entry.russian).map((e) => e.russian);
      const distractors = shuffle(Array.from(new Set(pool))).slice(0, 3);
      const options = shuffle([entry.russian, ...distractors]);
      return { id: `${index}`, uzbek: entry.uzbek, options, correct: entry.russian };
    });
  }, [part]);

  const pairGroups = useMemo(() => {
    if (!part) return [];
    return groupByRules(part.entries).map((group, idx) => ({
      id: idx,
      pairs: group,
      left: shuffle(group.map((p, i) => ({ id: `${idx}-l-${i}`, pairId: i, text: p.russian }))),
      right: shuffle(group.map((p, i) => ({ id: `${idx}-r-${i}`, pairId: i, text: p.uzbek }))),
    }));
  }, [part]);

  const [testIndex, setTestIndex] = useState(0);
  const [testSelected, setTestSelected] = useState<string | null>(null);
  const [testCorrect, setTestCorrect] = useState(0);
  const [step2Submitted, setStep2Submitted] = useState(false);

  const [pairGroupIndex, setPairGroupIndex] = useState(0);
  const [pairSelectedLeft, setPairSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [pairMessage, setPairMessage] = useState('');
  const [wrongPairIds, setWrongPairIds] = useState<string[] | null>(null);
  const [step3Submitted, setStep3Submitted] = useState(false);

  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step1SaveError, setStep1SaveError] = useState<string | null>(null);

  const prevExerciseModeRef = useRef<Mode | null>(null);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) {
      prevExerciseModeRef.current = mode;
      return;
    }
    if (mode) {
      setStageStatus(content.topicId, content.subtopicId, part.id, mode, 'in_progress');
    }

    const prev = prevExerciseModeRef.current;
    if (mode === 'cards' && prev !== 'cards') {
      setStep1SaveError(null);
      setCardIndex(0);
      setKnownCount(0);
      setUnknownCount(0);
      setCardFlipped(false);
      setStep1Submitted(false);
    }
    if (mode === 'test' && prev !== 'test') {
      setTestIndex(0);
      setTestSelected(null);
      setTestCorrect(0);
      setStep2Submitted(false);
    }
    if (mode === 'pairs' && prev !== 'pairs') {
      setPairGroupIndex(0);
      setPairSelectedLeft(null);
      setMatched([]);
      setPairMessage('');
      setWrongPairIds(null);
      setStep3Submitted(false);
    }
    prevExerciseModeRef.current = mode;
    setPointsEarnedMessage(null);
  }, [mode, content?.topicId, content?.subtopicId, part?.id]);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (
      mode === 'cards' &&
      !step1Submitted &&
      cardIndex >= (part.entries?.length ?? 0) &&
      (part.entries?.length ?? 0) > 0
    ) {
      setStageStatus(content.topicId, content.subtopicId, part.id, 'cards', 'completed');
      setFlashcardStepCounts(
        content.topicId,
        content.subtopicId,
        part.id,
        knownCount,
        unknownCount
      );
      if (token && wordGroupId != null) {
        void (async () => {
          try {
            setStep1SaveError(null);
            await stepsStore.submitStep1(token, wordGroupId, knownCount, unknownCount);
            await refetchTasks();
            await stepsStore.fetchSteps(token, wordGroupId);
            if (content?.subtopicId) {
              try {
                sessionStorage.removeItem(`vocab_word_groups_${content.subtopicId}`);
              } catch {
                // ignore
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Saqlashda xatolik';
            setStep1SaveError(msg);
            console.error('[vocabulary] step1 save failed', e);
          }
        })();
      }
      setStep1Submitted(true);
    }
  }, [
    content?.topicId,
    content?.subtopicId,
    part?.id,
    mode,
    cardIndex,
    part?.entries?.length,
    token,
    wordGroupId,
    knownCount,
    unknownCount,
    step1Submitted,
    stepsStore,
  ]);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (
      mode === 'test' &&
      !step2Submitted &&
      testIndex >= testQuestions.length &&
      testQuestions.length > 0
    ) {
      setStageStatus(content.topicId, content.subtopicId, part.id, 'test', 'completed');
      if (token && wordGroupId != null) {
        void (async () => {
          try {
            await stepsStore.submitStep2(
              token,
              wordGroupId,
              testCorrect,
              testQuestions.length - testCorrect,
              testQuestions.length
            );
            await refetchTasks();
            if (content?.subtopicId) {
              try {
                sessionStorage.removeItem(`vocab_word_groups_${content.subtopicId}`);
              } catch {
                // ignore
              }
            }
          } catch (e) {
            console.error('[vocabulary] step2 save failed', e);
          }
        })();
      } else {
        setPartResultCount(
          content.topicId,
          content.subtopicId,
          part.id,
          testCorrect,
          part.entries.length
        );
      }
      setStep2Submitted(true);
    }
  }, [
    content?.topicId,
    content?.subtopicId,
    part?.id,
    mode,
    testIndex,
    testQuestions.length,
    token,
    wordGroupId,
    testCorrect,
    step2Submitted,
    stepsStore,
  ]);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (
      mode === 'pairs' &&
      !step3Submitted &&
      pairGroupIndex >= pairGroups.length &&
      pairGroups.length > 0
    ) {
      setStageStatus(content.topicId, content.subtopicId, part.id, 'pairs', 'completed');
      const correctPairs = pairGroups.reduce((sum, g) => sum + g.pairs.length, 0);
      if (token && wordGroupId != null && correctPairs > 0) {
        postVocabularyMatchFinish(token, wordGroupId, correctPairs).then((result) => {
          if (result) {
            setPointsEarnedMessage(result.points_awarded > 0 ? result.points_awarded : null);
            refetchTasks();
          }
        });
      }
      setStep3Submitted(true);
    }
  }, [
    content?.topicId,
    content?.subtopicId,
    part?.id,
    mode,
    pairGroupIndex,
    pairGroups.length,
    part?.entries?.length,
    token,
    wordGroupId,
    step3Submitted,
  ]);

  if (resolvingSubtopic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!resolvedId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">Mavzu topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary')}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  if (!content || !part) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">Qism topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary')}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  const vocabAccessDenied =
    Boolean(token) &&
    accessLoaded &&
    content &&
    resolvedId != null &&
    !canAccessVocabularySubtopicRoute(access, content.topicId, resolvedId);

  if (vocabAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <Lock className="h-7 w-7 text-amber-600" />
          </div>
          <p className="font-semibold text-slate-900">Bu mavzu sizning tarifingizda ochilmagan</p>
          <p className="mt-2 text-sm text-slate-600">
            Barcha bo&apos;limlarni ochish uchun tarifni tanlang.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate('/vocabulary')}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Lug&apos;atga qaytish
            </button>
            <button
              type="button"
              onClick={() => setShowVocabPaywall(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Tarifni ochish
            </button>
          </div>
        </div>
        {showVocabPaywall && hasPendingPayment && (
          <PendingPaymentModal onClose={() => setShowVocabPaywall(false)} />
        )}
        {showVocabPaywall && !hasPendingPayment && (
          <PaywallModal
            onClose={() => setShowVocabPaywall(false)}
            title="Bu mavzu faqat obuna bo'lganlar uchun"
            description="Barcha so'zlar va mavzularga kirish uchun tarifni sotib oling."
            buttonText="Barcha mavzularni ochish"
          />
        )}
      </div>
    );
  }

  // Hard guard: prevent direct navigation to Test/Match without completing required steps.
  // Prefer server state; if API failed (404) but user finished cards locally, still allow test.
  const localCardsCompleted =
    !!content?.topicId &&
    !!content?.subtopicId &&
    !!part?.id &&
    getStageStatus(content.topicId, content.subtopicId, part.id, 'cards') === 'completed';
  const safeStep1Completed =
    localCardsCompleted ||
    (effectiveStepsState?.step1.known ?? 0) + (effectiveStepsState?.step1.unknown ?? 0) > 0;

  if (mode === 'test' && !safeStep1Completed) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-[720px] px-4 py-8">
          <div className="rounded-[20px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: '#E2E8F0' }}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#F1F5F9' }}>
              <Lock className="h-7 w-7" style={{ color: '#94A3B8' }} />
            </div>
            <p className="mt-4 text-xl font-semibold" style={{ color: '#0F172A' }}>2-bosqich (Test) qulflangan</p>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>Testni boshlash uchun avval 1-bosqichni tugatishingiz kerak.</p>
            <button
              type="button"
              onClick={() => navigate(`${partUrl}/cards`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
            >
              Boshlash
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (mode === 'pairs' && (!effectiveStepsState || !effectiveStepsState.step3.unlocked)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-[720px] px-4 py-8">
          <div className="rounded-[20px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: '#E2E8F0' }}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#FEF2F2' }}>
              <Lock className="h-7 w-7" style={{ color: '#EF4444' }} />
            </div>
            <p className="mt-4 text-xl font-semibold" style={{ color: '#0F172A' }}>3-bosqich (Juftini topish) qulflangan</p>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak.</p>
            <button
              type="button"
              onClick={() => navigate(`${partUrl}/test`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
            >
              Qayta urinish
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentCard = part.entries[cardIndex];
  const currentTest = testQuestions[testIndex];
  const currentGroup = pairGroups[pairGroupIndex];

  const onCardAction = (_known: boolean) => {
    if (_known) setKnownCount((v) => v + 1);
    else setUnknownCount((v) => v + 1);
    setCardFlipped(false);
    setCardIndex((i) => i + 1);
  };

  const onTestChoose = (option: string) => {
    if (!currentTest || testSelected) return;
    setTestSelected(option);
    if (option === currentTest.correct) setTestCorrect((v) => v + 1);
  };

  const onTestNext = () => {
    setTestSelected(null);
    setTestIndex((i) => i + 1);
  };

  const onPickLeft = (id: string) => setPairSelectedLeft(id);

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

  const onNextGroup = () => {
    setPairGroupIndex((i) => i + 1);
    setMatched([]);
    setPairSelectedLeft(null);
    setPairMessage('');
    setWrongPairIds(null);
  };

  const isGroupDone = currentGroup ? matched.length === currentGroup.pairs.length * 2 : false;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-[720px] px-4 py-8">
        <button
          type="button"
          onClick={() => navigate(isExerciseScreen ? partUrl : `/vocabulary/${content.topicId}/${content.subtopicId}`)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          ← Orqaga
        </button>

        {!isExerciseScreen && (() => {
          if (!content || !part) return null;
          const total = part.entries?.length ?? 0;
          const learnedWords = tasksStatus?.learned_words ?? getPartResultCount(content.topicId, content.subtopicId, part.id);
          const totalWords = tasksStatus?.total_words ?? total;
          const step1Completed = safeStep1Completed;
          const step2Completed = effectiveStepsState?.step2.completed ?? false;
          const step2Passed = effectiveStepsState?.step2.passed ?? false;
          const step3Unlocked = effectiveStepsState?.step3.unlocked ?? false;

          const step3Completed = tasksStatus?.match_status === 'completed';

          const hint80 = 'Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak';
          // Header result should reflect "learned words" (best progress),
          // not the last attempt correct/incorrect.
          const natijaCorrect = learnedWords;
          const natijaTotal = totalWords;

          const flashLocal = getFlashcardStepCounts(
            content.topicId,
            content.subtopicId,
            part.id
          );
          const serverKnown1 = effectiveStepsState?.step1.known ?? 0;
          const serverUnknown1 = effectiveStepsState?.step1.unknown ?? 0;
          const serverSum1 = serverKnown1 + serverUnknown1;
          const cardsStageDone =
            getStageStatus(content.topicId, content.subtopicId, part.id, 'cards') === 'completed';
          const localSum = flashLocal ? flashLocal.known + flashLocal.unknown : 0;
          const flashDiffersFromServer =
            flashLocal != null &&
            localSum > 0 &&
            (flashLocal.known !== serverKnown1 || flashLocal.unknown !== serverUnknown1);
          const step1KnownDisplay =
            cardsStageDone && flashDiffersFromServer
              ? flashLocal.known
              : serverSum1 > 0
                ? serverKnown1
                : (flashLocal?.known ?? 0);
          const step1UnknownDisplay =
            cardsStageDone && flashDiffersFromServer
              ? flashLocal.unknown
              : serverSum1 > 0
                ? serverUnknown1
                : (flashLocal?.unknown ?? 0);

          return (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Natija: <span className="font-semibold text-slate-900">{natijaCorrect} / {natijaTotal}</span> so&apos;z
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Bosqichlar
                </p>
                <div className="space-y-3">
                  {/* 1-bosqich */}
                  <StepCard
                    title="1-bosqich: Tanishish (kartochkalar)"
                    status={step1Completed ? 'completed' : 'available'}
                    icon={<Layers className="h-5 w-5" strokeWidth={1.8} />}
                    disabled={false}
                    actionLabel={step1Completed ? 'Davom etish' : 'Boshlash'}
                    onClick={() => navigate(`${partUrl}/cards`)}
                    result={
                      step1Completed ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold" style={{ color: '#166534' }}>
                            <span>🟢</span>
                            Biladi: {step1KnownDisplay}
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold" style={{ color: '#B91C1C' }}>
                            <span>🔴</span>
                            Bilmaydi: {step1UnknownDisplay}
                          </div>
                        </div>
                      ) : null
                    }
                  />

                  {/* 2-bosqich */}
                  <StepCard
                    title="2-bosqich: Test"
                    status={!step1Completed ? 'locked' : step2Completed ? (step3Unlocked ? 'completed' : 'failed') : 'available'}
                    icon={<ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
                    disabled={!step1Completed}
                    actionLabel={
                      !step1Completed
                        ? 'Qulflangan'
                        : step2Completed
                          ? step3Unlocked
                            ? 'Davom etish'
                            : 'Qayta urinish'
                          : 'Boshlash'
                    }
                    onClick={() => {
                      if (!step1Completed) return;
                      // Requirement: pressing "Davom etish" in Step 2 must open Step 2 screen.
                      navigate(`${partUrl}/test`);
                    }}
                    hint={(!step1Completed || (step2Completed && !step3Unlocked)) ? hint80 : undefined}
                    result={
                      step2Completed ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <div
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                            style={{
                              borderColor: '#BBF7D0',
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                            }}
                          >
                            <span>🟢</span>
                            To‘g‘ri: {effectiveStepsState?.step2.correct ?? 0}
                          </div>
                          <div
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                            style={{
                              borderColor: '#FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                            }}
                          >
                            <span>🔴</span>
                            Noto‘g‘ri: {effectiveStepsState?.step2.incorrect ?? 0}
                          </div>
                          <div
                            className="rounded-full border px-3 py-1 text-sm font-semibold"
                            style={{
                              borderColor: step2Passed ? '#BBF7D0' : '#FECACA',
                              backgroundColor: step2Passed ? '#F0FDF4' : '#FEF2F2',
                              color: step2Passed ? '#166534' : '#B91C1C',
                            }}
                          >
                            Foiz: {Math.round(effectiveStepsState?.step2.percentage ?? 0)}%
                          </div>
                        </div>
                      ) : null
                    }
                  />

                  {/* 3-bosqich */}
                  <StepCard
                    title="3-bosqich: Juftini topish"
                    status={!step3Unlocked ? 'locked' : step3Completed ? 'completed' : 'available'}
                    icon={<Puzzle className="h-5 w-5" strokeWidth={1.8} />}
                    disabled={!step3Unlocked}
                    actionLabel={
                      !step3Unlocked ? 'Qulflangan' : step3Completed ? 'Davom etish' : 'Boshlash'
                    }
                    hint={!step3Unlocked ? hint80 : undefined}
                    onClick={() => {
                      if (!step3Unlocked) return;
                      // Always open match screen for Step 3.
                      navigate(`${partUrl}/pairs`);
                    }}
                    result={
                      step3Completed ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <div
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                            style={{
                              borderColor: '#BBF7D0',
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                            }}
                          >
                            <span>🟢</span>
                            To‘g‘ri: {learnedWords}
                          </div>
                          <div
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                            style={{
                              borderColor: '#FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                            }}
                          >
                            <span>🔴</span>
                            Noto‘g‘ri: {Math.max(0, totalWords - learnedWords)}
                          </div>
                          <div
                            className="rounded-full border px-3 py-1 text-sm font-semibold"
                            style={{
                              borderColor: '#E2E8F0',
                              backgroundColor: '#ffffff',
                              color: '#0F172A',
                            }}
                          >
                            Foiz: {totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0}%
                          </div>
                        </div>
                      ) : null
                    }
                  />
                </div>
              </div>
            </>
          );
        })()}

        {mode === 'cards' && (
          <div
            className="mx-auto max-w-[720px]"
            style={{ backgroundColor: '#F8FAFC' }}
          >
            {currentCard ? (
              <>
                {/* Progress */}
                <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
                  {cardIndex + 1} / {part.entries.length} so&apos;z
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((cardIndex + 1) / part.entries.length) * 100}%`,
                      backgroundColor: '#6366F1',
                    }}
                  />
                </div>

                {/* Flip card */}
                <div className="mt-4" style={{ perspective: '1000px' }}>
                  <button
                    type="button"
                    onClick={() => setCardFlipped((v) => !v)}
                    className="relative h-64 w-full cursor-pointer overflow-hidden rounded-[20px]"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border bg-white p-10 shadow-lg transition-transform duration-500 ease-out"
                      style={{
                        borderColor: '#E2E8F0',
                        transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                        <span className="mr-1.5 text-base" aria-hidden>🇺🇿</span>
                        O&apos;zbekcha
                      </p>
                      <p className="mt-4 text-center text-3xl font-bold" style={{ color: '#0F172A' }}>
                        {currentCard.uzbek}
                      </p>
                    </div>
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border bg-white p-10 shadow-lg transition-transform duration-500 ease-out"
                      style={{
                        borderColor: '#E2E8F0',
                        transform: cardFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                        <span className="mr-1.5 text-base" aria-hidden>🇷🇺</span>
                        Ruscha
                      </p>
                      <p className="mt-4 text-center text-3xl font-bold" style={{ color: '#0F172A' }}>
                        {currentCard.russian}
                      </p>
                    </div>
                  </button>
                </div>

                <p className="mt-4 text-center text-xs" style={{ color: '#64748B' }}>
                  Kartochkani aylantirish uchun bosing
                </p>

                {/* Action buttons */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => onCardAction(false)}
                    className="rounded-[14px] border-2 py-5 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      borderColor: '#FECACA',
                      backgroundColor: '#FEF2F2',
                      color: '#EF4444',
                    }}
                  >
                    Bilmayman
                  </button>
                  <button
                    type="button"
                    onClick={() => onCardAction(true)}
                    className="rounded-[14px] border-2 py-5 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      borderColor: '#BBF7D0',
                      backgroundColor: '#F0FDF4',
                      color: '#22C55E',
                    }}
                  >
                    Bilaman
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-[20px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
                  Kartochkalar tugallandi
                </p>
                <div className="mt-4 flex flex-col gap-3 items-center">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', color: '#166534' }}
                  >
                    <span>🟢</span>
                    Biladi: {knownCount}
                  </div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: '#FECACA', backgroundColor: '#FEF2F2', color: '#B91C1C' }}
                  >
                    <span>🔴</span>
                    Bilmaydi: {unknownCount}
                  </div>
                  {step1SaveError ? (
                    <p className="max-w-sm text-center text-sm text-red-600">
                      {step1SaveError}. Internet yoki serverni tekshirib, sahifani yangilab qayta urinib
                      ko‘ring.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`${partUrl}/test`)}
                  className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
                >
                  Davom etish
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'test' && (
          <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
            {currentTest ? (
              <>
                <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
                  {testIndex + 1} / {testQuestions.length} savol
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((testIndex + 1) / testQuestions.length) * 100}%`,
                      backgroundColor: '#6366F1',
                    }}
                  />
                </div>

                <div
                  className="mt-6 rounded-[20px] border bg-white p-8 text-center shadow-md"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                    So&apos;zni tarjimasini tanlang
                  </p>
                  <p className="mt-4 text-3xl font-bold" style={{ color: '#0F172A' }}>
                    {currentTest.uzbek}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {currentTest.options.map((opt) => {
                    const isSelected = testSelected === opt;
                    const isCorrect = testSelected && opt === currentTest.correct;
                    const isWrong = isSelected && testSelected !== currentTest.correct;
                    const baseCls = 'w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium transition-all duration-200';
                    const cls = isCorrect
                      ? `${baseCls} border-[#22C55E] bg-[#F0FDF4] text-[#166534]`
                      : isWrong
                        ? `${baseCls} border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]`
                        : testSelected
                          ? `${baseCls} border-[#E2E8F0] bg-white text-[#64748B] opacity-80`
                          : `${baseCls} border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-sm`;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!testSelected}
                        onClick={() => onTestChoose(opt)}
                        className={cls}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {testSelected && (
                  <button
                    type="button"
                    onClick={onTestNext}
                    className="mt-6 w-full rounded-[14px] py-4 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ backgroundColor: '#6366F1' }}
                  >
                    Keyingi savol →
                  </button>
                )}
              </>
            ) : (
              <div
                className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
                style={{ borderColor: '#E2E8F0' }}
              >
                {(() => {
                  // Important: while the backend result is still loading,
                  // `effectiveStepsState` may already exist but contain stale/zero values.
                  // In that case prefer local counters (they are final once the test is finished).
                  const savedStep2Completed = effectiveStepsState?.step2.completed ?? false;
                  const savedCorrect = savedStep2Completed ? effectiveStepsState?.step2.correct : undefined;
                  const savedIncorrect = savedStep2Completed ? effectiveStepsState?.step2.incorrect : undefined;
                  const savedPercentage = savedStep2Completed ? effectiveStepsState?.step2.percentage : undefined;
                  const savedPassed = savedStep2Completed ? effectiveStepsState?.step2.passed : undefined;

                  const localCorrect = testCorrect;
                  const localIncorrect = Math.max(0, testQuestions.length - testCorrect);
                  const correct = savedCorrect ?? localCorrect;
                  const incorrect = savedIncorrect ?? localIncorrect;
                  const total = correct + incorrect;

                  const percentage =
                    savedPercentage ??
                    (total > 0 ? Math.round((correct / total) * 100) : 0);
                  const passed = savedPassed ?? percentage >= 80;

                  return (
                    <>
                      <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
                        Test tugallandi
                      </p>

                      <div
                        className="mt-4 flex flex-col gap-3 items-center"
                        style={{ width: '100%' }}
                      >
                        <div
                          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                          style={{
                            borderColor: '#BBF7D0',
                            backgroundColor: '#F0FDF4',
                            color: '#166534',
                          }}
                        >
                          <span>🟢</span>
                          To‘g‘ri: {correct}
                        </div>

                        <div
                          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                          style={{
                            borderColor: '#FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#B91C1C',
                          }}
                        >
                          <span>🔴</span>
                          Noto‘g‘ri: {incorrect}
                        </div>

                        <div
                          className="rounded-xl border px-4 py-2 text-sm font-semibold"
                          style={{
                            borderColor: passed ? '#BBF7D0' : '#FECACA',
                            backgroundColor: passed ? '#F0FDF4' : '#FEF2F2',
                            color: passed ? '#166534' : '#B91C1C',
                          }}
                        >
                          Natija: {percentage}% {passed ? '— O‘tdi' : '— O‘tmadi'}
                        </div>

                      {pointsEarnedMessage != null && (
                        <p className="mt-2 text-base font-semibold" style={{ color: '#0F172A' }}>
                          Siz {pointsEarnedMessage} ball oldingiz! Barakalla!
                        </p>
                      )}

                        {!passed && (
                          <div className="text-xs font-medium" style={{ color: '#64748B' }}>
                            Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (passed) {
                            navigate(`${partUrl}/pairs`);
                            return;
                          }

                          // Retry: reset local test state
                          setStep2Submitted(false);
                          setTestIndex(0);
                          setTestSelected(null);
                          setTestCorrect(0);
                        }}
                        className="mt-6 w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
                        style={{ backgroundColor: passed ? '#6366F1' : '#EF4444' }}
                      >
                        {passed ? 'Davom etish' : 'Qayta urinish'}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {mode === 'pairs' && (
          <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
            <style>{`
              @keyframes pair-shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-6px); }
                40% { transform: translateX(6px); }
                60% { transform: translateX(-4px); }
                80% { transform: translateX(4px); }
              }
              .pair-shake { animation: pair-shake 0.5s ease-in-out; }
            `}</style>
            {currentGroup ? (
              <>
                <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
                  Guruh {pairGroupIndex + 1} / {pairGroups.length}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pairGroups.length > 0 ? ((pairGroupIndex + 1) / pairGroups.length) * 100 : 0}%`,
                      backgroundColor: '#6366F1',
                    }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {currentGroup.left.map((left) => {
                      const done = matched.includes(left.id);
                      const selected = pairSelectedLeft === left.id;
                      const isWrong = wrongPairIds?.includes(left.id);
                      const cardCls = `w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition-all duration-200 ${done ? 'border-[#22C55E] bg-[#F0FDF4] text-[#166534] cursor-default' : isWrong ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] pair-shake' : selected ? 'border-[#6366F1] bg-[#EEF2FF] text-[#0F172A]' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-md'}`;
                      return (
                        <button
                          key={left.id}
                          type="button"
                          disabled={done}
                          onClick={() => onPickLeft(left.id)}
                          className={cardCls}
                        >
                          {left.text}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-3">
                    {currentGroup.right.map((right) => {
                      const done = matched.includes(right.id);
                      const isWrong = wrongPairIds?.includes(right.id);
                      const cardCls = `w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition-all duration-200 ${done ? 'border-[#22C55E] bg-[#F0FDF4] text-[#166534] cursor-default' : isWrong ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] pair-shake' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-md'}`;
                      return (
                        <button
                          key={right.id}
                          type="button"
                          disabled={done}
                          onClick={() => onPickRight(right.id)}
                          className={cardCls}
                        >
                          {right.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {pairMessage && (
                  <p className="mt-4 text-center text-sm font-medium" style={{ color: pairMessage.includes("To'g'ri") ? '#166534' : '#B91C1C' }}>
                    {pairMessage}
                  </p>
                )}

                {isGroupDone && (
                  <div className="mt-8">
                    <p className="text-center text-xl font-semibold" style={{ color: '#0F172A' }}>
                      Ajoyib!
                    </p>
                    <button
                      type="button"
                      onClick={onNextGroup}
                      className="mt-4 w-full rounded-[14px] py-4 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ backgroundColor: '#6366F1' }}
                    >
                      {pairGroupIndex + 1 === pairGroups.length ? 'Tugatish' : 'Keyingi guruh →'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div
                className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
                style={{ borderColor: '#E2E8F0' }}
              >
                <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
                  Juftliklar tugallandi
                </p>
                {pointsEarnedMessage != null && (
                  <p className="mt-3 text-base font-semibold text-emerald-600">
                    Siz {pointsEarnedMessage} ball oldingiz! Barakalla!
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => navigate(partUrl)}
                  className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
                >
                  Davom etish
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
