/**
 * 2-dars — har bir vazifada bitta mashq turi (tanlov / gap / juftlash).
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_TWO_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  { type: 'choice', prompt: '______ студент.', options: ['Я', 'Мы', 'Они'], correct: 'Я' },
  { type: 'choice', prompt: 'Ты из Бухары. ______ работаешь?', options: ['Он', 'Ты', 'Они'], correct: 'Ты' },
  { type: 'choice', prompt: 'Азиза — врач. ______ работает в больнице.', options: ['Она', 'Он', 'Мы'], correct: 'Она' },
  { type: 'choice', prompt: 'Али и Руслан дома. ______ дома.', options: ['Он', 'Они', 'Ты'], correct: 'Они' },
  { type: 'choice', prompt: 'Мы студенты. ______ учимся.', options: ['Мы', 'Вы', 'Она'], correct: 'Мы' },
  { type: 'choice', prompt: '(Мен) → ______ из Узбекистана.', options: ['Мы', 'Вы', 'Я'], correct: 'Я' },
  { type: 'choice', prompt: '(Биз) → ______ работаем.', options: ['Мы', 'Вы', 'Она'], correct: 'Мы' },
  { type: 'choice', prompt: '(Улар) → ______ говорят по-русски.', options: ['Мы', 'Вы', 'Они'], correct: 'Они' },
  { type: 'choice', prompt: '(Сен) → ______ дома?', options: ['Мы', 'Ты', 'Она'], correct: 'Ты' },
  { type: 'choice', prompt: '(У) эркак → ______ инженер.', options: ['Мы', 'Вы', 'Он'], correct: 'Он' },
  { type: 'choice', prompt: '______ это?', options: ['Кто', 'Что', 'Где'], correct: 'Кто' },
  { type: 'choice', prompt: 'Кто он? — ______ врач.', options: ['Он', 'Она', 'Они'], correct: 'Он' },
  { type: 'choice', prompt: 'Кто она? — ______ учительница.', options: ['Он', 'Она', 'Мы'], correct: 'Она' },
  { type: 'choice', prompt: 'Кто они? — ______ инженеры.', options: ['Она', 'Они', 'Я'], correct: 'Они' },
  { type: 'choice', prompt: 'Кто ты? — ______ студент.', options: ['Я', 'Ты', 'Он'], correct: 'Я' },
  { type: 'choice', prompt: 'Кто вы? — ______ преподаватель.', options: ['Я', 'Вы', 'Они'], correct: 'Я' },
  { type: 'choice', prompt: 'Кто это? — ______ врач.', options: ['он', 'Это', 'мы'], correct: 'Это' },
  { type: 'choice', prompt: 'Кто они? — ______ студенты.', options: ['он', 'она', 'они'], correct: 'они' },
];

export const LESSON_TWO_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  { type: 'sentence', prompt: 'Gapni tuzing: Men talabaman.', words: ['студент', 'я'], correct: 'я студент' },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: U maktabda ishlaydi.',
    words: ['работает', 'он', 'в', 'школе'],
    correct: 'он работает в школе',
  },
  { type: 'sentence', prompt: 'Gapni tuzing: Biz Toshkentdanmiz.', words: ['из', 'мы', 'Ташкента'], correct: 'мы из Ташкента' },
  { type: 'sentence', prompt: 'Gapni tuzing: U uyda.', words: ['дома', 'она'], correct: 'она дома' },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Ular ruscha gapirishadi.',
    words: ['говорят', 'они', 'по-русски'],
    correct: 'они говорят по-русски',
  },
];

export const LESSON_TWO_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Я', right: 'men' },
      { left: 'Ты', right: 'sen' },
      { left: 'Мы', right: 'biz' },
      { left: 'Вы', right: 'siz' },
      { left: 'Они', right: 'ular' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Savol va javobni ulang',
    pairs: [
      { left: 'Кто он?', right: 'Он водитель' },
      { left: 'Кто она?', right: 'Она врач' },
      { left: 'Кто ты?', right: 'Я студент' },
      { left: 'Кто вы?', right: 'Мы преподаватели' },
      { left: 'Кто они?', right: 'Они инженеры' },
    ],
  },
];

/** Tartib: 1) tanlov, 2) juftlash, 3) gap — barcha 1–10-darslar uchun bir xil. */
export const LESSON_TWO_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_TWO_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Juftini toping', tasks: LESSON_TWO_VAZIFA_MATCHING },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Gapni tuzing', tasks: LESSON_TWO_VAZIFA_SENTENCE },
];

export function getLessonTwoVazifaConfig(vazifaId: number) {
  return LESSON_TWO_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
