import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я часто ______ в спортзал по вечерам.', options: ['ходишь', 'хожу', 'ходит', 'ходят'], correct: 'хожу' },
  { type: 'choice', prompt: 'Почему ты не ______ на работу?', options: ['ходишь', 'хожу', 'ходим', 'ходит'], correct: 'ходишь' },
  { type: 'choice', prompt: 'Мы редко ______ в кино.', options: ['ходят', 'ходим', 'ходите', 'ходит'], correct: 'ходим' },
  { type: 'choice', prompt: 'Она каждый день ______ в университет.', options: ['хожу', 'ходят', 'ходит', 'ходишь'], correct: 'ходит' },
  { type: 'choice', prompt: 'Дети ______ в школу пешком.', options: ['ходит', 'ходишь', 'ходят', 'хожу'], correct: 'ходят' },
  {
    type: 'matching',
    prompt: 'Juftini toping (ходить)',
    pairs: [
      { left: 'Я ______ в магазин.', right: 'хожу' },
      { left: 'Ты часто ______ в бассейн?', right: 'ходишь' },
      { left: 'Он ______ на курсы английского.', right: 'ходит' },
      { left: 'Мы ______ в гости к друзьям.', right: 'ходим' },
      { left: 'Они ______ в мечеть по пятницам.', right: 'ходят' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Men har kuni ishga boraman.', words: ['я', 'каждый день', 'хожу', 'на работу', 'ходит', 'мы'], correct: 'я каждый день хожу на работу' },
  { type: 'sentence', prompt: "Tarjima qiling: U tez-tez do'konga boradi.", words: ['он', 'часто', 'ходит', 'в магазин', 'хожу', 'они'], correct: 'он часто ходит в магазин' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz yakshanba kuni masjidga boramiz.', words: ['мы', 'ходим', 'в мечеть', 'в воскресенье', 'ходят', 'ты'], correct: 'мы ходим в мечеть в воскресенье' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen nega darsga bormayapsan?', words: ['ты', 'почему', 'не', 'ходишь', 'на занятия', 'хожу'], correct: 'почему ты не ходишь на занятия?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular kecha kinoga borishdi.', words: ['они', 'вчера', 'ходили', 'в кино', 'ходит', 'мы'], correct: 'они вчера ходили в кино' },
];

export default function LessonFourteenTaskFifteenPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-14" lessonPath="/lesson-14" taskNumber={15} token={token} />;
}
