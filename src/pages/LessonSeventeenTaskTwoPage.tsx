import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас я ______ книгу.', options: ['читаю', 'прочитаю'], correct: 'читаю' },
  { type: 'choice', prompt: 'Завтра я ______ эту книгу.', options: ['читаю', 'прочитаю'], correct: 'прочитаю' },
  { type: 'choice', prompt: 'Каждый день он ______ газету.', options: ['читает', 'прочитает'], correct: 'читает' },
  { type: 'choice', prompt: 'Сегодня вечером он ______ эту статью.', options: ['читает', 'прочитает'], correct: 'прочитает' },
  { type: 'choice', prompt: 'Сейчас мы ______ новый текст.', options: ['читаем', 'прочитаем'], correct: 'читаем' },
  { type: 'choice', prompt: 'Через час мы ______ этот текст.', options: ['читаем', 'прочитаем'], correct: 'прочитаем' },
  { type: 'choice', prompt: 'Сейчас она ______ письмо.', options: ['читает', 'прочитает'], correct: 'читает' },
  { type: 'choice', prompt: 'Завтра она ______ письмо.', options: ['читает', 'прочитает'], correct: 'прочитает' },
  { type: 'choice', prompt: 'Сейчас студенты ______ книгу.', options: ['читают', 'прочитают'], correct: 'читают' },
  { type: 'choice', prompt: 'Завтра студенты ______ новую книгу.', options: ['читают', 'прочитают'], correct: 'прочитают' },

  {
    type: 'sentence',
    prompt: "Men hozir kitob o‘qiyapman.",
    words: ['я', 'читаю', 'книгу', 'сейчас', 'прочитаю'],
    correct: 'Я сейчас читаю книгу.',
  },
  {
    type: 'sentence',
    prompt: "Men ertaga bu kitobni o‘qib tugataman.",
    words: ['я', 'прочитаю', 'эту', 'книгу', 'завтра', 'читаю'],
    correct: 'Я завтра прочитаю эту книгу.',
  },
  {
    type: 'sentence',
    prompt: "U hozir gazeta o‘qiyapti.",
    words: ['он', 'читает', 'газету', 'сейчас', 'прочитает'],
    correct: 'Он сейчас читает газету.',
  },
  {
    type: 'sentence',
    prompt: "U kechqurun maqolani o‘qib tugatadi.",
    words: ['он', 'прочитает', 'статью', 'вечером', 'читает'],
    correct: 'Он вечером прочитает статью.',
  },
  {
    type: 'sentence',
    prompt: "Biz hozir matn o‘qiyapmiz.",
    words: ['мы', 'читаем', 'текст', 'сейчас', 'прочитаем'],
    correct: 'Мы сейчас читаем текст.',
  },
  {
    type: 'sentence',
    prompt: "Biz bir soatdan keyin matnni o‘qib tugatamiz.",
    words: ['мы', 'прочитаем', 'текст', 'через', 'час', 'читаем'],
    correct: 'Мы через час прочитаем текст.',
  },
  {
    type: 'sentence',
    prompt: "U hozir xat o‘qiyapti.",
    words: ['она', 'читает', 'письмо', 'сейчас', 'прочитает'],
    correct: 'Она сейчас читает письмо.',
  },
  {
    type: 'sentence',
    prompt: "U ertaga xatni o‘qib tugatadi.",
    words: ['она', 'прочитает', 'письмо', 'завтра', 'читает'],
    correct: 'Она завтра прочитает письмо.',
  },
  {
    type: 'sentence',
    prompt: "Talabalar hozir kitob o‘qiyapti.",
    words: ['студенты', 'читают', 'книгу', 'сейчас', 'прочитают'],
    correct: 'Студенты сейчас читают книгу.',
  },
  {
    type: 'sentence',
    prompt: "Talabalar ertaga yangi kitobni o‘qib tugatadi.",
    words: ['студенты', 'прочитают', 'новую', 'книгу', 'завтра', 'читают'],
    correct: 'Студенты завтра прочитают новую книгу.',
  },
];

export default function LessonSeventeenTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={2} />;
}
