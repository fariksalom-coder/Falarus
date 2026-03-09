import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'Найдите пару: местоимение + форма быть',
    pairs: [
      { left: 'Я', right: 'буду' },
      { left: 'Ты', right: 'будешь' },
      { left: 'Он', right: 'будет' },
      { left: 'Мы', right: 'будем' },
      { left: 'Вы', right: 'будете' },
      { left: 'Они', right: 'будут' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Я ______ читать книгу.',
    options: ['буду', 'будет', 'будут'],
    correct: 'буду',
  },
  {
    type: 'choice',
    prompt: 'Мы ______ говорить по-русски.',
    options: ['будет', 'будем', 'будут'],
    correct: 'будем',
  },
  {
    type: 'choice',
    prompt: 'Он ______ работать завтра.',
    options: ['будет', 'будут', 'буду'],
    correct: 'будет',
  },
  {
    type: 'choice',
    prompt: 'Они ______ гулять вечером.',
    options: ['будет', 'будут', 'будем'],
    correct: 'будут',
  },
  {
    type: 'choice',
    prompt: 'Ты ______ учиться в университете.',
    options: ['будешь', 'будет', 'будут'],
    correct: 'будешь',
  },
  {
    type: 'sentence',
    prompt: "Men ertaga rus tilini o‘qiyman.",
    words: ['я', 'буду', 'читать', 'русский', 'язык', 'завтра'],
    correct: 'Я буду читать русский язык завтра.',
  },
  {
    type: 'sentence',
    prompt: 'U ertaga ishlaydi.',
    words: ['он', 'будет', 'работать', 'завтра'],
    correct: 'Он будет работать завтра.',
  },
  {
    type: 'sentence',
    prompt: 'Biz parkda sayr qilamiz.',
    words: ['мы', 'будем', 'гулять', 'в', 'парке'],
    correct: 'Мы будем гулять в парке.',
  },
  {
    type: 'sentence',
    prompt: 'Ular ertaga raqsga tushadi.',
    words: ['они', 'будут', 'танцевать', 'завтра'],
    correct: 'Они будут танцевать завтра.',
  },
  {
    type: 'sentence',
    prompt: 'Sen rus tilida gapirasan.',
    words: ['ты', 'будешь', 'говорить', 'по-русски'],
    correct: 'Ты будешь говорить по-русски.',
  },
];

export default function LessonSixteenTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-16" />;
}
