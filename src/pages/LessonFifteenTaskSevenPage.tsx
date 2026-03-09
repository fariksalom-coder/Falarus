import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'есть',
    pairs: [
      { left: 'он', right: 'ел' },
      { left: 'она', right: 'ела' },
      { left: 'они', right: 'ели' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Вчера мальчик ______ суп.',
    options: ['ел', 'ела', 'ели'],
    correct: 'ел',
  },
  {
    type: 'choice',
    prompt: 'Девочка ______ яблоко.',
    options: ['ел', 'ела', 'ели'],
    correct: 'ела',
  },
  {
    type: 'choice',
    prompt: 'Дети ______ мороженое.',
    options: ['ел', 'ела', 'ели'],
    correct: 'ели',
  },
  {
    type: 'choice',
    prompt: 'Мой брат ______ хлеб с сыром.',
    options: ['ел', 'ела', 'ели'],
    correct: 'ел',
  },
  {
    type: 'choice',
    prompt: 'Моя сестра ______ салат.',
    options: ['ел', 'ела', 'ели'],
    correct: 'ела',
  },
  {
    type: 'sentence',
    prompt: "Kecha u sho‘rva yedi.",
    words: ['он', 'ел', 'суп', 'вчера', 'дома'],
    correct: 'Он ел суп вчера дома.',
  },
  {
    type: 'sentence',
    prompt: 'U olma yedi.',
    words: ['она', 'ела', 'яблоко', 'утром', 'дома'],
    correct: 'Она ела яблоко утром.',
  },
  {
    type: 'sentence',
    prompt: 'Bolalar muzqaymoq yedilar.',
    words: ['дети', 'ели', 'мороженое', 'вчера', 'вечером'],
    correct: 'Дети ели мороженое вчера вечером.',
  },
  {
    type: 'sentence',
    prompt: 'U non yedi.',
    words: ['он', 'ел', 'хлеб', 'утром', 'дома'],
    correct: 'Он ел хлеб утром дома.',
  },
  {
    type: 'sentence',
    prompt: 'U salat yedi.',
    words: ['она', 'ела', 'салат', 'вчера', 'вечером'],
    correct: 'Она ела салат вечером.',
  },

  {
    type: 'matching',
    prompt: 'сесть',
    pairs: [
      { left: 'он', right: 'сел' },
      { left: 'она', right: 'села' },
      { left: 'они', right: 'сели' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Он ______ на стул.',
    options: ['сел', 'села', 'сели'],
    correct: 'сел',
  },
  {
    type: 'choice',
    prompt: 'Девочка ______ на диван.',
    options: ['сел', 'села', 'сели'],
    correct: 'села',
  },
  {
    type: 'choice',
    prompt: 'Студенты ______ за стол.',
    options: ['сел', 'села', 'сели'],
    correct: 'сели',
  },
  {
    type: 'choice',
    prompt: 'Мой брат ______ рядом.',
    options: ['сел', 'села', 'сели'],
    correct: 'сел',
  },
  {
    type: 'choice',
    prompt: 'Моя сестра ______ на кресло.',
    options: ['сел', 'села', 'сели'],
    correct: 'села',
  },
  {
    type: 'sentence',
    prompt: "U stulga o‘tirdi.",
    words: ['он', 'сел', 'на', 'стул', 'вчера'],
    correct: 'Он сел на стул вчера.',
  },
  {
    type: 'sentence',
    prompt: 'U divanga o‘tirdi.',
    words: ['она', 'села', 'на', 'диван', 'дома'],
    correct: 'Она села на диван дома.',
  },
  {
    type: 'sentence',
    prompt: "Talabalar stolga o‘tirishdi.",
    words: ['студенты', 'сели', 'за', 'стол', 'вчера'],
    correct: 'Студенты сели за стол.',
  },
  {
    type: 'sentence',
    prompt: 'U yonimga o‘tirdi.',
    words: ['он', 'сел', 'рядом', 'со', 'мной'],
    correct: 'Он сел рядом со мной.',
  },
  {
    type: 'sentence',
    prompt: 'U kresloga o‘tirdi.',
    words: ['она', 'села', 'на', 'кресло', 'вечером'],
    correct: 'Она села на кресло вечером.',
  },

  {
    type: 'matching',
    prompt: 'идти',
    pairs: [
      { left: 'он', right: 'шёл' },
      { left: 'она', right: 'шла' },
      { left: 'они', right: 'шли' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Он ______ домой после работы.',
    options: ['шёл', 'шла', 'шли'],
    correct: 'шёл',
  },
  {
    type: 'choice',
    prompt: 'Девочка ______ в школу утром.',
    options: ['шёл', 'шла', 'шли'],
    correct: 'шла',
  },
  {
    type: 'choice',
    prompt: 'Друзья ______ в парк вечером.',
    options: ['шёл', 'шла', 'шли'],
    correct: 'шли',
  },
  {
    type: 'choice',
    prompt: 'Мой брат ______ по улице.',
    options: ['шёл', 'шла', 'шли'],
    correct: 'шёл',
  },
  {
    type: 'choice',
    prompt: 'Девушка ______ в магазин.',
    options: ['шёл', 'шла', 'шли'],
    correct: 'шла',
  },
  {
    type: 'sentence',
    prompt: 'U uyga ketayotgan edi.',
    words: ['он', 'шёл', 'домой', 'вечером', 'вчера'],
    correct: 'Он шёл домой вечером.',
  },
  {
    type: 'sentence',
    prompt: 'U maktabga ketayotgan edi.',
    words: ['она', 'шла', 'в', 'школу', 'утром'],
    correct: 'Она шла в школу утром.',
  },
  {
    type: 'sentence',
    prompt: "Do‘stlar parkga ketishdi.",
    words: ['друзья', 'шли', 'в', 'парк', 'вечером'],
    correct: 'Друзья шли в парк вечером.',
  },
  {
    type: 'sentence',
    prompt: "U ko‘cha bo‘ylab ketayotgan edi.",
    words: ['он', 'шёл', 'по', 'улице', 'вчера'],
    correct: 'Он шёл по улице.',
  },
  {
    type: 'sentence',
    prompt: "U do‘konga ketayotgan edi.",
    words: ['она', 'шла', 'в', 'магазин', 'вечером'],
    correct: 'Она шла в магазин вечером.',
  },
];

export default function LessonFifteenTaskSevenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-15" />;
}
