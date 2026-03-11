import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я завтра ______ тебе с работой.', options: ['поможешь', 'помогу', 'поможет', 'помогут'], correct: 'помогу' },
  { type: 'choice', prompt: 'Почему ты не ______ мне?', options: ['поможешь', 'помогу', 'поможет', 'поможем'], correct: 'поможешь' },
  { type: 'choice', prompt: 'Мы обязательно ______ вам решить эту проблему.', options: ['помогут', 'поможем', 'поможет', 'помогу'], correct: 'поможем' },
  { type: 'choice', prompt: 'Она ______ ребёнку сделать уроки.', options: ['помогу', 'поможет', 'поможешь', 'помогут'], correct: 'поможет' },
  { type: 'choice', prompt: 'Они ______ нам, если будет трудно.', options: ['поможет', 'помогу', 'помогут', 'поможешь'], correct: 'помогут' },
  {
    type: 'matching',
    prompt: 'Juftini toping (помочь)',
    pairs: [
      { left: 'Я ______ тебе завтра.', right: 'помогу' },
      { left: 'Ты ______ мне с заданием?', right: 'поможешь' },
      { left: 'Он ______ нам в трудной ситуации.', right: 'поможет' },
      { left: 'Мы ______ вам подготовиться.', right: 'поможем' },
      { left: 'Они ______ родителям.', right: 'помогут' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Men senga ertaga yordam beraman.', words: ['я', 'помогу', 'тебе', 'завтра', 'поможешь', 'мы'], correct: 'я помогу тебе завтра' },
  { type: 'sentence', prompt: 'Tarjima qiling: U menga bu ishda yordam beradi.', words: ['он', 'поможет', 'мне', 'в этой работе', 'помогут', 'я'], correct: 'он поможет мне в этой работе' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz sizga muammoni hal qilishga yordam beramiz.', words: ['мы', 'поможем', 'вам', 'решить', 'проблему', 'поможет', 'ты'], correct: 'мы поможем вам решить проблему' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen menga nega yordam bermaysan?', words: ['ты', 'почему', 'не', 'поможешь', 'мне', 'помогу'], correct: 'почему ты не поможешь мне?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular bizga qiyin vaziyatda yordam berishadi.', words: ['они', 'помогут', 'нам', 'в трудной ситуации', 'поможет', 'мы'], correct: 'они помогут нам в трудной ситуации' },
];

export default function LessonFourteenTaskTwelvePage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={12} token={token} />;
}
