// This file is used by Vercel API handlers in `api/_lib/lessons.ts`.
// Current Supabase DB might not have `lessons` / `exercises` tables anymore,
// so we reuse the server-side implementation that only depends on
// `lesson_task_results` + `user_progress` and the static `LESSONS` catalog.
export {
  getUserCompletedLessonsCount,
  syncUserLessonProgressPercent,
} from '../../server/services/lessonProgressSnapshot.service.js';
