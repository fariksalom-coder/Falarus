/**
 * Kunlik reja progress manbai.
 * `placeholder` — barcha kun/bloklar bosh holatda (natijalar keyingi bosqichda API/storage bilan ulanadi).
 * `live` — grammatika (SequentialLesson), lug‘at (vocab progress), takrorlash (localStorage).
 */
export type DailyPlanProgressMode = 'placeholder' | 'live';

export const DAILY_PLAN_PROGRESS_MODE: DailyPlanProgressMode = 'live';

export const DAILY_PLAN_REVIEW_STORAGE_KEY = 'daily-plan-review-visits';
