import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Как тебя ______?', options: ['зовёшь', 'зовут', 'зову', 'зовёт'], correct: 'зовут' },
  { type: 'choice', prompt: 'Я ______ тебя на праздник.', options: ['зовёшь', 'зовёт', 'зову', 'зовут'], correct: 'зову' },
  { type: 'choice', prompt: 'Почему ты не ______ меня?', options: ['зовёшь', 'зову', 'зовём', 'зовут'], correct: 'зовёшь' },
  { type: 'choice', prompt: 'Нас часто ______ друзья в гости.', options: ['зовёт', 'зовут', 'зову', 'зовёшь'], correct: 'зовут' },
  { type: 'choice', prompt: 'Он ______ сестру домой.', options: ['зовут', 'зовёт', 'зову', 'зовёте'], correct: 'зовёт' },
  {
    type: 'matching',
    prompt: 'Juftini toping (звать)',
    pairs: [
      { left: 'Я ______ тебя завтра.', right: 'зову' },
      { left: 'Ты ______ меня по имени?', right: 'зовёшь' },
      { left: 'Его ______ Анвар.', right: 'зовут' },
      { left: 'Мы ______ вас на встречу.', right: 'зовём' },
      { left: 'Они ______ учителя.', right: 'зовут' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Meni Aziz deb chaqirishadi.', words: ['меня', 'зовут', 'Азиз', 'зову', 'мы', 'часто'], correct: 'меня зовут Азиз' },
  { type: 'sentence', prompt: "Tarjima qiling: Men seni tug'ilgan kunimga chaqiraman.", words: ['я', 'зову', 'тебя', 'на день рождения', 'зовёшь', 'он'], correct: 'я зову тебя на день рождения' },
  { type: 'sentence', prompt: 'Tarjima qiling: U hozir bolani chaqiryapti.', words: ['он', 'сейчас', 'зовёт', 'ребёнка', 'зовут', 'я'], correct: 'он сейчас зовёт ребёнка' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen meni nega chaqirmayapsan?', words: ['ты', 'почему', 'не', 'зовёшь', 'меня', 'зову'], correct: 'почему ты не зовёшь меня?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ularni maktabga chaqirishdi.', words: ['их', 'зовут', 'в школу', 'зовёт', 'мы', 'сегодня'], correct: 'их зовут в школу' },
];

export default function LessonFourteenTaskEightPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} />;
}
