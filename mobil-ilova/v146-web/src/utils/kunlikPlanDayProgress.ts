import type { KunlikDayProgress } from '../api/kunlikProgress';
import {
  DAILY_PLAN_PROGRESS_MODE,
  DAILY_PLAN_REVIEW_STORAGE_KEY,
} from '../config/dailyPlanProgress';
import { DAILY_PLAN, TOTAL_DAYS, type DayBlock, type DayPlan } from '../data/dailyPlan';

export function readPlanReviewVisits(): Record<number, true> {
  if (DAILY_PLAN_PROGRESS_MODE !== 'live') return {};
  try {
    return JSON.parse(localStorage.getItem(DAILY_PLAN_REVIEW_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Lokal (brauzerdagi) yakunlanish belgisi. Grammatika, lug'at va matn bloklari
 * uchun faqat bazadagi holatga ishonamiz (`serverDone`) — lokal kesh eskirib,
 * blokni noto'g'ri «bajarilgan» ko'rsatib qo'yardi. Shuning uchun bu yerda
 * faqat takrorlash bloki hisobga olinadi.
 */
function isBlockDoneLocallyForPlan(
  block: DayBlock,
  reviewVisits: Record<number, true>,
  day: number,
): boolean {
  if (DAILY_PLAN_PROGRESS_MODE !== 'live') return false;
  if (block.kind !== 'review') return false;
  return Boolean(reviewVisits[day]);
}

/** Kunlik kun tartibidagi bosqichlar: reja bloklari (matnsiz) + o‘qish + gapirish (bosh sahifa va statistik widget bilan bir xil). */
export type KunlikQuestSlice = {
  blocksForGrid: DayBlock[];
  readingDone: boolean;
  speakingDone: boolean;
  /** 5-blok: ustoz bilan jonli savol-javob. */
  suhbatDone: boolean;
  /** Gapirish uchun mashqlar yo‘q bo‘lsa (`practiceTaskCount === 0`) slot hisoblanmaydi */
  done: number;
  total: number;
};

/**
 * `practiceTaskCount`: gapirish topshiriqlari soni (shu kun uchun DB). `0` — slot yo‘q.
 */
export function getKunlikQuestProgressSlice(
  day: DayPlan,
  reviewVisits: Record<number, true>,
  serverDone: (dayNum: number, blockKind: string) => boolean,
  kunlikRow: KunlikDayProgress | undefined,
  practiceTaskCount?: number | null,
): KunlikQuestSlice {
  const blocksForGrid = day.blocks.filter((b) => b.kind !== 'text');
  const readingDone = serverDone(day.day, 'text');

  const pt = practiceTaskCount ?? 0;
  const speakingExcluded = pt === 0;
  const speakingDone = !speakingExcluded && (kunlikRow?.speaking_level ?? 0) >= pt;

  const blocksDoneCount = blocksForGrid.filter(
    (block) =>
      isBlockDoneLocallyForPlan(block, reviewVisits, day.day) ||
      serverDone(day.day, block.kind),
  ).length;

  const speakingSlotTotal = speakingExcluded ? 0 : 1;
  const speakingSlotDone = speakingExcluded ? 0 : speakingDone ? 1 : 0;

  /*
   * 5-BLOK — ustoz bilan savol-javob. Kun shu bloksiz yopilmaydi, shuning
   * uchun ketma-ket ochilish hisobiga ham kiradi. Belgi faqat bazadan
   * o'qiladi (`suhbat_done`); lokal keshga ishonilmaydi.
   */
  const suhbatDone = kunlikRow?.suhbat_done === true;

  const total = blocksForGrid.length + 1 + speakingSlotTotal + 1;
  const done = blocksDoneCount + (readingDone ? 1 : 0) + speakingSlotDone + (suhbatDone ? 1 : 0);

  return {
    blocksForGrid,
    readingDone,
    speakingDone,
    suhbatDone,
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
function computeDayPlanQuestProgress(
  day: DayPlan,
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practiceTaskCount?: number | null,
): { done: number; total: number } {
  const serverDone = buildPlanServerDoneChecker(kunlikRows);
  const slice = getKunlikQuestProgressSlice(
    day,
    reviewVisits,
    serverDone,
    kunlikRows.get(day.day),
    practiceTaskCount,
  );
  return { done: slice.done, total: slice.total };
}

/** Birinchi to‘liq bajarilmagan kun raqami; barchasi tugasa — TOTAL_DAYS qoladi */
export function findFirstIncompletePlanDay(
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practicePromptCountByDay?: Map<number, number> | null,
): number {
  let firstIncomplete = TOTAL_DAYS;
  for (const day of DAILY_PLAN) {
    const pt = practicePromptCountByDay?.get(day.day) ?? 0;
    const p = computeDayPlanQuestProgress(day, reviewVisits, kunlikRows, pt);
    if (!(p.done >= p.total) && firstIncomplete === TOTAL_DAYS) firstIncomplete = day.day;
  }
  return firstIncomplete;
}

export function allPlanDaysComplete(
  reviewVisits: Record<number, true>,
  kunlikRows: Map<number, KunlikDayProgress>,
  practicePromptCountByDay?: Map<number, number> | null,
): boolean {
  return DAILY_PLAN.every((day) => {
    const pt = practicePromptCountByDay?.get(day.day) ?? 0;
    const p = computeDayPlanQuestProgress(day, reviewVisits, kunlikRows, pt);
    return p.total > 0 && p.done >= p.total;
  });
}
