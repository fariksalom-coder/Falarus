import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Они — Иордания',
    words: ['они', 'он', 'живут', 'в', 'Иордании', 'Индии', 'работает'],
    correct: 'Они живут в Иордании.',
  },
  {
    type: 'sentence',
    prompt: 'Он — Китай',
    words: ['он', 'она', 'живёт', 'в', 'Китае', 'Японии', 'работает'],
    correct: 'Он живёт в Китае.',
  },
  {
    type: 'sentence',
    prompt: 'Мария — Франция',
    words: ['Мария', 'мы', 'живёт', 'во', 'Франции', 'Италии', 'работает'],
    correct: 'Мария живёт во Франции.',
  },
  {
    type: 'sentence',
    prompt: 'Мы — Канада',
    words: ['мы', 'они', 'живём', 'в', 'Канаде', 'Мексике', 'учимся'],
    correct: 'Мы живём в Канаде.',
  },
  {
    type: 'sentence',
    prompt: 'Анвар — Россия',
    words: ['Анвар', 'он', 'живёт', 'в', 'России', 'Корее', 'работает'],
    correct: 'Анвар живёт в России.',
  },
  {
    type: 'sentence',
    prompt: 'Они — Корея',
    words: ['они', 'мы', 'живут', 'в', 'Корее', 'Японии', 'работают'],
    correct: 'Они живут в Корее.',
  },
  {
    type: 'sentence',
    prompt: 'Сами — Мексика',
    words: ['Сами', 'он', 'живёт', 'в', 'Мексике', 'Китае', 'работает'],
    correct: 'Сами живёт в Мексике.',
  },
  {
    type: 'sentence',
    prompt: 'Мы — Италия',
    words: ['мы', 'они', 'живём', 'в', 'Италии', 'Франции', 'работаем'],
    correct: 'Мы живём в Италии.',
  },
  {
    type: 'sentence',
    prompt: 'Он — Вьетнам',
    words: ['он', 'она', 'живёт', 'во', 'Вьетнаме', 'Китае', 'работает'],
    correct: 'Он живёт во Вьетнаме.',
  },
  {
    type: 'sentence',
    prompt: 'Они — Япония',
    words: ['они', 'мы', 'живут', 'в', 'Японии', 'Корее', 'учатся'],
    correct: 'Они живут в Японии.',
  },
];

export default function LessonTwentyTwoTaskSevenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" lessonPath="/lesson-22" taskNumber={7} />;
}
