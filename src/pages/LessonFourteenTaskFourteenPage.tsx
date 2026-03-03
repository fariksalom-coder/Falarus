import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я очень ______ читать вечером.', options: ['любишь', 'люблю', 'любит', 'любят'], correct: 'люблю' },
  { type: 'choice', prompt: 'Почему ты не ______ музыку?', options: ['любишь', 'люблю', 'любим', 'любит'], correct: 'любишь' },
  { type: 'choice', prompt: 'Мы ______ проводить время с семьёй.', options: ['любят', 'любим', 'любит', 'люблю'], correct: 'любим' },
  { type: 'choice', prompt: 'Она больше ______ чай, чем кофе.', options: ['люблю', 'любишь', 'любит', 'любят'], correct: 'любит' },
  { type: 'choice', prompt: 'Они ______ путешествовать летом.', options: ['любит', 'люблю', 'любишь', 'любят'], correct: 'любят' },
  {
    type: 'matching',
    prompt: 'Juftini toping (любить)',
    pairs: [
      { left: 'Я ______ свою работу.', right: 'люблю' },
      { left: 'Ты ______ смотреть фильмы?', right: 'любишь' },
      { left: 'Он ______ спорт.', right: 'любит' },
      { left: 'Мы ______ учиться вместе.', right: 'любим' },
      { left: 'Они ______ своих родителей.', right: 'любят' },
    ],
  },
  { type: 'sentence', prompt: "Tarjima qiling: Men kechqurun kitob o'qishni yaxshi ko'raman.", words: ['я', 'люблю', 'читать', 'книги', 'вечером', 'любишь', 'мы'], correct: 'я люблю читать книги вечером' },
  { type: 'sentence', prompt: "Tarjima qiling: U sportni juda yaxshi ko'radi.", words: ['он', 'очень', 'любит', 'спорт', 'люблю', 'они'], correct: 'он очень любит спорт' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz birga ishlashni yaxshi ko\'ramiz.', words: ['мы', 'любим', 'работать', 'вместе', 'любят', 'ты'], correct: 'мы любим работать вместе' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen nega klassik musiqani yoqtirmaysan?', words: ['ты', 'почему', 'не', 'любишь', 'классическую музыку', 'люблю'], correct: 'почему ты не любишь классическую музыку?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular yozda sayohat qilishni yaxshi ko\'rishadi.', words: ['они', 'любят', 'путешествовать', 'летом', 'любит', 'мы'], correct: 'они любят путешествовать летом' },
];

export default function LessonFourteenTaskFourteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} />;
}
