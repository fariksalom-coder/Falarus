import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я часто ______ эту песню дома.', options: ['поёшь', 'пою', 'поёт', 'поют'], correct: 'пою' },
  { type: 'choice', prompt: 'Почему ты не ______ сегодня?', options: ['поёшь', 'пою', 'поём', 'поёт'], correct: 'поёшь' },
  { type: 'choice', prompt: 'Мы обычно ______ гимн перед матчем.', options: ['поют', 'поём', 'поёте', 'поёт'], correct: 'поём' },
  { type: 'choice', prompt: 'Она сейчас ______ новую песню.', options: ['пою', 'поют', 'поёт', 'поёшь'], correct: 'поёт' },
  { type: 'choice', prompt: 'Дети громко ______ в классе.', options: ['поёт', 'поёшь', 'поют', 'пою'], correct: 'поют' },
  {
    type: 'matching',
    prompt: 'Juftini toping (петь)',
    pairs: [
      { left: 'Я не ______ на сцене.', right: 'пою' },
      { left: 'Ты хорошо ______?', right: 'поёшь' },
      { left: 'Он ______ эту песню каждый день.', right: 'поёт' },
      { left: 'Мы ______ вместе.', right: 'поём' },
      { left: 'Они ______ очень красиво.', right: 'поют' },
    ],
  },
  { type: 'sentence', prompt: "Tarjima qiling: Men sahnada qo'shiq aytmayman.", words: ['я', 'не', 'пою', 'на сцене', 'поёшь', 'мы'], correct: 'я не пою на сцене' },
  { type: 'sentence', prompt: "Tarjima qiling: U hozir yangi qo'shiq aytyapti.", words: ['она', 'сейчас', 'поёт', 'новую песню', 'поют', 'я'], correct: 'она сейчас поёт новую песню' },
  { type: 'sentence', prompt: "Tarjima qiling: Biz har kuni birga qo'shiq aytamiz.", words: ['мы', 'каждый день', 'поём', 'вместе', 'поют', 'ты'], correct: 'мы каждый день поём вместе' },
  { type: 'sentence', prompt: "Tarjima qiling: Sen nega qo'shiq aytmayapsan?", words: ['ты', 'почему', 'не', 'поёшь', 'пою', 'меня'], correct: 'почему ты не поёшь?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular maktabda gimn aytishadi.', words: ['они', 'поют', 'гимн', 'в школе', 'поёт', 'мы'], correct: 'они поют гимн в школе' },
];

export default function LessonFourteenTaskNinePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} />;
}
