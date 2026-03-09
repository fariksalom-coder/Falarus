import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас я ______ книгу со стола.', options: ['беру', 'возьму'], correct: 'беру' },
  { type: 'choice', prompt: 'Через минуту я ______ эту книгу.', options: ['беру', 'возьму'], correct: 'возьму' },
  { type: 'choice', prompt: 'Сейчас он ______ ручку.', options: ['берёт', 'возьмёт'], correct: 'берёт' },
  { type: 'choice', prompt: 'Потом он ______ документы.', options: ['берёт', 'возьмёт'], correct: 'возьмёт' },
  { type: 'choice', prompt: 'Сейчас мы ______ учебники.', options: ['берём', 'возьмём'], correct: 'берём' },
  { type: 'choice', prompt: 'Потом мы ______ билеты.', options: ['берём', 'возьмём'], correct: 'возьмём' },
  { type: 'choice', prompt: 'Сейчас она ______ телефон.', options: ['берёт', 'возьмёт'], correct: 'берёт' },
  { type: 'choice', prompt: 'Потом она ______ сумку.', options: ['берёт', 'возьмёт'], correct: 'возьмёт' },
  { type: 'choice', prompt: 'Сейчас студенты ______ книги.', options: ['берут', 'возьмут'], correct: 'берут' },
  { type: 'choice', prompt: 'Потом студенты ______ новые учебники.', options: ['берут', 'возьмут'], correct: 'возьмут' },

  {
    type: 'sentence',
    prompt: "Men hozir stol ustidan kitob olyapman.",
    words: ['я', 'беру', 'книгу', 'со', 'стола', 'сейчас', 'возьму'],
    correct: 'Я сейчас беру книгу со стола.',
  },
  {
    type: 'sentence',
    prompt: 'Men keyin kitob olaman.',
    words: ['я', 'возьму', 'книгу', 'потом', 'беру'],
    correct: 'Я потом возьму книгу.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir ruchka olyapti.',
    words: ['он', 'берёт', 'ручку', 'сейчас', 'возьмёт'],
    correct: 'Он сейчас берёт ручку.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin hujjatlarni oladi.',
    words: ['он', 'возьмёт', 'документы', 'потом', 'берёт'],
    correct: 'Он потом возьмёт документы.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir kitoblar olyapmiz.',
    words: ['мы', 'берём', 'книги', 'сейчас', 'возьмём'],
    correct: 'Мы сейчас берём книги.',
  },
  {
    type: 'sentence',
    prompt: 'Biz keyin chiptalarni olamiz.',
    words: ['мы', 'возьмём', 'билеты', 'потом', 'берём'],
    correct: 'Мы потом возьмём билеты.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir telefonni olyapti.',
    words: ['она', 'берёт', 'телефон', 'сейчас', 'возьмёт'],
    correct: 'Она сейчас берёт телефон.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin sumkani oladi.',
    words: ['она', 'возьмёт', 'сумку', 'потом', 'берёт'],
    correct: 'Она потом возьмёт сумку.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar hozir kitoblar olyapti.',
    words: ['студенты', 'берут', 'книги', 'сейчас', 'возьмут'],
    correct: 'Студенты сейчас берут книги.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar keyin yangi kitoblar oladi.',
    words: ['студенты', 'возьмут', 'новые', 'книги', 'потом', 'берут'],
    correct: 'Студенты потом возьмут новые книги.',
  },
];

export default function LessonSeventeenTaskEightPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" />;
}
