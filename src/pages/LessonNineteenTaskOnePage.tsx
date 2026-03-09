import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я … в аудиторию.', options: ['иду', 'идёшь', 'идут'], correct: 'иду' },
  { type: 'choice', prompt: 'Мой друг … в столовую.', options: ['иду', 'идёт', 'идём'], correct: 'идёт' },
  { type: 'choice', prompt: 'Наши друзья … в театр.', options: ['идём', 'идёте', 'идут'], correct: 'идут' },
  { type: 'choice', prompt: 'Мы … в библиотеку.', options: ['идём', 'идут', 'идёшь'], correct: 'идём' },
  { type: 'choice', prompt: 'Ты … в общежитие.', options: ['иду', 'идёшь', 'идёт'], correct: 'идёшь' },
  { type: 'choice', prompt: 'Куда вы … ?', options: ['идёте', 'идём', 'идут'], correct: 'идёте' },
  { type: 'choice', prompt: 'Они … в музей.', options: ['идём', 'идут', 'идёте'], correct: 'идут' },
  { type: 'choice', prompt: 'Куда … Юля и Таня?', options: ['идёшь', 'идёт', 'идут'], correct: 'идут' },
  { type: 'choice', prompt: 'Я думаю, что они … в ресторан.', options: ['иду', 'идёт', 'идут'], correct: 'идут' },
  { type: 'choice', prompt: 'Куда … Виктор?', options: ['идёшь', 'идёт', 'идут'], correct: 'идёт' },
  { type: 'choice', prompt: 'Он … на занятия.', options: ['иду', 'идёт', 'идём'], correct: 'идёт' },
  { type: 'choice', prompt: 'А ты тоже … на занятия?', options: ['идёшь', 'идёт', 'иду'], correct: 'идёшь' },
  { type: 'choice', prompt: 'Да, я тоже … туда.', options: ['иду', 'идёт', 'идём'], correct: 'иду' },
  { type: 'choice', prompt: 'Куда вы … ?', options: ['идёте', 'идут', 'идём'], correct: 'идёте' },
  { type: 'choice', prompt: 'Мы … в кино.', options: ['идём', 'идут', 'идёте'], correct: 'идём' },
  { type: 'choice', prompt: 'А почему не … Таня?', options: ['иду', 'идёт', 'идём'], correct: 'идёт' },
  { type: 'choice', prompt: 'Ты … в столовую?', options: ['идёшь', 'идёт', 'иду'], correct: 'идёшь' },
  { type: 'choice', prompt: 'Сейчас я … домой.', options: ['иду', 'идём', 'идут'], correct: 'иду' },

  { type: 'choice', prompt: 'Он часто … на стадион.', options: ['ходит', 'ходим', 'ходишь'], correct: 'ходит' },
  { type: 'choice', prompt: 'Каждую субботу моя сестра … в театр.', options: ['хожу', 'ходит', 'ходим'], correct: 'ходит' },
  { type: 'choice', prompt: 'Они часто … в парк.', options: ['ходят', 'ходим', 'ходишь'], correct: 'ходят' },
  { type: 'choice', prompt: 'Каждое воскресенье я … в церковь.', options: ['хожу', 'ходит', 'ходим'], correct: 'хожу' },
  { type: 'choice', prompt: 'Ты часто … в библиотеку?', options: ['ходишь', 'ходим', 'ходят'], correct: 'ходишь' },
  { type: 'choice', prompt: 'Обычно я … туда раз в неделю.', options: ['хожу', 'ходит', 'ходим'], correct: 'хожу' },
  { type: 'choice', prompt: 'Каждый день я вижу, как ты … в парк.', options: ['ходишь', 'ходит', 'ходим'], correct: 'ходишь' },
  { type: 'choice', prompt: 'Да, обычно я … туда утром.', options: ['хожу', 'ходит', 'ходим'], correct: 'хожу' },
  { type: 'choice', prompt: 'А вы куда … по утрам?', options: ['ходите', 'ходим', 'ходят'], correct: 'ходите' },
  { type: 'choice', prompt: 'Мы обычно … на стадион.', options: ['ходим', 'ходите', 'ходят'], correct: 'ходим' },
];

export default function LessonNineteenTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
