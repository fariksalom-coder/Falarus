/**
 * 3-dars — vazifa bo‘yicha bitta tur.
 */

import type { LessonOneTask } from './lessonOneTasks';

const CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  { type: 'choice', prompt: '"врач" bu —', options: ['Sifat', 'Ot', 'Fe’l'], correct: 'Ot' },
  { type: 'choice', prompt: '"красивый" bu —', options: ['Sifat', 'Ot', 'Son'], correct: 'Sifat' },
  { type: 'choice', prompt: '"читать" bu —', options: ['Ot', 'Ravish', 'Fe’l'], correct: 'Fe’l' },
  { type: 'choice', prompt: '"три" bu —', options: ['Son', 'Sifat', 'Fe’l'], correct: 'Son' },
  { type: 'choice', prompt: '"быстро" bu —', options: ['Ot', 'Ravish', 'Son'], correct: 'Ravish' },
  { type: 'choice', prompt: 'Qaysi so‘z OT?', options: ['дом', 'большой', 'читать'], correct: 'дом' },
  { type: 'choice', prompt: 'Qaysi so‘z SIFAT?', options: ['машина', 'новый', 'писать'], correct: 'новый' },
  { type: 'choice', prompt: 'Qaysi so‘z FE’L?', options: ['работать', 'студент', 'книга'], correct: 'работать' },
  { type: 'choice', prompt: 'Qaysi so‘z SON?', options: ['пять', 'тихо', 'хороший'], correct: 'пять' },
  { type: 'choice', prompt: 'Qaysi so‘z RAVISH?', options: ['быстро', 'дом', 'три'], correct: 'быстро' },
  { type: 'choice', prompt: '"учитель" — bu', options: ['Fe’l', 'Ot', 'Son'], correct: 'Ot' },
  { type: 'choice', prompt: '"медленно" — bu', options: ['Ravish', 'Ot', 'Sifat'], correct: 'Ravish' },
  { type: 'choice', prompt: '"новый дом"dagi "новый" — bu', options: ['Son', 'Sifat', 'Fe’l'], correct: 'Sifat' },
  { type: 'choice', prompt: '"писать" — bu', options: ['Fe’l', 'Ot', 'Ravish'], correct: 'Fe’l' },
  { type: 'choice', prompt: '"десять" — bu', options: ['Son', 'Ot', 'Sifat'], correct: 'Son' },
];

const SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  { type: 'sentence', prompt: 'Gapni tuzing: katta uy', words: ['большой', 'дом', 'больше', 'маленький'], correct: 'большой дом' },
  { type: 'sentence', prompt: 'Gapni tuzing: chiroyli mashina', words: ['красивая', 'красиво', 'машина', 'машины'], correct: 'красивая машина' },
  { type: 'sentence', prompt: 'Gapni tuzing: tez o‘qimoq', words: ['быстро', 'быстрый', 'читать', 'писать'], correct: 'быстро читать' },
  { type: 'sentence', prompt: 'Gapni tuzing: yaxshi talaba', words: ['хороший', 'хорошо', 'студент', 'студенты'], correct: 'хороший студент' },
  { type: 'sentence', prompt: 'Gapni tuzing: uchta kitob', words: ['три', 'книга', 'книги', 'читать'], correct: 'три книги' },
  { type: 'sentence', prompt: 'Gapni tuzing: sekin gapirmoq', words: ['медленно', 'медленный', 'говорить', 'говорит'], correct: 'медленно говорить' },
  { type: 'sentence', prompt: 'Gapni tuzing: yangi telefon', words: ['новый', 'новое', 'телефон', 'телефоны'], correct: 'новый телефон' },
  { type: 'sentence', prompt: 'Gapni tuzing: baland ovozda gapirmoq', words: ['громко', 'громкий', 'говорить', 'говорит'], correct: 'громко говорить' },
  { type: 'sentence', prompt: 'Gapni tuzing: katta maktab', words: ['большая', 'большой', 'школа', 'школы'], correct: 'большая школа' },
  { type: 'sentence', prompt: 'Gapni tuzing: beshta talaba', words: ['пять', 'студентов', 'студенты', 'учиться'], correct: 'пять студентов' },
  { type: 'sentence', prompt: 'Gapni tuzing: chiroyli qiz', words: ['красивая', 'красивый', 'девочка', 'красиво'], correct: 'красивая девочка' },
  { type: 'sentence', prompt: 'Gapni tuzing: tez yozmoq', words: ['быстро', 'быстрый', 'писать', 'письмо'], correct: 'быстро писать' },
];

const MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'красивый', right: 'красиво' },
      { left: 'быстрый', right: 'быстро' },
      { left: 'громкий', right: 'громко' },
      { left: 'медленный', right: 'медленно' },
      { left: 'хороший', right: 'хорошо' },
      { left: 'тихий', right: 'тихо' },
    ],
  },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'большой', right: 'дом' }, { left: 'быстро', right: 'читать' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'красивый', right: 'машина' }, { left: 'медленно', right: 'говорить' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'новый', right: 'студент' }, { left: 'громко', right: 'читать' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'хороший', right: 'телефон' }, { left: 'тихо', right: 'работать' }] },
];

export const LESSON_THREE_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Juftini toping', tasks: MATCHING },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Gapni tuzing', tasks: SENTENCE },
];

export function getLessonThreeVazifaConfig(vazifaId: number) {
  return LESSON_THREE_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
