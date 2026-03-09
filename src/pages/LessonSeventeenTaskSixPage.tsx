import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас я ______ с учителем.', options: ['говорю', 'скажу'], correct: 'говорю' },
  { type: 'choice', prompt: 'Потом я ______ вам правду.', options: ['говорю', 'скажу'], correct: 'скажу' },
  { type: 'choice', prompt: 'Сейчас он ______ по телефону.', options: ['говорит', 'скажет'], correct: 'говорит' },
  { type: 'choice', prompt: 'Через минуту он ______ вам ответ.', options: ['говорит', 'скажет'], correct: 'скажет' },
  { type: 'choice', prompt: 'Сейчас мы ______ по-русски.', options: ['говорим', 'скажем'], correct: 'говорим' },
  { type: 'choice', prompt: 'Потом мы ______ учителю об этом.', options: ['говорим', 'скажем'], correct: 'скажем' },
  { type: 'choice', prompt: 'Сейчас она ______ с подругой.', options: ['говорит', 'скажет'], correct: 'говорит' },
  { type: 'choice', prompt: 'Вечером она ______ ему об этом.', options: ['говорит', 'скажет'], correct: 'скажет' },
  { type: 'choice', prompt: 'Сейчас студенты ______ по-русски.', options: ['говорят', 'скажут'], correct: 'говорят' },
  { type: 'choice', prompt: 'Потом студенты ______ ответ учителю.', options: ['говорят', 'скажут'], correct: 'скажут' },

  {
    type: 'sentence',
    prompt: "Men hozir o‘qituvchi bilan gaplashyapman.",
    words: ['я', 'говорю', 'с', 'учителем', 'сейчас', 'скажу'],
    correct: 'Я сейчас говорю с учителем.',
  },
  {
    type: 'sentence',
    prompt: 'Men keyin sizga haqiqatni aytaman.',
    words: ['я', 'скажу', 'вам', 'правду', 'потом', 'говорю'],
    correct: 'Я потом скажу вам правду.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir telefon orqali gaplashyapti.',
    words: ['он', 'говорит', 'по', 'телефону', 'сейчас', 'скажет'],
    correct: 'Он сейчас говорит по телефону.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin javob aytadi.',
    words: ['он', 'скажет', 'ответ', 'потом', 'говорит'],
    correct: 'Он потом скажет ответ.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir rus tilida gaplashyapmiz.',
    words: ['мы', 'говорим', 'по-русски', 'сейчас', 'скажем'],
    correct: 'Мы сейчас говорим по-русски.',
  },
  {
    type: 'sentence',
    prompt: 'Biz keyin o‘qituvchiga aytamiz.',
    words: ['мы', 'скажем', 'учителю', 'потом', 'говорим'],
    correct: 'Мы потом скажем учителю.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir dugonasi bilan gaplashyapti.',
    words: ['она', 'говорит', 'с', 'подругой', 'сейчас', 'скажет'],
    correct: 'Она сейчас говорит с подругой.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin unga aytadi.',
    words: ['она', 'скажет', 'ему', 'потом', 'говорит'],
    correct: 'Она потом скажет ему.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar hozir rus tilida gaplashyapti.',
    words: ['студенты', 'говорят', 'по-русски', 'сейчас', 'скажут'],
    correct: 'Студенты сейчас говорят по-русски.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar keyin o‘qituvchiga javob aytadi.',
    words: ['студенты', 'скажут', 'ответ', 'учителю', 'потом', 'говорят'],
    correct: 'Студенты потом скажут ответ учителю.',
  },
];

export default function LessonSeventeenTaskSixPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" />;
}
