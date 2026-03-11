import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я обычно ______ кофе утром.', options: ['пьёшь', 'пью', 'пьёт', 'пьют'], correct: 'пью' },
  { type: 'choice', prompt: 'Почему ты не ______ воду?', options: ['пьёшь', 'пью', 'пьём', 'пьёт'], correct: 'пьёшь' },
  { type: 'choice', prompt: 'Мы редко ______ газированные напитки.', options: ['пьют', 'пьём', 'пьёте', 'пьёт'], correct: 'пьём' },
  { type: 'choice', prompt: 'Она сейчас ______ чай или сок?', options: ['пьют', 'пьёшь', 'пьёт', 'пью'], correct: 'пьёт' },
  { type: 'choice', prompt: 'Они ______ слишком много кофе вечером.', options: ['пьёт', 'пьёте', 'пьют', 'пью'], correct: 'пьют' },
  {
    type: 'matching',
    prompt: 'Juftini toping (пить)',
    pairs: [
      { left: 'Я не ______ сладкий чай.', right: 'пью' },
      { left: 'Ты часто ______ кофе?', right: 'пьёшь' },
      { left: 'Он ______ воду после тренировки.', right: 'пьёт' },
      { left: 'Мы ______ сок каждый день.', right: 'пьём' },
      { left: 'Они редко ______ молоко.', right: 'пьют' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Men ertalab choy ichmayman.', words: ['я', 'не', 'пью', 'чай', 'утром', 'пьёшь', 'мы'], correct: 'я не пью чай утром' },
  { type: 'sentence', prompt: 'Tarjima qiling: U hozir suv ichyapti.', words: ['он', 'сейчас', 'пьёт', 'воду', 'пьют', 'я'], correct: 'он сейчас пьёт воду' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz kechqurun qahva ichmaymiz.', words: ['мы', 'не', 'пьём', 'кофе', 'вечером', 'пьют', 'ты'], correct: 'мы не пьём кофе вечером' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen har kuni sharbat ichasanmi?', words: ['ты', 'пьёшь', 'каждый', 'день', 'сок', 'пью', 'я'], correct: 'ты пьёшь сок каждый день?' },
  { type: 'sentence', prompt: "Tarjima qiling: Ular juda ko'p suv ichishadi.", words: ['они', 'пьют', 'много', 'воды', 'пьёт', 'мы'], correct: 'они пьют много воды' },
];

export default function LessonFourteenTaskSixPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={6} token={token} />;
}
