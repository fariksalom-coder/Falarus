import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Когда они … по городу, слушали переводчика.', options: ['ездили', 'ехали', 'шли'], correct: 'ехали' },
  { type: 'choice', prompt: 'Они очень устали, потому что долго … .', options: ['ехали', 'ездили', 'шли'], correct: 'шли' },
  { type: 'choice', prompt: 'Потом они … в ресторан.', options: ['пошли', 'шли', 'ходили'], correct: 'пошли' },
  { type: 'choice', prompt: 'А когда они … туда, … дождь.', options: ['пришли / пошёл', 'шли / шёл', 'пришли / шёл'], correct: 'пришли / пошёл' },
  { type: 'choice', prompt: 'Утром сестра … на работу на метро, а вечером … домой пешком.', options: ['поедет / пойдёт', 'поедешь / пойдёт', 'поедет / пойдут'], correct: 'поедет / пойдёт' },
  { type: 'choice', prompt: 'Он выключил телевизор и … гулять.', options: ['пошла', 'пошёл', 'пошли'], correct: 'пошёл' },
  { type: 'choice', prompt: 'После занятий мы … в столовую.', options: ['пошла', 'пошёл', 'пошли'], correct: 'пошли' },
  { type: 'choice', prompt: 'Она обиделась и не … с другом на танцы.', options: ['пошла', 'пойдёт', 'пошли'], correct: 'пошла' },
  { type: 'choice', prompt: '— Где ты был так долго? — Я … на футбольный матч.', options: ['шёл', 'ходил', 'пошёл'], correct: 'ходил' },
  { type: 'choice', prompt: 'У отца есть машина, но он не … на ней зимой.', options: ['едет', 'поедет', 'ездит'], correct: 'ездит' },
  { type: 'choice', prompt: 'Когда я … в гости, я обычно покупаю торт.', options: ['пойду', 'иду', 'шёл'], correct: 'иду' },
  { type: 'choice', prompt: 'Ты со мной … в субботу на дачу?', options: ['поедешь', 'поехал', 'поехали'], correct: 'поедешь' },
];

export default function LessonTwentyTaskSevenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" lessonPath="/lesson-20" taskNumber={7} />;
}
