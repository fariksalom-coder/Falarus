import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Я решил регулярно … письма домой.',
    options: ['писать', 'написать'],
    correct: 'писать',
  },
  {
    type: 'choice',
    prompt: 'Я обещал маме … сразу, как только приеду.',
    options: ['писать', 'написать'],
    correct: 'написать',
  },
  {
    type: 'choice',
    prompt: 'Студент просил … ему сдать экзамен вторично.',
    options: ['разрешать', 'разрешить'],
    correct: 'разрешить',
  },
  {
    type: 'choice',
    prompt: 'Преподаватель попросил нас … работу вовремя.',
    options: ['заканчивать', 'закончить'],
    correct: 'закончить',
  },
  {
    type: 'choice',
    prompt: 'Я стараюсь каждый день … новые слова.',
    options: ['повторить', 'повторять'],
    correct: 'повторять',
  },

  {
    type: 'sentence',
    prompt: 'Men uyga muntazam ravishda xat yozishga qaror qildim.',
    words: ['я', 'решил', 'регулярно', 'писать', 'письма', 'домой', 'написать'],
    correct: 'Я решил регулярно писать письма домой.',
  },
  {
    type: 'sentence',
    prompt: 'Men onamga kelganim zahoti xat yozishga va’da berdim.',
    words: ['я', 'обещал', 'маме', 'написать', 'сразу', 'как', 'только', 'приеду', 'писать'],
    correct: 'Я обещал маме написать сразу, как только приеду.',
  },
  {
    type: 'sentence',
    prompt: 'Talaba imtihonni yana topshirishga ruxsat berishni so‘radi.',
    words: ['студент', 'просил', 'разрешить', 'ему', 'сдать', 'экзамен', 'вторично', 'разрешать'],
    correct: 'Студент просил разрешить ему сдать экзамен вторично.',
  },
  {
    type: 'sentence',
    prompt: 'O‘qituvchi bizdan ishni vaqtida tugatishni so‘radi.',
    words: ['преподаватель', 'попросил', 'нас', 'закончить', 'работу', 'вовремя', 'заканчивать'],
    correct: 'Преподаватель попросил нас закончить работу вовремя.',
  },
  {
    type: 'sentence',
    prompt: 'Men har kuni yangi so‘zlarni takrorlashga harakat qilaman.',
    words: ['я', 'стараюсь', 'каждый', 'день', 'повторять', 'новые', 'слова', 'повторить'],
    correct: 'Я стараюсь каждый день повторять новые слова.',
  },
];

export default function LessonSeventeenTaskFifteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" />;
}
