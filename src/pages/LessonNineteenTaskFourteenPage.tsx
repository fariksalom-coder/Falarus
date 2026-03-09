import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Вчера мы … в музей.', options: ['идём', 'ходили'], correct: 'ходили' },
  { type: 'choice', prompt: 'Сейчас я … в университет.', options: ['иду', 'ходил'], correct: 'иду' },
  { type: 'choice', prompt: 'Мои друзья покупают торт, вечером они … в гости.', options: ['пойдут', 'ходят'], correct: 'пойдут' },
  { type: 'choice', prompt: 'Вчера она … в кино.', options: ['ходила', 'идёт'], correct: 'ходила' },
  { type: 'choice', prompt: 'Сейчас мой отец в поезде. Он … в Екатеринбург.', options: ['ездил', 'едет'], correct: 'едет' },
  { type: 'choice', prompt: 'На прошлой неделе я с другом … в деревню.', options: ['ездил', 'еду'], correct: 'ездил' },
  { type: 'choice', prompt: 'Завтра мы … в Верхотурье.', options: ['ездили', 'поедем'], correct: 'поедем' },
  { type: 'choice', prompt: 'Завтра воскресенье. Мои дети не … в школу.', options: ['ходили', 'пойдут'], correct: 'пойдут' },
  { type: 'choice', prompt: 'Вчера моя семья … в цирк.', options: ['ходила', 'идёт'], correct: 'ходила' },
  { type: 'choice', prompt: 'Обычно студенты … в университет на трамвае.', options: ['ходят', 'ездят'], correct: 'ездят' },
  { type: 'choice', prompt: 'Я часто … в университет пешком.', options: ['хожу', 'езжу'], correct: 'хожу' },
  { type: 'choice', prompt: 'Обычно родители … на дачу на машине.', options: ['ходят', 'ездят'], correct: 'ездят' },
  { type: 'choice', prompt: 'Станция метро «Цирк» находится недалеко от общежития. Мы часто … туда пешком.', options: ['ходим', 'ездим'], correct: 'ходим' },
  { type: 'choice', prompt: 'Моя сестра живёт на Уралмаше. По субботам я … туда на метро.', options: ['хожу', 'езжу'], correct: 'езжу' },
  { type: 'choice', prompt: 'Офис брата находится близко от дома. Он … туда пешком.', options: ['ходит', 'ездит'], correct: 'ходит' },
  { type: 'choice', prompt: 'В Китае многие … на велосипедах.', options: ['ходят', 'ездят'], correct: 'ездят' },
  { type: 'choice', prompt: 'Моя семья живёт в Китае. Я … туда на каникулы.', options: ['хожу', 'езжу'], correct: 'езжу' },
];

export default function LessonNineteenTaskFourteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
