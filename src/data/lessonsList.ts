/** Lesson list for Dashboard — titles and icons (Uzbek). */
export type LessonStatus = 'completed' | 'in_progress' | 'locked';

export const LESSONS = [
  { id: 1, num: 1, title: 'Tanishuv', icon: '👋', path: '/lesson-1', exercisesTotal: 1 },
  { id: 2, num: 2, title: 'Kishilik olmoshi', icon: '👤', path: '/lesson-2', exercisesTotal: 1 },
  { id: 3, num: 3, title: "So'z turkumlari", icon: '📚', path: '/lesson-3', exercisesTotal: 1 },
  { id: 4, num: 4, title: "OTlarning rodi", icon: '🔤', path: '/lesson-4', exercisesTotal: 1 },
  { id: 5, num: 5, title: "-b bilan tugaydigan so'zlar", icon: '✏️', path: '/lesson-5', exercisesTotal: 1 },
  { id: 6, num: 6, title: "Chey? Chya? Chyö?", icon: '❓', path: '/lesson-6', exercisesTotal: 1 },
  { id: 7, num: 7, title: "Sifat so'z turkumi", icon: '📝', path: '/lesson-7', exercisesTotal: 1 },
  { id: 8, num: 8, title: "Ko'plik shakli", icon: '🔢', path: '/lesson-8', exercisesTotal: 1 },
  { id: 9, num: 9, title: 'Takrorlash', icon: '🔄', path: '/lesson-9', exercisesTotal: 1 },
  { id: 10, num: 10, title: 'Infinitiv', icon: '♾️', path: '/lesson-10', exercisesTotal: 1 },
  { id: 11, num: 11, title: 'Hozirgi zamon', icon: '⏱️', path: '/lesson-11', exercisesTotal: 16 },
  { id: 12, num: 12, title: "-ова-, -ева- fe'llari", icon: '📖', path: '/lesson-12', exercisesTotal: 1 },
  { id: 13, num: 13, title: "-ться fe'llari", icon: '🔗', path: '/lesson-13', exercisesTotal: 1 },
  { id: 14, num: 14, title: "Noto'g'ri fe'llar", icon: '⚠️', path: '/lesson-14', exercisesTotal: 16 },
  { id: 15, num: 15, title: "O'tgan zamon", icon: '📅', path: '/lesson-15', exercisesTotal: 8 },
  { id: 16, num: 16, title: 'Kelasi zamon', icon: '🔮', path: '/lesson-16', exercisesTotal: 3 },
  { id: 17, num: 17, title: "Fe'lning tugallangan va tugallanmagan shakli", icon: '🔄', path: '/lesson-17', exercisesTotal: 17 },
  { id: 18, num: 18, title: "Fe'llarning buyruq shakli", icon: '📢', path: '/lesson-18', exercisesTotal: 5 },
  { id: 19, num: 19, title: "Fe'llar harakati", icon: '🚶', path: '/lesson-19', exercisesTotal: 16 },
  { id: 20, num: 20, title: 'Takrorlash', icon: '🔄', path: '/lesson-20', exercisesTotal: 7 },
  { id: 21, num: 21, title: 'Kelishiklar', icon: '🔀', path: '/lesson-21', exercisesTotal: 1 },
  { id: 22, num: 22, title: 'Predlojniy padej', icon: '📐', path: '/lesson-22', exercisesTotal: 12 },
  { id: 23, num: 23, title: 'Predloglar В va НА + Predlojniy padej', icon: '📍', path: '/lesson-23', exercisesTotal: 2 },
  { id: 24, num: 24, title: 'Sifatlar va tartib sonlar predlojniy padejda', icon: '🔢', path: '/lesson-24', exercisesTotal: 4 },
] as const;

export const TOTAL_LESSONS = LESSONS.length;

/** Get status for lesson index (0-based). completedCount = number of fully completed lessons. */
export function getLessonStatus(lessonIndex: number, completedCount: number): LessonStatus {
  if (lessonIndex < completedCount) return 'completed';
  if (lessonIndex === completedCount) return 'in_progress';
  return 'locked';
}

/** Get exercises done for display. Mock: completed = all, in_progress = 2, locked = 0. */
export function getLessonExercisesDone(status: LessonStatus, exercisesTotal: number): number {
  if (status === 'completed') return exercisesTotal;
  if (status === 'in_progress') return Math.min(2, exercisesTotal);
  return 0;
}
