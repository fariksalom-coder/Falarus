import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас я ______ письмо.', options: ['пишу', 'напишу'], correct: 'пишу' },
  { type: 'choice', prompt: 'Завтра я ______ письмо.', options: ['пишу', 'напишу'], correct: 'напишу' },
  { type: 'choice', prompt: 'Сейчас он ______ сообщение.', options: ['пишет', 'напишет'], correct: 'пишет' },
  { type: 'choice', prompt: 'Вечером он ______ письмо другу.', options: ['пишет', 'напишет'], correct: 'напишет' },
  { type: 'choice', prompt: 'Сейчас мы ______ текст.', options: ['пишем', 'напишем'], correct: 'пишем' },
  { type: 'choice', prompt: 'Через час мы ______ это письмо.', options: ['пишем', 'напишем'], correct: 'напишем' },
  { type: 'choice', prompt: 'Сейчас она ______ письмо маме.', options: ['пишет', 'напишет'], correct: 'пишет' },
  { type: 'choice', prompt: 'Завтра она ______ письмо.', options: ['пишет', 'напишет'], correct: 'напишет' },
  { type: 'choice', prompt: 'Сейчас студенты ______ диктант.', options: ['пишут', 'напишут'], correct: 'пишут' },
  { type: 'choice', prompt: 'Завтра студенты ______ контрольную работу.', options: ['пишут', 'напишут'], correct: 'напишут' },

  {
    type: 'sentence',
    prompt: 'Men hozir xat yozayapman.',
    words: ['я', 'пишу', 'письмо', 'сейчас', 'напишу'],
    correct: 'Я сейчас пишу письмо.',
  },
  {
    type: 'sentence',
    prompt: 'Men ertaga xat yozaman.',
    words: ['я', 'напишу', 'письмо', 'завтра', 'пишу'],
    correct: 'Я завтра напишу письмо.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir xabar yozayapti.',
    words: ['он', 'пишет', 'сообщение', 'сейчас', 'напишет'],
    correct: 'Он сейчас пишет сообщение.',
  },
  {
    type: 'sentence',
    prompt: 'U kechqurun xat yozadi.',
    words: ['он', 'напишет', 'письмо', 'вечером', 'пишет'],
    correct: 'Он вечером напишет письмо.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir matn yozayapmiz.',
    words: ['мы', 'пишем', 'текст', 'сейчас', 'напишем'],
    correct: 'Мы сейчас пишем текст.',
  },
  {
    type: 'sentence',
    prompt: 'Biz bir soatdan keyin xat yozamiz.',
    words: ['мы', 'напишем', 'письмо', 'через', 'час', 'пишем'],
    correct: 'Мы через час напишем письмо.',
  },
  {
    type: 'sentence',
    prompt: 'U hozir xat yozayapti.',
    words: ['она', 'пишет', 'письмо', 'сейчас', 'напишет'],
    correct: 'Она сейчас пишет письмо.',
  },
  {
    type: 'sentence',
    prompt: 'U ertaga xat yozadi.',
    words: ['она', 'напишет', 'письмо', 'завтра', 'пишет'],
    correct: 'Она завтра напишет письмо.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar hozir diktant yozayapti.',
    words: ['студенты', 'пишут', 'диктант', 'сейчас', 'напишут'],
    correct: 'Студенты сейчас пишут диктант.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar ertaga nazorat ishini yozadi.',
    words: ['студенты', 'напишут', 'контрольную', 'работу', 'завтра', 'пишут'],
    correct: 'Студенты завтра напишут контрольную работу.',
  },
];

export default function LessonSeventeenTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={3} />;
}
