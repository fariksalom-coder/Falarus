import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я всегда ______ своё здоровье.', options: ['бережёшь', 'берегу', 'бережёт', 'берегут'], correct: 'берегу' },
  { type: 'choice', prompt: 'Почему ты не ______ своё время?', options: ['бережёшь', 'берегу', 'бережём', 'бережёт'], correct: 'бережёшь' },
  { type: 'choice', prompt: 'Мы должны ______ природу.', options: ['бережёт', 'берегут', 'беречь', 'бережём'], correct: 'беречь' },
  { type: 'choice', prompt: 'Она ______ свои деньги.', options: ['берегу', 'бережёт', 'бережёшь', 'берегут'], correct: 'бережёт' },
  { type: 'choice', prompt: 'Родители ______ своих детей.', options: ['бережёт', 'бережёте', 'берегут', 'берегу'], correct: 'берегут' },
  {
    type: 'matching',
    prompt: 'Juftini toping (беречь)',
    pairs: [
      { left: 'Я ______ своё здоровье.', right: 'берегу' },
      { left: 'Ты ______ свои вещи.', right: 'бережёшь' },
      { left: 'Он ______ семью.', right: 'бережёт' },
      { left: 'Мы ______ природу.', right: 'бережём' },
      { left: 'Они ______ традиции.', right: 'берегут' },
    ],
  },
  { type: 'sentence', prompt: "Tarjima qiling: Men sog'lig'imni asrayman.", words: ['я', 'берегу', 'своё', 'здоровье', 'бережёшь', 'мы'], correct: 'я берегу своё здоровье' },
  { type: 'sentence', prompt: 'Tarjima qiling: U har doim vaqtini asraydi.', words: ['он', 'всегда', 'бережёт', 'своё', 'время', 'берегут', 'я'], correct: 'он всегда бережёт своё время' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz tabiatni asrashimiz kerak.', words: ['мы', 'должны', 'беречь', 'природу', 'бережём', 'ты'], correct: 'мы должны беречь природу' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen nega pulingni asramayapsan?', words: ['ты', 'почему', 'не', 'бережёшь', 'свои', 'деньги', 'берегу'], correct: 'почему ты не бережёшь свои деньги?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular ota-onasini asrashadi.', words: ['они', 'берегут', 'своих', 'родителей', 'бережёт', 'мы'], correct: 'они берегут своих родителей' },
];

export default function LessonFourteenTaskElevenPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={11} token={token} />;
}
