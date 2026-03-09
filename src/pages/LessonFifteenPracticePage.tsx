import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Быть (муж.) -> ...', options: ['был', 'была', 'были'], correct: 'был' },
  { type: 'choice', prompt: 'Быть (жен.) -> ...', options: ['был', 'была', 'были'], correct: 'была' },
  { type: 'choice', prompt: 'Работать (мы) -> ...', options: ['работали', 'работал', 'работала'], correct: 'работали' },
  { type: 'choice', prompt: 'Читать (она) -> ...', options: ['читал', 'читала', 'читали'], correct: 'читала' },
  { type: 'choice', prompt: 'Писать (он) -> ...', options: ['писала', 'писали', 'писал'], correct: 'писал' },
  { type: 'choice', prompt: 'Играть (они) -> ...', options: ['играл', 'играла', 'играли'], correct: 'играли' },

  {
    type: 'matching',
    prompt: 'местоимение + форма быть (прошедшее)',
    allowDuplicateRightMatches: true,
    pairs: [
      { left: 'Я (муж.)', right: 'был' },
      { left: 'Я (жен.)', right: 'была' },
      { left: 'Мы', right: 'были' },
      { left: 'Она', right: 'была' },
      { left: 'Они', right: 'были' },
    ],
  },
  {
    type: 'matching',
    prompt: 'инфинитив -> прошедшее (он)',
    pairs: [
      { left: 'читать', right: 'читал' },
      { left: 'писать', right: 'писал' },
      { left: 'слушать', right: 'слушал' },
      { left: 'играть', right: 'играл' },
      { left: 'гулять', right: 'гулял' },
    ],
  },
  {
    type: 'matching',
    prompt: 'инфинитив -> прошедшее (она)',
    pairs: [
      { left: 'читать', right: 'читала' },
      { left: 'писать', right: 'писала' },
      { left: 'работать', right: 'работала' },
      { left: 'играть', right: 'играла' },
      { left: 'гулять', right: 'гуляла' },
    ],
  },
  {
    type: 'sentence',
    prompt: "Men kitob o'qidim",
    words: ['Я', 'читал', 'книгу', 'книга', 'читала'],
    correct: 'Я читал книгу',
  },
  {
    type: 'sentence',
    prompt: 'U xat yozdi',
    words: ['Она', 'писала', 'письмо', 'писал', 'письма'],
    correct: 'Она писала письмо',
  },
  {
    type: 'sentence',
    prompt: 'Biz uyda ishladik',
    words: ['Мы', 'работали', 'дома', 'работал', 'дом'],
    correct: 'Мы работали дома',
  },
  {
    type: 'sentence',
    prompt: "Ular hovlida o'ynashdi",
    words: ['Они', 'играли', 'во', 'дворе', 'играл'],
    correct: 'Они играли во дворе',
  },
];

export default function LessonFifteenPracticePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-15" />;
}
