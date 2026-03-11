import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я завтра ______ новый телефон.', options: ['купишь', 'куплю', 'купит', 'купят'], correct: 'куплю' },
  { type: 'choice', prompt: 'Почему ты не ______ билет заранее?', options: ['купишь', 'куплю', 'купим', 'купит'], correct: 'купишь' },
  { type: 'choice', prompt: 'Мы обязательно ______ продукты по дороге домой.', options: ['купят', 'купим', 'купит', 'куплю'], correct: 'купим' },
  { type: 'choice', prompt: 'Она ______ ребёнку подарок на день рождения.', options: ['куплю', 'купишь', 'купит', 'купят'], correct: 'купит' },
  { type: 'choice', prompt: 'Они ______ квартиру в следующем году.', options: ['купит', 'купим', 'купят', 'куплю'], correct: 'купят' },
  {
    type: 'matching',
    prompt: 'Juftini toping (купить)',
    pairs: [
      { left: 'Я ______ тебе книгу.', right: 'куплю' },
      { left: 'Ты ______ новый компьютер?', right: 'купишь' },
      { left: 'Он ______ цветы маме.', right: 'купит' },
      { left: 'Мы ______ билеты онлайн.', right: 'купим' },
      { left: 'Они ______ дом в городе.', right: 'купят' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Men ertaga yangi kiyim sotib olaman.', words: ['я', 'завтра', 'куплю', 'новую одежду', 'купишь', 'мы'], correct: 'я завтра куплю новую одежду' },
  { type: 'sentence', prompt: "Tarjima qiling: U menga sovg'a sotib oladi.", words: ['он', 'купит', 'мне', 'подарок', 'купят', 'я'], correct: 'он купит мне подарок' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz internet orqali chipta sotib olamiz.', words: ['мы', 'купим', 'билеты', 'через интернет', 'купит', 'ты'], correct: 'мы купим билеты через интернет' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen nega mashina sotib olmaysan?', words: ['ты', 'почему', 'не', 'купишь', 'машину', 'куплю'], correct: 'почему ты не купишь машину?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular kelasi yili uy sotib olishadi.', words: ['они', 'купят', 'дом', 'в следующем году', 'купит', 'мы'], correct: 'они купят дом в следующем году' },
];

export default function LessonFourteenTaskSixteenPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={16} token={token} />;
}
