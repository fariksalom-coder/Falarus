import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я уже час ______ автобус.', options: ['ждёшь', 'жду', 'ждёт', 'ждут'], correct: 'жду' },
  { type: 'choice', prompt: 'Почему ты не ______ меня?', options: ['ждёшь', 'жду', 'ждём', 'ждёт'], correct: 'ждёшь' },
  { type: 'choice', prompt: 'Мы долго ______ ответа.', options: ['ждут', 'ждём', 'ждёте', 'ждёт'], correct: 'ждём' },
  { type: 'choice', prompt: 'Она сейчас ______ звонка.', options: ['жду', 'ждут', 'ждёт', 'ждёшь'], correct: 'ждёт' },
  { type: 'choice', prompt: 'Они ______ вас возле школы.', options: ['ждёт', 'ждём', 'ждут', 'жду'], correct: 'ждут' },
  {
    type: 'matching',
    prompt: 'Juftini toping (ждать)',
    pairs: [
      { left: 'Я не ______ тебя.', right: 'жду' },
      { left: 'Ты ______ друга на улице?', right: 'ждёшь' },
      { left: 'Он ______ результат экзамена.', right: 'ждёт' },
      { left: 'Мы ______ гостей дома.', right: 'ждём' },
      { left: 'Они ______ врача.', right: 'ждут' },
    ],
  },
  { type: 'sentence', prompt: "Tarjima qiling: Men seni ko'chada kutyapman.", words: ['я', 'жду', 'тебя', 'на улице', 'ждёшь', 'мы'], correct: 'я жду тебя на улице' },
  { type: 'sentence', prompt: 'Tarjima qiling: U hozir javobni kutyapti.', words: ['он', 'сейчас', 'ждёт', 'ответ', 'ждут', 'я'], correct: 'он сейчас ждёт ответ' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz uzoq vaqt avtobusni kutyapmiz.', words: ['мы', 'долго', 'ждём', 'автобус', 'ждут', 'ты'], correct: 'мы долго ждём автобус' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen meni nega kutmayapsan?', words: ['ты', 'почему', 'не', 'ждёшь', 'меня', 'жду'], correct: 'почему ты не ждёшь меня?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular shifokorni kasalxonada kutishyapti.', words: ['они', 'ждут', 'врача', 'в больнице', 'ждёт', 'мы'], correct: 'они ждут врача в больнице' },
];

export default function LessonFourteenTaskSevenPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={7} token={token} />;
}
