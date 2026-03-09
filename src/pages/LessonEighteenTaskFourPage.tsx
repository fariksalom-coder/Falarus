import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Iltimos, meni kutib turing.',
    words: ['подожди', 'меня', 'пожалуйста', 'жди', 'ждал'],
    correct: 'Подожди меня, пожалуйста.',
  },
  {
    type: 'sentence',
    prompt: 'Meni kutma.',
    words: ['не', 'жди', 'меня', 'подожди', 'ждал'],
    correct: 'Не жди меня.',
  },
  {
    type: 'sentence',
    prompt: 'Meni bekatda kut.',
    words: ['жди', 'меня', 'на', 'остановке', 'подожди', 'ждал'],
    correct: 'Жди меня на остановке.',
  },
  {
    type: 'sentence',
    prompt: "Bizga o‘zing haqida aytib ber.",
    words: ['расскажи', 'нам', 'о', 'себе', 'рассказывай', 'рассказал'],
    correct: 'Расскажи нам о себе.',
  },
  {
    type: 'sentence',
    prompt: 'Ularga bu haqda aytma.',
    words: ['не', 'рассказывай', 'им', 'об', 'этом', 'расскажи'],
    correct: 'Не рассказывай им об этом.',
  },
  {
    type: 'sentence',
    prompt: 'Sekin gapir.',
    words: ['рассказывай', 'медленно', 'расскажи', 'сказал'],
    correct: 'Рассказывай медленно.',
  },
  {
    type: 'sentence',
    prompt: 'Kitoblarni javonga qo‘y.',
    words: ['поставь', 'книги', 'на', 'полку', 'ставь', 'поставил'],
    correct: 'Поставь книги на полку.',
  },
  {
    type: 'sentence',
    prompt: 'Kitoblarni javonga qo‘yma.',
    words: ['не', 'ставь', 'книги', 'на', 'полку', 'поставь'],
    correct: 'Не ставь книги на полку.',
  },
  {
    type: 'sentence',
    prompt: 'Iltimos, kitoblarni ehtiyotkorlik bilan qo‘y.',
    words: ['ставь', 'пожалуйста', 'аккуратнее', 'книги', 'поставь'],
    correct: 'Ставь, пожалуйста, аккуратнее.',
  },
  {
    type: 'sentence',
    prompt: "Tur, vaqt bo‘ldi.",
    words: ['вставай', 'пора', 'встань', 'вставал'],
    correct: 'Вставай, пора.',
  },
  {
    type: 'sentence',
    prompt: "Turma, hali erta.",
    words: ['не', 'вставай', 'ещё', 'рано', 'встань'],
    correct: 'Не вставай, ещё рано.',
  },
  {
    type: 'sentence',
    prompt: 'Ertaga ertaroq tur.',
    words: ['встань', 'завтра', 'пораньше', 'вставай', 'вставал'],
    correct: 'Встань завтра пораньше.',
  },
];

export default function LessonEighteenTaskFourPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-18" />;
}
