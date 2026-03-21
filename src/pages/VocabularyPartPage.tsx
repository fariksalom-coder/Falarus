import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getSubtopicContent } from '../data/vocabularyContent';
import {
  setLastPartId,
  getPartResultCount,
  setPartResultCount,
  getStageStatus,
  setStageStatus,
  getFlashcardStepCounts,
  setFlashcardStepCounts,
} from '../utils/vocabProgress';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useResolvedVocabularySubtopicId } from '../hooks/useResolvedVocabularySubtopicId';
import { canAccessVocabularySubtopicRoute } from '../utils/vocabularyAccess';
import { postVocabularyMatchFinish, postVocabularyTestFinish } from '../api/vocabulary';
import { useVocabularyWordGroup } from '../features/vocabulary/hooks/useVocabularyWordGroup';
import { buildBlockHubViewModel } from '../features/vocabulary/blockHubModel';
import { VocabularyTaskList } from '../components/vocabulary/VocabularyTaskList';
import { VocabularyFlashcardExercise } from '../components/vocabulary/exercises/VocabularyFlashcardExercise';
import { VocabularyTestExercise } from '../components/vocabulary/exercises/VocabularyTestExercise';
import {
  VocabularyPairsExercise,
  buildPairGroups,
  type PairGroupView,
} from '../components/vocabulary/exercises/VocabularyPairsExercise';
import {
  buildTestQuestions,
  groupEntriesForPairs,
} from '../components/vocabulary/vocabExerciseUtils';

type Mode = 'cards' | 'test' | 'pairs';

