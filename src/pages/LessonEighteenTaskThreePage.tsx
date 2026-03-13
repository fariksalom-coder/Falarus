import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Daftarlaringizni oching.',
    words: ['откройте', 'тетради', 'откроете', 'ваши'],
    correct: 'Откройте тетради.',
  },
  {
    type: 'sentence',
    prompt: 'Bugungi sanani yozing.',
    words: ['напишите', 'сегодняшнее', 'число', 'написали'],
    correct: 'Напишите сегодняшнее число.',
  },
  {
    type: 'sentence',
    prompt: 'Iltimos, diqqat bilan tinglang.',
    words: ['пожалуйста', 'слушайте', 'внимательно', 'слушаете'],
    correct: 'Пожалуйста, слушайте внимательно.',
  },
  {
    type: 'sentence',
    prompt: 'Xatoni tuzating.',
    words: ['исправьте', 'ошибку', 'исправили', 'ошибка'],
    correct: 'Исправьте ошибку.',
  },
  {
    type: 'sentence',
    prompt: "Nima yozganingizni o‘qing.",
    words: ['прочитайте', 'что', 'вы', 'написали', 'пишете'],
    correct: 'Прочитайте, что вы написали.',
  },
  {
    type: 'sentence',
    prompt: 'Baland ovozda gapiring.',
    words: ['говорите', 'громче', 'говорите', 'сказал'],
    correct: 'Говорите громче.',
  },
  {
    type: 'sentence',
    prompt: 'Daftarlaringizni yoping.',
    words: ['закройте', 'тетради', 'закрыли', 'ваши'],
    correct: 'Закройте тетради.',
  },
  {
    type: 'sentence',
    prompt: 'Matnni tinglashga tayyorlaning.',
    words: ['приготовьтесь', 'слушать', 'текст', 'приготовились'],
    correct: 'Приготовьтесь слушать текст.',
  },
  {
    type: 'sentence',
    prompt: 'Tinglang va javob bering.',
    words: ['слушайте', 'и', 'отвечайте', 'ответили'],
    correct: 'Слушайте и отвечайте.',
  },
  {
    type: 'sentence',
    prompt: "So‘zni daftarga yozing.",
    words: ['запишите', 'слово', 'в', 'тетрадь', 'записали'],
    correct: 'Запишите слово в тетрадь.',
  },
  {
    type: 'sentence',
    prompt: "So‘zni ona tilingizga tarjima qiling.",
    words: ['переведите', 'слово', 'на', 'родной', 'язык', 'переводите'],
    correct: 'Переведите слово на родной язык.',
  },
];

export default function LessonEighteenTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-18" lessonPath="/lesson-18" taskNumber={3} />;
}
