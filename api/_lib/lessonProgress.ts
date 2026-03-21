// This file is used by Vercel API handlers in `api/_lib/lessons.ts`.
// Lesson completion is derived from `lesson_task_results` + static `LESSONS` catalog.
export {
  getUserCompletedLessonsCount,
  recordFullLessonPassInTaskResults,
  syncUserLessonProgressPercent,
} from '../../server/services/lessonProgressSnapshot.service.js';
