import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я ______ суп.', options: ['ешь', 'ем', 'ест', 'едим'], correct: 'ем' },
  { type: 'choice', prompt: 'Она ______ яблоко.', options: ['ем', 'едят', 'ест', 'ешь'], correct: 'ест' },
  { type: 'choice', prompt: 'Мы ______ рис.', options: ['едим', 'ест', 'ем', 'едите'], correct: 'едим' },
  { type: 'choice', prompt: 'Ты ______ мясо?', options: ['ем', 'ешь', 'ест', 'едят'], correct: 'ешь' },
  { type: 'choice', prompt: 'Они ______ пиццу.', options: ['ест', 'едим', 'едят', 'ешь'], correct: 'едят' },
  {
    type: 'matching',
    prompt: 'Juftini toping (есть)',
    pairs: [
      { left: 'Я ______ хлеб.', right: 'ем' },
      { left: 'Ты ______ салат.', right: 'ешь' },
      { left: 'Он ______ рыбу.', right: 'ест' },
      { left: 'Мы ______ кашу.', right: 'едим' },
      { left: 'Они ______ фрукты.', right: 'едят' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Men non yeyman.', words: ['я', 'ем', 'хлеб', 'мы', 'ешь', 'сегодня'], correct: 'я ем хлеб' },
  { type: 'sentence', prompt: 'Tarjima qiling: U olma yeydi.', words: ['он', 'ест', 'яблоко', 'ем', 'они', 'вчера'], correct: 'он ест яблоко' },
  { type: 'sentence', prompt: "Tarjima qiling: Biz sho'rva yeymiz.", words: ['мы', 'едим', 'суп', 'едят', 'ты', 'сейчас'], correct: 'мы едим суп' },
  { type: 'sentence', prompt: "Tarjima qiling: Sen go'sht yeysanmi?", words: ['ты', 'ешь', 'мясо', 'ем', 'я'], correct: 'ты ешь мясо?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular guruch yeyishadi.', words: ['они', 'едят', 'рис', 'ест', 'мы'], correct: 'они едят рис' },
];

export default function LessonFourteenTaskFivePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} />;
}
