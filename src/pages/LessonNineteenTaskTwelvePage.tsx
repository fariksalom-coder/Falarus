import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Завтра мы … в цирк.',
    options: ['пойдём', 'пойдёте', 'пойдут'],
    correct: 'пойдём',
  },
  {
    type: 'choice',
    prompt: 'В субботу вы … в музей.',
    options: ['пойдёте', 'пойдём', 'пойдут'],
    correct: 'пойдёте',
  },
  {
    type: 'choice',
    prompt: 'Завтра я с другом … в театр.',
    options: ['пойдёте', 'пойдём', 'пойдут'],
    correct: 'пойдём',
  },
  {
    type: 'choice',
    prompt: 'Ты … после уроков в книжный магазин?',
    options: ['пойдёшь', 'пойдём', 'пойдёт'],
    correct: 'пойдёшь',
  },
  {
    type: 'choice',
    prompt: 'Послезавтра она и Саша … на выставку.',
    options: ['пойдёт', 'пойдём', 'пойдут'],
    correct: 'пойдут',
  },
  {
    type: 'choice',
    prompt: 'Вечером брат … на стадион.',
    options: ['пойдёт', 'пойдёте', 'пойдут'],
    correct: 'пойдёт',
  },
  {
    type: 'choice',
    prompt: 'Летом многие студенты-иностранцы … домой на родину.',
    options: ['поедут', 'поедем', 'поедешь'],
    correct: 'поедут',
  },
  {
    type: 'choice',
    prompt: 'В июне мы с другом … в путешествие по Европе.',
    options: ['поедете', 'поедем', 'поедут'],
    correct: 'поедем',
  },
  {
    type: 'choice',
    prompt: 'Скоро наша группа … в Санкт-Петербург.',
    options: ['поедет', 'поедем', 'поедут'],
    correct: 'поедет',
  },
  {
    type: 'choice',
    prompt: 'Завтра вы … на базу отдыха за город.',
    options: ['поедете', 'поедем', 'поедут'],
    correct: 'поедете',
  },
  {
    type: 'choice',
    prompt: 'Через месяц мой друг … за визой в Москву.',
    options: ['поедет', 'поедем', 'поедут'],
    correct: 'поедет',
  },
  {
    type: 'choice',
    prompt: 'Через неделю я … в гости к моим друзьям в другой город.',
    options: ['поеду', 'поедет', 'поедем'],
    correct: 'поеду',
  },
];

export default function LessonNineteenTaskTwelvePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
