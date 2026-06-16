import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAILY_PLAN_PROGRESS_MODE } from '../config/dailyPlanProgress';
import { useSequentialLesson } from '../context/SequentialLessonContext';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { findFirstIncompletePlanDay, readPlanReviewVisits } from '../utils/kunlikPlanDayProgress';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { useKunlikProgress } from './useKunlikProgress';
import { FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';

/** Kunlik sahifalarida bir xil kutish ko‘rinishi */
export function KunlikSequentialGateSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      <p className="text-center text-sm font-medium text-slate-500">Reja yuklanmoqda…</p>
    </div>
  );
}

/**
 * Ketma-ket ochilish: oldingi kun 100% tugamagan bo‘lsa, keyingi kun URL bilan ham ochilmaydi.
 * Obunasiz foydalanuvchi faqat 1–FREE_KUNLIK_DAY_LIMIT kunlarga kira oladi.
 * `enabled=false` — noto‘g‘ri parametrlar (hook har doim chaqiriladi).
 */
export function useKunlikSequentialGate(dayNumber: number, enabled = true) {
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const navigate = useNavigate();
  const { results, isReady } = useSequentialLesson();
  const { rows: kunlikRows, loaded: kunlikLoaded, practicePromptCountByDay } = useKunlikProgress();

  const [reviewVisits, setReviewVisits] = useState(readPlanReviewVisits);
  const [vocabTick, setVocabTick] = useState(0);

  useEffect(() => {
    if (DAILY_PLAN_PROGRESS_MODE !== 'live') return;
    const sync = () => setReviewVisits(readPlanReviewVisits());
    window.addEventListener('storage', sync);
    window.addEventListener('lesson-task-saved', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lesson-task-saved', sync);
    };
  }, []);

  useEffect(() => {
    const onVocab = () => setVocabTick((n) => n + 1);
    window.addEventListener('daily-vocab-progress', onVocab as EventListener);
    return () => window.removeEventListener('daily-vocab-progress', onVocab as EventListener);
  }, []);

  void vocabTick;

  const premium = Boolean(access?.subscription_active);

  const firstIncompleteDay = useMemo(
    () => findFirstIncompletePlanDay(results, reviewVisits, kunlikRows, practicePromptCountByDay),
    [results, reviewVisits, kunlikRows, practicePromptCountByDay, vocabTick],
  );

  const maxAllowedDay = premium
    ? firstIncompleteDay
    : Math.min(firstIncompleteDay, FREE_KUNLIK_DAY_LIMIT);

  const bootstrapReady = Boolean(token && isReady && kunlikLoaded && accessLoaded);
  const dayAllowed = dayNumber <= maxAllowedDay;

  useEffect(() => {
    if (!enabled || !bootstrapReady) return;
    if (dayAllowed) return;

    if (!premium && dayNumber > FREE_KUNLIK_DAY_LIMIT) {
      navigate('/tariflar', { replace: true });
      return;
    }

    navigate(kunlikRejaPath(maxAllowedDay), { replace: true });
  }, [enabled, bootstrapReady, dayAllowed, dayNumber, maxAllowedDay, navigate, premium]);

  const gatePending = Boolean(enabled && token && (!bootstrapReady || !dayAllowed));

  return { gatePending };
}
