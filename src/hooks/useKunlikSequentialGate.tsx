import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAILY_PLAN_PROGRESS_MODE } from '../config/dailyPlanProgress';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { findFirstIncompletePlanDay, readPlanReviewVisits } from '../utils/kunlikPlanDayProgress';
import { xaritaYoli } from '../utils/kunlikNavigation';
import { useKunlikProgress } from './useKunlikProgress';
import { canEnterKunlikDayContent } from '../../shared/dailyCourseDay';

/** Kunlik sahifalarida bir xil kutish ko‘rinishi */
export function KunlikSequentialGateSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
      <p className="text-center text-sm font-medium text-slate-500">Reja yuklanmoqda…</p>
    </div>
  );
}

/**
 * Ketma-ket ochilish: oldingi kun 100% tugamagan bo‘lsa, keyingi kun URL bilan ham ochilmaydi.
 * Obunasiz foydalanuvchi keyingi kunlarni bosh sahifada ko‘ra oladi, lekin dars kontentiga kira olmaydi.
 * `enabled=false` — noto‘g‘ri parametrlar (hook har doim chaqiriladi).
 */
export function useKunlikSequentialGate(dayNumber: number, enabled = true) {
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const navigate = useNavigate();
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
  // OLTIN A'ZO: kunlar ketma-ketligi ham cheklamaydi — hamma kun ochiq.
  const oltin = Boolean(access?.golden);

  const maxSequentialDay = useMemo(
    () => findFirstIncompletePlanDay(reviewVisits, kunlikRows, practicePromptCountByDay),
    [reviewVisits, kunlikRows, practicePromptCountByDay, vocabTick],
  );

  const sequentiallyAllowed = oltin || dayNumber <= maxSequentialDay;
  const contentAllowed = oltin || canEnterKunlikDayContent(dayNumber, premium);
  const dayAllowed = sequentiallyAllowed && contentAllowed;

  const bootstrapReady = Boolean(token && kunlikLoaded && accessLoaded);

  useEffect(() => {
    if (!enabled || !bootstrapReady) return;
    if (dayAllowed) return;

    /*
     * Ruxsat etilmagan kunga kirilganda XARITAGA qaytariladi.
     *
     * Ilgari kunning eski sahifasiga yuborilardi. Endi ilovada bitta
     * ko'rinish bor — xarita — va o'quvchi u yerda o'zi qayerda turganini
     * darhol ko'radi.
     */
    navigate(xaritaYoli(), { replace: true });
  }, [enabled, bootstrapReady, dayAllowed, dayNumber, maxSequentialDay, navigate, sequentiallyAllowed]);

  const gatePending = Boolean(enabled && token && (!bootstrapReady || !dayAllowed));

  return { gatePending };
}
