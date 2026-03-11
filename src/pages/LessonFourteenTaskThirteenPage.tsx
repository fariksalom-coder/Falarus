import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я всегда ______ за интернет вовремя.', options: ['платишь', 'плачу', 'платит', 'платят'], correct: 'плачу' },
  { type: 'choice', prompt: 'Почему ты не ______ за проезд?', options: ['платишь', 'плачу', 'платим', 'платит'], correct: 'платишь' },
  { type: 'choice', prompt: 'Мы ежемесячно ______ за аренду квартиры.', options: ['платят', 'платим', 'платите', 'платит'], correct: 'платим' },
  { type: 'choice', prompt: 'Она ______ наличными или картой?', options: ['плачу', 'платят', 'платит', 'платишь'], correct: 'платит' },
  { type: 'choice', prompt: 'Они ______ большие налоги.', options: ['платит', 'платят', 'плачу', 'платим'], correct: 'платят' },
  {
    type: 'matching',
    prompt: 'Juftini toping (платить)',
    pairs: [
      { left: 'Я ______ за свет.', right: 'плачу' },
      { left: 'Ты ______ за обучение?', right: 'платишь' },
      { left: 'Он ______ за обед.', right: 'платит' },
      { left: 'Мы ______ за квартиру.', right: 'платим' },
      { left: 'Они ______ за билеты.', right: 'платят' },
    ],
  },
  { type: 'sentence', prompt: "Tarjima qiling: Men ijara uchun har oy to'layman.", words: ['я', 'плачу', 'за аренду', 'каждый месяц', 'платишь', 'мы'], correct: 'я плачу за аренду каждый месяц' },
  { type: 'sentence', prompt: "Tarjima qiling: U yo'l haqi uchun to'laydi.", words: ['он', 'платит', 'за проезд', 'плачу', 'они', 'сегодня'], correct: 'он платит за проезд' },
  { type: 'sentence', prompt: "Tarjima qiling: Biz xizmatlar uchun vaqtida to'laymiz.", words: ['мы', 'платим', 'за услуги', 'вовремя', 'платят', 'ты'], correct: 'мы платим за услуги вовремя' },
  { type: 'sentence', prompt: "Tarjima qiling: Sen nega soliq uchun to'lamayapsan?", words: ['ты', 'почему', 'не', 'платишь', 'за налог', 'плачу'], correct: 'почему ты не платишь за налог?' },
  { type: 'sentence', prompt: "Tarjima qiling: Ular chipta uchun qancha to'lashadi?", words: ['они', 'сколько', 'платят', 'за билет', 'платит', 'мы'], correct: 'сколько они платят за билет?' },
];

export default function LessonFourteenTaskThirteenPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={13} token={token} />;
}