export default function VocabularyPartPage() {
  const navigate = useNavigate();
  const { topicId, subtopicId, partId, mode: modeParam } = useParams();
  const { token, awardPoints } = useAuth();
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

  const {
    wordGroupId,
    tasksStatus,
    serverStepsState,
    effectiveStepsState,
    fetchSteps,
    submitStep1,
    submitStep2,
    refetchTasks,
  } = useVocabularyWordGroup({
    token,
    resolvedSubtopicId: resolvedId ?? null,
    partId: part?.id,
  });

  const mode: Mode | null =
    modeParam === 'cards' || modeParam === 'test' || modeParam === 'pairs' ? modeParam : null;
  const isExerciseScreen = mode !== null;
  const partUrl =
    topicId && subtopicId && partId
      ? `/vocabulary/${topicId}/${subtopicId}/${partId}`
      : '';

  const [pointsEarnedMessage, setPointsEarnedMessage] = useState<number | null>(null);
  const step1BackfillFailedGroupIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (content?.topicId && content?.subtopicId && part?.id) {
      setLastPartId(content.topicId, content.subtopicId, part.id);
    }
  }, [content?.topicId, content?.subtopicId, part?.id]);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (!token || wordGroupId == null) return;
    if (getStageStatus(content.topicId, content.subtopicId, part.id, 'cards') !== 'completed') {
      return;
    }
    const local = getFlashcardStepCounts(content.topicId, content.subtopicId, part.id);
    if (!local) return;

    const serverSum =
      (serverStepsState?.step1.known ?? 0) + (serverStepsState?.step1.unknown ?? 0);
    if (serverSum > 0) return;
    if (step1BackfillFailedGroupIdsRef.current.has(wordGroupId)) return;

    let cancelled = false;
    void (async () => {
      try {
        await submitStep1(token, wordGroupId, local.known, local.unknown);
        if (cancelled) return;
        await refetchTasks();
        await fetchSteps(token, wordGroupId);
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
    serverStepsState?.step1.known,
    serverStepsState?.step1.unknown,
    submitStep1,
    refetchTasks,
    fetchSteps,
  ]);

  const testQuestions = useMemo(
    () => (part ? buildTestQuestions(part.entries) : []),
    [part]
  );

  const pairGroups: PairGroupView[] = useMemo(
    () => (part ? buildPairGroups(groupEntriesForPairs(part.entries)) : []),
    [part]
  );

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
            await submitStep1(token, wordGroupId, knownCount, unknownCount);
            await refetchTasks();
            await fetchSteps(token, wordGroupId);
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
    submitStep1,
    refetchTasks,
    fetchSteps,
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
            const result = await postVocabularyTestFinish(
              token,
              wordGroupId,
              testCorrect,
              testQuestions.length
            );
            setPointsEarnedMessage(result?.points_awarded && result.points_awarded > 0 ? result.points_awarded : null);
            awardPoints(result?.points_awarded ?? 0);
            await refetchTasks();
            await fetchSteps(token, wordGroupId);
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
    awardPoints,
    fetchSteps,
    refetchTasks,
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
        void postVocabularyMatchFinish(token, wordGroupId, correctPairs).then((result) => {
          if (result) {
            setPointsEarnedMessage(result.points_awarded > 0 ? result.points_awarded : null);
            awardPoints(result.points_awarded ?? 0);
            void refetchTasks();
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
    token,
    wordGroupId,
    step3Submitted,
    awardPoints,
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
          <div
            className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
            style={{ borderColor: '#E2E8F0' }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#F1F5F9' }}
            >
              <Lock className="h-7 w-7" style={{ color: '#94A3B8' }} />
            </div>
            <p className="mt-4 text-xl font-semibold" style={{ color: '#0F172A' }}>
              2-bosqich (test) qulflangan
            </p>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
              Testni boshlash uchun avval 1-bosqichni tugatishingiz kerak.
            </p>
            <button
              type="button"
              onClick={() => navigate(`${partUrl}/cards`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
            >
              1-bosqichga o‘tish
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
          <div
            className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
            style={{ borderColor: '#E2E8F0' }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#FEF2F2' }}
            >
              <Lock className="h-7 w-7" style={{ color: '#EF4444' }} />
            </div>
            <p className="mt-4 text-xl font-semibold" style={{ color: '#0F172A' }}>
              3-bosqich (juftini topish) qulflangan
            </p>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
              Keyingi bosqich ochilishi uchun kamida 80% to‘g‘ri javob kerak.
            </p>
            <button
              type="button"
              onClick={() => navigate(`${partUrl}/test`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
            >
              Testga qaytish
            </button>
          </div>
        </main>
      </div>
    );
  }

  const blockVm = buildBlockHubViewModel({
    topicId: content.topicId,
    subtopicId: content.subtopicId,
    partId: part.id,
    partEntryCount: part.entries.length,
    tasksStatus,
    steps: effectiveStepsState,
    safeStep1Completed,
    fallbackLearnedWords: getPartResultCount(content.topicId, content.subtopicId, part.id),
    authenticated: Boolean(token),
  });

  const testSummaryFromServer =
    step2Submitted && effectiveStepsState?.step2.completed
      ? {
          correct: effectiveStepsState.step2.correct,
          incorrect: effectiveStepsState.step2.incorrect,
          percentage: Math.round(effectiveStepsState.step2.percentage),
          passed: effectiveStepsState.step2.passed,
        }
      : null;

  const onCardKnow = () => {
    setKnownCount((v) => v + 1);
    setCardFlipped(false);
    setCardIndex((i) => i + 1);
  };

  const onCardUnknown = () => {
    setUnknownCount((v) => v + 1);
    setCardFlipped(false);
    setCardIndex((i) => i + 1);
  };

  const onTestChoose = (option: string) => {
    const currentTest = testQuestions[testIndex];
    if (!currentTest || testSelected) return;
    setTestSelected(option);
    if (option === currentTest.correct) setTestCorrect((v) => v + 1);
  };

  const onTestNext = () => {
    setTestSelected(null);
    setTestIndex((i) => i + 1);
  };

  const onPickLeft = (id: string) => setPairSelectedLeft(id);
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
          onClick={() =>
            navigate(isExerciseScreen ? partUrl : `/vocabulary/${content.topicId}/${subtopicId}`)
          }
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          ← Orqaga
        </button>

        {!isExerciseScreen ? (
          <VocabularyTaskList
            partTitle={part.title}
            learnedWords={blockVm.learnedWords}
            totalWords={blockVm.totalWords}
            step1Completed={blockVm.step1Completed}
            step1KnownDisplay={blockVm.step1Known}
            step1UnknownDisplay={blockVm.step1Unknown}
            stepsState={effectiveStepsState}
            step3Completed={blockVm.step3Completed}
            onOpenStep1={() => navigate(`${partUrl}/cards`)}
            onOpenStep2={() => navigate(`${partUrl}/test`)}
            onOpenStep3={() => navigate(`${partUrl}/pairs`)}
          />
        ) : null}

        {mode === 'cards' ? (
          <VocabularyFlashcardExercise
            entries={part.entries}
            cardIndex={cardIndex}
            cardFlipped={cardFlipped}
            onToggleFlip={() => setCardFlipped((v) => !v)}
            knownCount={knownCount}
            unknownCount={unknownCount}
            step1SaveError={step1SaveError}
            onKnow={onCardKnow}
            onUnknown={onCardUnknown}
            onContinueToTest={() => navigate(`${partUrl}/test`)}
          />
        ) : null}

        {mode === 'test' ? (
          <VocabularyTestExercise
            questions={testQuestions}
            testIndex={testIndex}
            testSelected={testSelected}
            testCorrect={testCorrect}
            pointsEarnedMessage={pointsEarnedMessage}
            summaryFromServer={testSummaryFromServer}
            onChoose={onTestChoose}
            onNext={onTestNext}
            onContinueToPairs={() => navigate(`${partUrl}/pairs`)}
            onRetry={() => {
              setStep2Submitted(false);
              setTestIndex(0);
              setTestSelected(null);
              setTestCorrect(0);
              setPointsEarnedMessage(null);
            }}
          />
        ) : null}

        {mode === 'pairs' ? (
          <VocabularyPairsExercise
            pairGroups={pairGroups}
            pairGroupIndex={pairGroupIndex}
            pairSelectedLeft={pairSelectedLeft}
            matched={matched}
            pairMessage={pairMessage}
            wrongPairIds={wrongPairIds}
            pointsEarnedMessage={pointsEarnedMessage}
            onPickLeft={onPickLeft}
            onPickRight={onPickRight}
            onNextGroup={onNextPairGroup}
            onFinish={() => navigate(partUrl)}
          />
        ) : null}
      </main>
    </div>
  );
}
