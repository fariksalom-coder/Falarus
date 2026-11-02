import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import type { VocabularyEntry } from '../data/vocabularyContent';
import { dailyWordsToEntries } from '../utils/dailyVocabEntries';
import { patchDailyVocabProgress } from '../utils/dailyVocabProgress';
import { playFlipSound } from '../utils/sound';
import { VocabularyFlashcardExercise } from '../components/vocabulary/exercises/VocabularyFlashcardExercise';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';

export default function DailyVocabTanishishPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const { patchDay } = useKunlikProgress();
  const hubPath = `/kunlik-reja/kun/${dayNumber}/lugat`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);

  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const savedStep1Ref = useRef(false);

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
      const words = bundle.vocabulary?.words ?? [];
      const mapped = dailyWordsToEntries(words);
      setEntries(mapped);
      if (mapped.length === 0) {
        setError(words.length === 0 ? t('kunlik.noVocabRows') : t('kunlik.wordsShapeInvalid'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    savedStep1Ref.current = false;
    setCardIndex(0);
    setCardFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
  }, [entries]);

  useEffect(() => {
    if (entries.length === 0 || cardIndex < entries.length || savedStep1Ref.current) return;
    savedStep1Ref.current = true;
    patchDailyVocabProgress(dayNumber, {
      step1Completed: true,
      step1Known: knownCount,
      step1Unknown: unknownCount,
    });
    patchDay(dayNumber, { words_learned: knownCount });
  }, [cardIndex, entries.length, dayNumber, knownCount, unknownCount, patchDay]);

  const handleBack = () => navigate(hubPath);

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-slate-700">Sahifa topilmadi.</p>
      </div>
    );
  }

  if (gatePending) {
    return <KunlikSequentialGateSpinner />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || entries.length === 0) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-950">{error ?? t('common.noData')}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            {t('common.back')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="grammar-theme min-h-screen pb-28">
      <main className="mx-auto max-w-[720px] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[#DDD7F5] bg-white text-[#2D1B69] shadow-[0_4px_10px_rgba(91,76,224,0.08)]"
            aria-label={t('common.back')}
          >
            ‹
          </button>
          <p className="grammar-heading flex-1 text-[16px] leading-none text-[#2D1B69]">
            Lug'at · Tanishish
          </p>
        </div>

        <VocabularyFlashcardExercise
          entries={entries}
          cardIndex={cardIndex}
          cardFlipped={cardFlipped}
          onToggleFlip={() => {
            playFlipSound();
            setCardFlipped((v) => !v);
          }}
          knownCount={knownCount}
          unknownCount={unknownCount}
          step1SaveError={null}
          onKnow={() => {
            setKnownCount((v) => v + 1);
            setCardFlipped(false);
            setCardIndex((i) => i + 1);
          }}
          onUnknown={() => {
            setUnknownCount((v) => v + 1);
            setCardFlipped(false);
            setCardIndex((i) => i + 1);
          }}
          onContinueToTest={() => navigate(`/kunlik-reja/kun/${dayNumber}/lugat/test`)}
        />
      </main>
    </div>
  );
}
