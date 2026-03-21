/** Lesson list for Dashboard — titles (Russian) and icons. */
export type LessonStatus = 'completed' | 'in_progress' | 'locked';

export const LESSONS = [
  { id: 1, num: 1, title: 'Знакомство', titleUz: 'Tanishuv', titleRu: 'Знакомство', icon: '👋', path: '/lesson-1', exercisesTotal: 1 },
  { id: 2, num: 2, title: 'Личные местоимения', titleUz: 'Kishilik olmoshlari', titleRu: 'Личные местоимения', icon: '👤', path: '/lesson-2', exercisesTotal: 1 },
  { id: 3, num: 3, title: 'Части речи', titleUz: 'So‘z turkumlari', titleRu: 'Части речи', icon: '📚', path: '/lesson-3', exercisesTotal: 1 },
  { id: 4, num: 4, title: 'Род существительных', titleUz: 'Otlarning jinsi', titleRu: 'Род существительных', icon: '🔤', path: '/lesson-4', exercisesTotal: 1 },
  { id: 5, num: 5, title: 'Слова на -ь', titleUz: 'Yumshoq belgili so‘zlar', titleRu: 'Слова на -ь', icon: '✏️', path: '/lesson-5', exercisesTotal: 1 },
  { id: 6, num: 6, title: 'Чей? Чья? Чьё?', titleUz: 'Kimniki?', titleRu: 'Чей? Чья? Чьё?', icon: '❓', path: '/lesson-6', exercisesTotal: 1 },
  { id: 7, num: 7, title: 'Имя прилагательное', titleUz: 'Sifat', titleRu: 'Имя прилагательное', icon: '📝', path: '/lesson-7', exercisesTotal: 1 },
  { id: 8, num: 8, title: 'Множественное число', titleUz: 'Ko‘plik', titleRu: 'Множественное число', icon: '🔢', path: '/lesson-8', exercisesTotal: 1 },
  { id: 9, num: 9, title: 'Повторение', titleUz: 'Takrorlash', titleRu: 'Повторение', icon: '🔄', path: '/lesson-9', exercisesTotal: 1 },
  { id: 10, num: 10, title: 'Инфинитив', titleUz: 'Infinitiv', titleRu: 'Инфинитив', icon: '♾️', path: '/lesson-10', exercisesTotal: 1 },
  { id: 11, num: 11, title: 'Настоящее время', titleUz: 'Hozirgi zamon', titleRu: 'Настоящее время', icon: '⏱️', path: '/lesson-11', exercisesTotal: 16 },
  { id: 12, num: 12, title: 'Глаголы на -ова- / -ева-', titleUz: '-ова- / -ева- fe’llari', titleRu: 'Глаголы на -ова- / -ева-', icon: '📖', path: '/lesson-12', exercisesTotal: 1 },
  { id: 13, num: 13, title: 'Глаголы на -ться', titleUz: '-ться bilan fe’llar', titleRu: 'Глаголы на -ться', icon: '🔗', path: '/lesson-13', exercisesTotal: 1 },
  { id: 14, num: 14, title: 'Неправильные глаголы', titleUz: 'Noto‘g‘ri fe’llar', titleRu: 'Неправильные глаголы', icon: '⚠️', path: '/lesson-14', exercisesTotal: 16 },
  { id: 15, num: 15, title: 'Прошедшее время', titleUz: 'O‘tgan zamon', titleRu: 'Прошедшее время', icon: '📅', path: '/lesson-15', exercisesTotal: 8 },
  { id: 16, num: 16, title: 'Будущее время', titleUz: 'Kelasi zamon', titleRu: 'Будущее время', icon: '🔮', path: '/lesson-16', exercisesTotal: 3 },
  { id: 17, num: 17, title: 'Совершенный и несовершенный вид глагола', titleUz: 'Mukammal va nomukammal fe’l turi', titleRu: 'Совершенный и несовершенный вид глагола', icon: '🔄', path: '/lesson-17', exercisesTotal: 17 },
  { id: 18, num: 18, title: 'Повелительное наклонение', titleUz: 'Buyruq mayli', titleRu: 'Повелительное наклонение', icon: '📢', path: '/lesson-18', exercisesTotal: 5 },
  { id: 19, num: 19, title: 'Глаголы движения', titleUz: 'Harakat fe’llari', titleRu: 'Глаголы движения', icon: '🚶', path: '/lesson-19', exercisesTotal: 16 },
  { id: 20, num: 20, title: 'Повторение', titleUz: 'Takrorlash', titleRu: 'Повторение', icon: '🔄', path: '/lesson-20', exercisesTotal: 7 },
  { id: 21, num: 21, title: 'Падежи', titleUz: 'Kelishiklar', titleRu: 'Падежи', icon: '🔀', path: '/lesson-21', exercisesTotal: 1 },
  { id: 22, num: 22, title: 'Предложный падеж', titleUz: 'Predlojniy kelishigi', titleRu: 'Предложный падеж', icon: '📐', path: '/lesson-22', exercisesTotal: 12 },
  { id: 23, num: 23, title: 'Предлоги В и НА + предложный падеж', titleUz: 'V va NA bilan предложный kelishigi', titleRu: 'Предлоги В и НА + предложный падеж', icon: '📍', path: '/lesson-23', exercisesTotal: 2 },
  { id: 24, num: 24, title: 'Прилагательные и порядковые числительные в предложном падеже', titleUz: 'Sifat va tartib sonlarining предложный kelishigi', titleRu: 'Прилагательные и порядковые числительные в предложном падеже', icon: '🔢', path: '/lesson-24', exercisesTotal: 4 },
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
