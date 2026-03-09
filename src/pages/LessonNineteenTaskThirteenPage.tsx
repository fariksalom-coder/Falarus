import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Мы идём в театр.',
    words: ['завтра', 'мы', 'пойдём', 'в', 'театр', 'идём', 'ходим'],
    correct: 'Завтра мы пойдём в театр.',
  },
  {
    type: 'sentence',
    prompt: 'Студенты едут на экскурсию.',
    words: ['завтра', 'студенты', 'поедут', 'на', 'экскурсию', 'едут', 'ездят'],
    correct: 'Завтра студенты поедут на экскурсию.',
  },
  {
    type: 'sentence',
    prompt: 'Мама идёт на рынок.',
    words: ['завтра', 'мама', 'пойдёт', 'на', 'рынок', 'идёт', 'ходит'],
    correct: 'Завтра мама пойдёт на рынок.',
  },
  {
    type: 'sentence',
    prompt: 'Мой друг едет в аэропорт.',
    words: ['скоро', 'мой', 'друг', 'поедет', 'в', 'аэропорт', 'едет', 'ездит'],
    correct: 'Скоро мой друг поедет в аэропорт.',
  },
  {
    type: 'sentence',
    prompt: 'Дети идут в зоопарк.',
    words: ['послезавтра', 'дети', 'пойдут', 'в', 'зоопарк', 'идут', 'ходят'],
    correct: 'Послезавтра дети пойдут в зоопарк.',
  },
  {
    type: 'sentence',
    prompt: 'Ты едешь в гости.',
    words: ['через', 'неделю', 'ты', 'поедешь', 'в', 'гости', 'едешь', 'ездишь'],
    correct: 'Через неделю ты поедешь в гости.',
  },
  {
    type: 'sentence',
    prompt: 'Вы идёте на стадион.',
    words: ['сегодня', 'вечером', 'вы', 'пойдёте', 'на', 'стадион', 'идёте', 'ходите'],
    correct: 'Сегодня вечером вы пойдёте на стадион.',
  },
];

export default function LessonNineteenTaskThirteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
