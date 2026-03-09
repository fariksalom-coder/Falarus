import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Приглашение: Пойдём поужинаем.',
    words: ['спасибо', 'я', 'уже', 'ужинал', 'поужинаю'],
    correct: 'Спасибо, я уже ужинал.',
  },
  {
    type: 'sentence',
    prompt: 'Приглашение: Пойдём посмотрим расписание экзаменов.',
    words: ['спасибо', 'я', 'уже', 'смотрел', 'расписание', 'посмотрю'],
    correct: 'Спасибо, я уже смотрел расписание.',
  },
  {
    type: 'sentence',
    prompt: 'Приглашение: Пойдём в кино, посмотрим новый фильм.',
    words: ['спасибо', 'я', 'уже', 'смотрел', 'фильм', 'посмотрю'],
    correct: 'Спасибо, я уже смотрел фильм.',
  },
  {
    type: 'sentence',
    prompt: 'Просьба: Узнай, будет ли сегодня фонетика.',
    words: ['я', 'уже', 'узнавал', 'это', 'узнаю'],
    correct: 'Я уже узнавал это.',
  },
  {
    type: 'sentence',
    prompt: 'Просьба: Покажи мне свои фотографии.',
    words: ['я', 'уже', 'показывал', 'фотографии', 'покажу'],
    correct: 'Я уже показывал фотографии.',
  },
  {
    type: 'sentence',
    prompt: 'Просьба: Сделай упражнение к тексту.',
    words: ['я', 'уже', 'делал', 'упражнение', 'сделаю'],
    correct: 'Я уже делал упражнение.',
  },
  {
    type: 'sentence',
    prompt: 'Просьба: Прочитайте рассказ «Зима».',
    words: ['мы', 'уже', 'читали', 'рассказ', 'прочитаем'],
    correct: 'Мы уже читали рассказ.',
  },
];

export default function LessonSeventeenTaskTenPage() {
  return (
    <LessonFourteenTaskRunner
      tasks={TASKS}
      backPath="/lesson-17"
      sentenceInstruction="Составьте ответ на приглашение или просьбу."
    />
  );
}
