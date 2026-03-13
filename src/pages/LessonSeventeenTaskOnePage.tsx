import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Завтра я ______ домашнее задание.', options: ['делаю', 'сделаю'], correct: 'сделаю' },
  { type: 'choice', prompt: 'Сейчас я ______ домашнее задание.', options: ['делаю', 'сделаю'], correct: 'делаю' },
  { type: 'choice', prompt: 'Завтра он ______ работу.', options: ['делает', 'сделает'], correct: 'сделает' },
  { type: 'choice', prompt: 'Сейчас она ______ проект.', options: ['делает', 'сделает'], correct: 'делает' },
  { type: 'choice', prompt: 'Вечером мы ______ это задание.', options: ['делаем', 'сделаем'], correct: 'сделаем' },
  { type: 'choice', prompt: 'Сейчас мы ______ работу.', options: ['делаем', 'сделаем'], correct: 'делаем' },
  { type: 'choice', prompt: 'Завтра они ______ всё быстро.', options: ['делают', 'сделают'], correct: 'сделают' },
  { type: 'choice', prompt: 'Сейчас они ______ ремонт.', options: ['делают', 'сделают'], correct: 'делают' },
  { type: 'choice', prompt: 'Через час я ______ это.', options: ['делаю', 'сделаю'], correct: 'сделаю' },
  { type: 'choice', prompt: 'Каждый день он ______ упражнения.', options: ['делает', 'сделает'], correct: 'делает' },

  {
    type: 'sentence',
    prompt: 'Men hozir uy vazifasini qilyapman.',
    words: ['я', 'делаю', 'домашнее', 'задание', 'сейчас', 'сделаю'],
    correct: 'Я сейчас делаю домашнее задание.',
  },
  {
    type: 'sentence',
    prompt: 'Men ertaga bu ishni qilaman.',
    words: ['я', 'сделаю', 'эту', 'работу', 'завтра', 'делаю'],
    correct: 'Я завтра сделаю эту работу.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir loyiha qilayapti.',
    words: ['он', 'делает', 'проект', 'сейчас', 'сделает'],
    correct: 'Он сейчас делает проект.',
  },
  {
    type: 'sentence',
    prompt: 'U ertaga vazifani qiladi.',
    words: ['она', 'сделает', 'задание', 'завтра', 'делает'],
    correct: 'Она завтра сделает задание.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir ish qilyapmiz.',
    words: ['мы', 'делаем', 'работу', 'сейчас', 'сделаем'],
    correct: 'Мы сейчас делаем работу.',
  },
  {
    type: 'sentence',
    prompt: 'Biz ertaga hamma ishni qilamiz.',
    words: ['мы', 'сделаем', 'всю', 'работу', 'завтра', 'делаем'],
    correct: 'Мы завтра сделаем всю работу.',
  },
  {
    type: 'sentence',
    prompt: 'Ular hozir remont qilayapti.',
    words: ['они', 'делают', 'ремонт', 'сейчас', 'сделают'],
    correct: 'Они сейчас делают ремонт.',
  },
  {
    type: 'sentence',
    prompt: 'Ular ertaga hammasini qiladi.',
    words: ['они', 'сделают', 'всё', 'завтра', 'делают'],
    correct: 'Они завтра сделают всё.',
  },
  {
    type: 'sentence',
    prompt: 'Men har kuni mashq qilaman.',
    words: ['я', 'делаю', 'упражнения', 'каждый', 'день', 'сделаю'],
    correct: 'Я каждый день делаю упражнения.',
  },
  {
    type: 'sentence',
    prompt: 'Men bu ishni tez qilaman.',
    words: ['я', 'сделаю', 'эту', 'работу', 'быстро', 'делаю'],
    correct: 'Я быстро сделаю эту работу.',
  },
];

export default function LessonSeventeenTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={1} />;
}
