import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Дети … гулять в парк.', options: ['идёшь', 'идёте', 'идут'], correct: 'идут' },
  { type: 'choice', prompt: 'Интересно, куда это вы … ?', options: ['идём', 'идёте', 'идут'], correct: 'идёте' },
  { type: 'choice', prompt: 'Она не любит … пешком.', options: ['ходит', 'ходим', 'ходить'], correct: 'ходить' },
  { type: 'choice', prompt: '— Вы часто … в бассейн?', options: ['ходим', 'ходите', 'ходить'], correct: 'ходите' },
  { type: 'choice', prompt: '— Да, мы часто … в бассейн.', options: ['ходим', 'ходите', 'ходить'], correct: 'ходим' },
  { type: 'choice', prompt: '— Он давно не … на занятия.', options: ['ходит', 'ходим', 'ходите'], correct: 'ходит' },
  { type: 'choice', prompt: 'Завтра мы … на экскурсию.', options: ['едут', 'едете', 'едем'], correct: 'едем' },
  { type: 'choice', prompt: 'Дети … на автобусе в цирк.', options: ['едут', 'едете', 'едем'], correct: 'едут' },
  { type: 'choice', prompt: 'Вы с нами … в Невьянск?', options: ['едем', 'едете', 'едут'], correct: 'едете' },
  { type: 'choice', prompt: 'Брат … в банк.', options: ['еду', 'едешь', 'едет'], correct: 'едет' },
  { type: 'choice', prompt: '— Ты сейчас … на работу?', options: ['еду', 'едешь', 'едет'], correct: 'едешь' },
  { type: 'choice', prompt: '— Да, я … туда на машине.', options: ['еду', 'едешь', 'едет'], correct: 'еду' },
  { type: 'choice', prompt: '— Летом мы часто … в гости к бабушке.', options: ['ездите', 'ездим', 'ездить'], correct: 'ездим' },
  { type: 'choice', prompt: '— А вы … туда на машине?', options: ['ездите', 'ездим', 'ездить'], correct: 'ездите' },
  { type: 'choice', prompt: '— Да. Только наши дети не любят … туда.', options: ['ездите', 'ездим', 'ездить'], correct: 'ездить' },
  { type: 'choice', prompt: '— Света, ты … с нами в магазин?', options: ['ходишь', 'идёшь', 'ходим'], correct: 'идёшь' },
  { type: 'choice', prompt: '— Почему вы спрашиваете? Я всегда … с вами.', options: ['ходим', 'хожу', 'идём'], correct: 'хожу' },
  { type: 'choice', prompt: 'Раньше мой брат всегда … на работу пешком.', options: ['ходит', 'ходил', 'ездил'], correct: 'ходил' },
  { type: 'choice', prompt: 'А сейчас он часто … туда на машине.', options: ['ходит', 'ездил', 'ездит'], correct: 'ездит' },
  { type: 'choice', prompt: 'Мы часто … на разные экскурсии.', options: ['идём', 'ездим', 'едем'], correct: 'ездим' },
];

export default function LessonTwentyTaskFivePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" />;
}
