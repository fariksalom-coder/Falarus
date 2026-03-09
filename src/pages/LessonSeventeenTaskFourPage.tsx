import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас я ______ за кофе.', options: ['плачу', 'заплачу'], correct: 'плачу' },
  { type: 'choice', prompt: 'Через минуту я ______ за кофе.', options: ['плачу', 'заплачу'], correct: 'заплачу' },
  { type: 'choice', prompt: 'Каждый месяц он ______ за квартиру.', options: ['платит', 'заплатит'], correct: 'платит' },
  { type: 'choice', prompt: 'Сегодня он ______ за билет.', options: ['платит', 'заплатит'], correct: 'заплатит' },
  { type: 'choice', prompt: 'Сейчас мы ______ за обед.', options: ['платим', 'заплатим'], correct: 'платим' },
  { type: 'choice', prompt: 'Через час мы ______ за заказ.', options: ['платим', 'заплатим'], correct: 'заплатим' },
  { type: 'choice', prompt: 'Сейчас она ______ за такси.', options: ['платит', 'заплатит'], correct: 'платит' },
  { type: 'choice', prompt: 'Вечером она ______ за интернет.', options: ['платит', 'заплатит'], correct: 'заплатит' },
  { type: 'choice', prompt: 'Сейчас студенты ______ за учебники.', options: ['платят', 'заплатят'], correct: 'платят' },
  { type: 'choice', prompt: 'Завтра студенты ______ за курс.', options: ['платят', 'заплатят'], correct: 'заплатят' },

  {
    type: 'sentence',
    prompt: "Men hozir kofe uchun to‘layapman.",
    words: ['я', 'плачу', 'за', 'кофе', 'сейчас', 'заплачу'],
    correct: 'Я сейчас плачу за кофе.',
  },
  {
    type: 'sentence',
    prompt: "Men hozircha to‘layman.",
    words: ['я', 'заплачу', 'сейчас', 'плачу', 'за', 'это'],
    correct: 'Я сейчас заплачу за это.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir taksi uchun to‘layapti.',
    words: ['он', 'платит', 'за', 'такси', 'сейчас', 'заплатит'],
    correct: 'Он сейчас платит за такси.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin chipta uchun to‘laydi.',
    words: ['он', 'заплатит', 'за', 'билет', 'потом', 'платит'],
    correct: 'Он потом заплатит за билет.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir tushlik uchun to‘layapmiz.',
    words: ['мы', 'платим', 'за', 'обед', 'сейчас', 'заплатим'],
    correct: 'Мы сейчас платим за обед.',
  },
  {
    type: 'sentence',
    prompt: 'Biz keyin buyurtma uchun to‘laymiz.',
    words: ['мы', 'заплатим', 'за', 'заказ', 'потом', 'платим'],
    correct: 'Мы потом заплатим за заказ.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir internet uchun to‘layapti.',
    words: ['она', 'платит', 'за', 'интернет', 'сейчас', 'заплатит'],
    correct: 'Она сейчас платит за интернет.',
  },
  {
    type: 'sentence',
    prompt: 'U kechqurun internet uchun to‘laydi.',
    words: ['она', 'заплатит', 'за', 'интернет', 'вечером', 'платит'],
    correct: 'Она вечером заплатит за интернет.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar hozir kitoblar uchun to‘layapti.',
    words: ['студенты', 'платят', 'за', 'книги', 'сейчас', 'заплатят'],
    correct: 'Студенты сейчас платят за книги.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar ertaga kurs uchun to‘laydi.',
    words: ['студенты', 'заплатят', 'за', 'курс', 'завтра', 'платят'],
    correct: 'Студенты завтра заплатят за курс.',
  },
];

export default function LessonSeventeenTaskFourPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" />;
}
