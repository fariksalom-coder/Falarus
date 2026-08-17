/**
 * DailyVocabPhrasesPage — lug'atning 4-vazifasi: ibora testlari.
 *
 * Juftlik topishdan KEYIN ochiladi: qulf mezoni — juftlik bajarilgani
 * (`words_match` yoki lokal `step3Completed`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import type { DailyPhraseMcq } from '../../shared/dailyCourseDay';
import { loadDailyVocabProgress, patchDailyVocabProgress } from '../utils/dailyVocabProgress';
import {
  answerDailyPhrase,
  finishDailyPhrases,
  startDailyPhrases,
} from '../api/kunlikProgress';
import {
  VocabularyPhraseExercise,
  type PhraseVerdict,
} from '../components/vocabulary/exercises/VocabularyPhraseExercise';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { playCorrectSound, playWrongSound } from '../utils/sound';

export default function DailyVocabPhrasesPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const { getDay } = useKunlikProgress();
  const hubPath = `/kunlik-reja/kun/${dayNumber}/lugat`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<DailyPhraseMcq[]>([]);

  const [index, setIndex] = useState(0);
  /** Serverning joriy savol bo'yicha hukmi (javob kaliti brauzerda yo'q). */
  const [verdict, setVerdict] = useState<PhraseVerdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  /** Server tasdiqlagan yakuniy natija. */
  const [serverResult, setServerResult] = useState<{ correct: number; total: number } | null>(null);
  /** Yakunlangach serverdan kelgan umumiy XP va o'rin. */
  const [standing, setStanding] = useState<{ points: number; rank: number | null } | null>(null);
  const savedRef = useRef(false);

  const [progress, setProgress] = useState(() => loadDailyVocabProgress(dayNumber));
  useEffect(() => {
    setProgress(loadDailyVocabProgress(dayNumber));
  }, [dayNumber]);

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
      const rows = [...(bundle.vocabulary?.phrases ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setPhrases(rows);
      if (rows.length === 0) setError('Bu kunda ibora testlari hali qo‘shilmagan.');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setPhrases([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Yangi urinish: serverdagi eski javoblarni tozalaymiz. */
  const resetAttempt = useCallback(async () => {
    savedRef.current = false;
    setIndex(0);
    setVerdict(null);
    setChecking(false);
    setAnswerError('');
    setCorrectCount(0);
    setServerResult(null);
    setStanding(null);
    if (phrases.length > 0) {
      try {
        await startDailyPhrases(token, dayNumber);
      } catch {
        /* tozalanmasa ham javoblar qayta yozilaveradi */
      }
    }
  }, [phrases.length, token, dayNumber]);

  useEffect(() => {
    void resetAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases]);

  /**
   * Yakunlash: ballni SERVER o'zi qayd etgan javoblardan sanaydi — klient
   * hech qanday son yubormaydi.
   */
  const persistIfNeeded = useCallback(async () => {
    if (savedRef.current || phrases.length === 0) return;
    savedRef.current = true;
    patchDailyVocabProgress(dayNumber, { step4Completed: true });
    try {
      const result = await finishDailyPhrases(token, dayNumber);
      setServerResult({ correct: result.correct, total: result.total });
      if (result.rank) setStanding({ points: result.rank.points, rank: result.rank.rank });
    } catch {
      // Tarmoq uzilsa yakuniy ekran baribir ko'rinadi; javoblar serverda
      // saqlangani uchun qayta yakunlanganda natija yoziladi.
      savedRef.current = false;
    }
  }, [dayNumber, phrases.length, token]);

  /** Javob SERVERGA yuboriladi — to'g'ri/xato ekani faqat o'shandan bilinadi. */
  const onChoose = async (optionIndex: number) => {
    if (verdict !== null || checking) return;
    const current = phrases[index];
    if (!current) return;
    setChecking(true);
    setAnswerError('');
    try {
      const res = await answerDailyPhrase(token, dayNumber, current.id, optionIndex);
      setVerdict({ choice: res.choice, correct: res.correct, correctIndex: res.correctIndex });
      if (res.correct) {
        setCorrectCount((c) => c + 1);
        playCorrectSound();
      } else {
        playWrongSound();
      }
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : 'Javob tekshirilmadi, qayta urinib ko‘ring');
    } finally {
      setChecking(false);
    }
  };

  const onNext = () => {
    setVerdict(null);
    setAnswerError('');
    setIndex((i) => i + 1);
  };

  const onFinish = () => {
    void persistIfNeeded();
    setVerdict(null);
    setIndex((i) => i + 1); // ro'yxatdan chiqadi → yakuniy ekran
  };

  const onRetry = () => {
    void resetAttempt();
  };

  const handleBack = () => navigate(hubPath);

  const serverRow = getDay(dayNumber);
  const canOpen = useMemo(
    () => progress.step3Completed || serverRow.words_match,
    [progress.step3Completed, serverRow.words_match],
  );

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-slate-700">Sahifa topilmadi.</p>
      </div>
    );
  }

  if (gatePending) return <KunlikSequentialGateSpinner />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!canOpen) {
    return (
      <div className="min-h-screen bg-app-bg">
        <main className="mx-auto max-w-[720px] px-4 py-8 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={handleBack} className="mb-6 text-sm font-medium text-slate-600">
            ← {t('common.back')}
          </button>
          <div className="rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Lock className="h-7 w-7 text-red-400" />
            </div>
            <p className="mt-4 text-xl font-semibold text-slate-900">Iboralar hali yopiq</p>
            <p className="mt-2 text-sm text-slate-600">
              Avval «Juftlikni topish» vazifasini bajaring.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/kunlik-reja/kun/${dayNumber}/lugat/juftlik`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-indigo-700"
            >
              Juftlikka qaytish
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (error || phrases.length === 0) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-950">{error ?? t('common.noData')}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
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
            Lug'at · Iboralar
          </p>
        </div>

        <VocabularyPhraseExercise
          phrases={phrases}
          index={index}
          verdict={verdict}
          checking={checking}
          errorText={answerError}
          correctCount={serverResult?.correct ?? correctCount}
          standing={standing}
          onChoose={onChoose}
          onNext={onNext}
          onFinish={onFinish}
          onRetry={onRetry}
        />
      </main>
    </div>
  );
}
