import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Сейчас она … в магазин, а я … в университет.',
    options: ['идёт / иду', 'ходит / хожу', 'идёт / ходит'],
    correct: 'идёт / иду',
  },
  {
    type: 'choice',
    prompt: 'Мой старший брат … в офис, он каждый день … туда.',
    options: ['идёт / ходит', 'ходит / идёт', 'идёт / идёт'],
    correct: 'идёт / ходит',
  },
  {
    type: 'choice',
    prompt: 'Бабушка каждую субботу … на рынок, сейчас она тоже … туда.',
    options: ['ходит / идёт', 'идёт / ходит', 'ходит / ходит'],
    correct: 'ходит / идёт',
  },
  {
    type: 'choice',
    prompt: 'Пять дней в неделю я … в университет, сегодня среда и я тоже … в университет.',
    options: ['хожу / иду', 'иду / хожу', 'хожу / хожу'],
    correct: 'хожу / иду',
  },
  {
    type: 'choice',
    prompt: 'Мой брат не каждый день … на работу, но сейчас он … туда.',
    options: ['ездит / едет', 'едет / ездит', 'ездит / ездит'],
    correct: 'ездит / едет',
  },
  {
    type: 'choice',
    prompt: 'Каждый вечер мой друг … на стадион на тренировку.',
    options: ['идёт', 'ходит', 'ходим'],
    correct: 'ходит',
  },
  {
    type: 'choice',
    prompt: 'Мы … в цирк. Моя подруга не любит … в цирк.',
    options: ['идём / ходить', 'ходим / идти', 'идём / идти'],
    correct: 'идём / ходить',
  },
  {
    type: 'choice',
    prompt: 'Мне не нравится … на трамвае.',
    options: ['ехать', 'ездить', 'еду'],
    correct: 'ездить',
  },
  {
    type: 'choice',
    prompt: 'Каждый вторник я и Юля … в бассейн.',
    options: ['идём', 'ходим', 'ходят'],
    correct: 'ходим',
  },
  {
    type: 'choice',
    prompt: 'Сейчас я … в банк. А вы часто … в банк?',
    options: ['иду / ходите', 'хожу / идёте', 'иду / идёте'],
    correct: 'иду / ходите',
  },
];

export default function LessonNineteenTaskSevenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
