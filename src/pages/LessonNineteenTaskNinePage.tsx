import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Сейчас друзья идут в театр. Вчера они тоже …',
    options: ['ходят', 'ходили', 'шли'],
    correct: 'ходили',
  },
  {
    type: 'choice',
    prompt: 'Сейчас студенты едут на занятия в университет. Вчера они тоже …',
    options: ['ездили', 'ехали', 'едут'],
    correct: 'ездили',
  },
  {
    type: 'choice',
    prompt: 'Сейчас мы едем на экскурсию. Неделю назад мы тоже …',
    options: ['ехали', 'ездили', 'ездим'],
    correct: 'ездили',
  },
  {
    type: 'choice',
    prompt: 'Сейчас он едет на стадион. Вчера он тоже …',
    options: ['ехал', 'ездил', 'едет'],
    correct: 'ездил',
  },
  {
    type: 'choice',
    prompt: 'Сегодня она идёт на выставку. В прошлое воскресенье она тоже …',
    options: ['шла', 'ходила', 'ходит'],
    correct: 'ходила',
  },
  {
    type: 'choice',
    prompt: 'Сейчас я иду обедать в кафе. Два дня назад я тоже …',
    options: ['шёл', 'ходил', 'хожу'],
    correct: 'ходил',
  },
];

export default function LessonNineteenTaskNinePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" lessonPath="/lesson-19" taskNumber={9} />;
}
