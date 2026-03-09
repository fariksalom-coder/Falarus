import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'В следующую субботу мы … в Коптелово.', options: ['идём', 'ездим', 'едем'], correct: 'едем' },
  { type: 'choice', prompt: 'Сегодня на улице тепло. Мы … на занятия пешком.', options: ['ездим', 'ходим', 'идём'], correct: 'ходим' },
  { type: 'choice', prompt: 'Почти каждую неделю мы … в супермаркет «Ашан» на автобусе.', options: ['ездим', 'ходим', 'идём'], correct: 'ездим' },
  { type: 'choice', prompt: 'Каждую пятницу мы … в клуб.', options: ['были', 'шли', 'ходим'], correct: 'ходим' },
  { type: 'choice', prompt: 'Вчера мы тоже … туда.', options: ['были', 'шли', 'ходили'], correct: 'ходили' },
  { type: 'choice', prompt: 'Наши друзья тоже … там.', options: ['были', 'ходили', 'шли'], correct: 'были' },
  { type: 'choice', prompt: 'Зимой я люблю … отдыхать на юг.', options: ['ехать', 'ходить', 'ездить'], correct: 'ездить' },
  { type: 'choice', prompt: 'Сейчас они … на концерт в университет.', options: ['едут', 'ездили', 'ездят'], correct: 'едут' },
  { type: 'choice', prompt: '— Ира, ты … в театр вчера?', options: ['идёшь', 'ходила', 'пойду'], correct: 'ходила' },
  { type: 'choice', prompt: '— Нет, но в субботу … .', options: ['идёшь', 'ходила', 'пойду'], correct: 'пойду' },
  { type: 'choice', prompt: '— А сейчас куда ты … ?', options: ['идёшь', 'ходила', 'пойду'], correct: 'идёшь' },
  { type: 'choice', prompt: '— Я … в библиотеку.', options: ['пойду', 'иду', 'ходила'], correct: 'иду' },
  { type: 'choice', prompt: 'Через час мы … в аэропорт встречать друзей, а потом мы … в гостиницу.', options: ['поедем / поедем', 'ездили / едем', 'ездит / едет'], correct: 'поедем / поедем' },
  { type: 'choice', prompt: 'Он хорошо знает Тюмень, потому что часто … туда.', options: ['ездит', 'едет', 'ездили'], correct: 'ездит' },
  { type: 'choice', prompt: 'Вчера мои друзья … в музей.', options: ['ездили', 'ходили', 'шли'], correct: 'ходили' },
  { type: 'choice', prompt: 'А мы … туда завтра.', options: ['ходим', 'ходили', 'пойдём'], correct: 'пойдём' },
  { type: 'choice', prompt: '— Таня, когда ты … домой, ты не встретила Павла?', options: ['шёл', 'пошёл', 'шла'], correct: 'шла' },
  { type: 'choice', prompt: '— Да, встретила. Он … мне навстречу.', options: ['шёл', 'пошёл', 'шла'], correct: 'шёл' },
  { type: 'choice', prompt: '— Хорошо, а то я не знал, куда он … .', options: ['шёл', 'пошёл', 'пойти'], correct: 'пошёл' },
  { type: 'choice', prompt: 'Вчера наши знакомые … на экскурсию.', options: ['поехали', 'ездили', 'ехали'], correct: 'поехали' },
];

export default function LessonTwentyTaskSixPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" />;
}
