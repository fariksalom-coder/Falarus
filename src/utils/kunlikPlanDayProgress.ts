import type { KunlikDayProgress } from '../api/kunlikProgress';
import {
  DAILY_PLAN_PROGRESS_MODE,
  DAILY_PLAN_REVIEW_STORAGE_KEY,
} from '../config/dailyPlanProgress';
import { DAILY_PLAN, TOTAL_DAYS, type DayBlock, type DayPlan } from '../data/dailyPlan';
import { LESSONS } from '../data/lessonsList';
import { isLessonFullyPassed } from '../lib/sequentialLessonProgress';
import { loadDailyVocabProgress } from './dailyVocabProgress';
import { getLearnedCount } from './vocabProgress';

/** SequentialLessonContext.results shape */
export type PlanLessonResults = Record<
  string,
  Record<number, { correct: number; total: number } | undefined> | undefined
>;

export function lessonExercisesTotalForPlan(lessonPath: string): number {
  return LESSONS.find((l) => l.path === lessonPath)?.exercisesTotal ?? 0;
}

export function readPlanReviewVisits(): Record<number, true> {
  if (DAILY_PLAN_PROGRESS_MODE !== 'live') return {};
  try {
    return JSON.parse(localStorage.getItem(DAILY_PLAN_REVIEW_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function isBlockDoneLocallyForPlan(
  block: DayBlock,
  results: PlanLessonResults,
  reviewVisits: Record<number, true>,
  day: number,
): boolean {
  if (DAILY_PLAN_PROGRESS_MODE !== 'live') return false;
  if (block.kind === 'grammar') {
    const total = lessonExercisesTotalForPlan(block.lessonPath);
    if (total === 0) return false;
    return isLessonFullyPassed(block.lessonPath, total, results);
  }
  if (block.kind === 'vocabulary') {
    if (getLearnedCount(block.topicId, block.subtopicId) > 0) return true;
    /** Kunlik lug‘at `/lugat/*` lug‘at progressidan boshqa — mahalliy bosqichlar va DB `words_match` */
    const dv = loadDailyVocabProgress(day);
    return dv.step3Completed || dv.step2Passed;
  }
  if (block.kind === 'text') {
    return false;
  }
  return Boolean(reviewVisits[day]);
}

/** Kunlik kun tartibidagi bosqichlar: reja bloklari (matnsiz) + o‘qish + gapirish (`DailyPlanPage` va statistik widget bilan bir xil). */
export type KunlikQuestSlice = {
  blocksForGrid: DayBlock[];
  readingDone: boolean;
  speakingDone: boolean;
  /** Gapirish uchun mashqlar yo‘q bo‘lsa (`practiceTaskCount === 0`) slot hisoblanmaydi */
  done: number;
  total: number;
};

/**
 * `practiceTaskCount`: gapirish topshiriqlari soni (shu kun uchun DB). `0` — slot yo‘q.
 */
export function getKunlikQuestProgressSlice(
  day: DayPlan,
  results: PlanLessonResults,
  reviewVisits: Record<number, true>,
  serverDone: (dayNum: number, blockKind: string) => boolean,
  kunlikRow: KunlikDayProgress | undefined,
  practiceTaskCount?: number | null,
): KunlikQuestSlice {
  const blocksForGrid = day.blocks.filter((b) => b.kind !== 'text');
  const textBlock = day.blocks.find(
    (b): b is Extract<DayBlock, { kind: 'text' }> => b.kind === 'text',
  );
  const readingDone =
    serverDone(day.day, 'text') ||
    (textBlock ? isBlockDoneLocallyForPlan(textBlock, results, reviewVisits, day.day) : false);

  const pt = practiceTaskCount ?? 0;
  const speakingExcluded = pt === 0;
  const speakingDone = !speakingExcluded && (kunlikRow?.speaking_level ?? 0) >= pt;

  const blocksDoneCount = blocksForGrid.filter(
    (block) =>
      isBlockDoneLocallyForPlan(block, results, reviewVisits, day.day) ||
      serverDone(day.day, block.kind),
  ).length;

  const speakingSlotTotal = speakingExcluded ? 0 : 1;
  const speakingSlotDone = speakingExcluded ? 0 : speakingDone ? 1 : 0;

  const total = blocksForGrid.length + 1 + speakingSlotTotal;
  const done = blocksDoneCount + (readingDone ? 1 : 0) + speakingSlotDone;

  return {
    blocksForGrid,
    readingDone,
    speakingDone,
    done,
    total,
  };
}

export function buildPlanServerDoneChecker(kunlikRows: Map<number, KunlikDayProgress>) {
  return (dayNum: number, blockKind: string): boolean => {
    const row = kunlikRows.get(dayNum);
    if (!row) return false;
    if (blockKind === 'text') return row.oqish_done;
    if (blockKind === 'grammar') return row.grammar_1 && row.grammar_2 && row.grammar_3;
    if (blockKind === 'vocabulary') return row.words_match;
    return false;
  };
}

/**
 * Kunlik kun kartochkalari bilan mos: rejadagi bloklar (matnsiz) + o‘qish + gapirish.
 * Keyingi kun ochilishini faqat rejadagi bloklar soni bilan emas, shu funksiya bilan aniqlang —
 * aks holda faqat grammatika+lug‘atdan keyin kun «yakunlangan» bo‘lib qoladi.
 */
export function computeDayPlanQuestProgress(
  day: DayPlan,
  results: PlanLessonResults,
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practiceTaskCount?: number | null,
): { done: number; total: number } {
  const serverDone = buildPlanServerDoneChecker(kunlikRows);
  const slice = getKunlikQuestProgressSlice(
    day,
    results,
    reviewVisits,
    serverDone,
    kunlikRows.get(day.day),
    practiceTaskCount,
  );
  return { done: slice.done, total: slice.total };
}

/** Birinchi to‘liq bajarilmagan kun raqami; barchasi tugasa — TOTAL_DAYS qoladi */
export function findFirstIncompletePlanDay(
  results: PlanLessonResults,
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practicePromptCountByDay?: Map<number, number> | null,
): number {
  let firstIncomplete = TOTAL_DAYS;
  for (const day of DAILY_PLAN) {
    const pt = practicePromptCountByDay?.get(day.day) ?? 0;
    const p = computeDayPlanQuestProgress(day, results, reviewVisits, kunlikRows, pt);
    if (!(p.done >= p.total) && firstIncomplete === TOTAL_DAYS) firstIncomplete = day.day;
  }
  return firstIncomplete;
}

export function isPlanDayFullyComplete(
  dayNum: number,
  results: PlanLessonResults,
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practicePromptCountByDay?: Map<number, number> | null,
): boolean {
  const day = DAILY_PLAN.find((d) => d.day === dayNum);
  if (!day) return false;
  const pt = practicePromptCountByDay?.get(dayNum) ?? 0;
  const p = computeDayPlanQuestProgress(day, results, reviewVisits, kunlikRows, pt);
  return p.total > 0 && p.done >= p.total;
}

export function allPlanDaysComplete(
  results: PlanLessonResults,
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practicePromptCountByDay?: Map<number, number> | null,
): boolean {
  return DAILY_PLAN.every((day) => {
    const pt = practicePromptCountByDay?.get(day.day) ?? 0;
    const p = computeDayPlanQuestProgress(day, results, reviewVisits, kunlikRows, pt);
    return p.total > 0 && p.done >= p.total;
  });
}
