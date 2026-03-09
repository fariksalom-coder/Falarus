import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас мама ______ ужин.', options: ['готовит', 'приготовит'], correct: 'готовит' },
  { type: 'choice', prompt: 'Вечером мама ______ вкусный ужин.', options: ['готовит', 'приготовит'], correct: 'приготовит' },
  { type: 'choice', prompt: 'Сейчас я ______ суп.', options: ['готовлю', 'приготовлю'], correct: 'готовлю' },
  { type: 'choice', prompt: 'Через час я ______ суп.', options: ['готовлю', 'приготовлю'], correct: 'приготовлю' },
  { type: 'choice', prompt: 'Сейчас мы ______ обед.', options: ['готовим', 'приготовим'], correct: 'готовим' },
  { type: 'choice', prompt: 'Потом мы ______ вкусный обед.', options: ['готовим', 'приготовим'], correct: 'приготовим' },
  { type: 'choice', prompt: 'Сейчас она ______ салат.', options: ['готовит', 'приготовит'], correct: 'готовит' },
  { type: 'choice', prompt: 'Через минуту она ______ салат.', options: ['готовит', 'приготовит'], correct: 'приготовит' },
  { type: 'choice', prompt: 'Сейчас студенты ______ еду.', options: ['готовят', 'приготовят'], correct: 'готовят' },
  { type: 'choice', prompt: 'Вечером студенты ______ ужин.', options: ['готовят', 'приготовят'], correct: 'приготовят' },

  {
    type: 'sentence',
    prompt: 'Onam hozir kechki ovqat tayyorlayapti.',
    words: ['мама', 'готовит', 'ужин', 'сейчас', 'приготовит'],
    correct: 'Мама сейчас готовит ужин.',
  },
  {
    type: 'sentence',
    prompt: 'Onam kechqurun mazali ovqat tayyorlaydi.',
    words: ['мама', 'приготовит', 'вкусный', 'ужин', 'вечером', 'готовит'],
    correct: 'Мама вечером приготовит вкусный ужин.',
  },
  {
    type: 'sentence',
    prompt: "Men hozir sho‘rva tayyorlayapman.",
    words: ['я', 'готовлю', 'суп', 'сейчас', 'приготовлю'],
    correct: 'Я сейчас готовлю суп.',
  },
  {
    type: 'sentence',
    prompt: 'Men keyin sho‘rva tayyorlayman.',
    words: ['я', 'приготовлю', 'суп', 'потом', 'готовлю'],
    correct: 'Я потом приготовлю суп.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir tushlik tayyorlayapmiz.',
    words: ['мы', 'готовим', 'обед', 'сейчас', 'приготовим'],
    correct: 'Мы сейчас готовим обед.',
  },
  {
    type: 'sentence',
    prompt: 'Biz keyin tushlik tayyorlaymiz.',
    words: ['мы', 'приготовим', 'обед', 'потом', 'готовим'],
    correct: 'Мы потом приготовим обед.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir salat tayyorlayapti.',
    words: ['она', 'готовит', 'салат', 'сейчас', 'приготовит'],
    correct: 'Она сейчас готовит салат.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin salat tayyorlaydi.',
    words: ['она', 'приготовит', 'салат', 'потом', 'готовит'],
    correct: 'Она потом приготовит салат.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar hozir ovqat tayyorlayapti.',
    words: ['студенты', 'готовят', 'еду', 'сейчас', 'приготовят'],
    correct: 'Студенты сейчас готовят еду.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar kechqurun ovqat tayyorlaydi.',
    words: ['студенты', 'приготовят', 'ужин', 'вечером', 'готовят'],
    correct: 'Студенты вечером приготовят ужин.',
  },
];

export default function LessonSeventeenTaskSevenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" />;
}
