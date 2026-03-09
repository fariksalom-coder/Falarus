import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Мои родители … на юг к морю.', options: ['едет', 'едем', 'едут'], correct: 'едут' },
  { type: 'choice', prompt: 'Я … сейчас на вокзал.', options: ['еду', 'едешь', 'едут'], correct: 'еду' },
  { type: 'choice', prompt: 'Они … в университет на трамвае и читают газету.', options: ['едет', 'едем', 'едут'], correct: 'едут' },
  { type: 'choice', prompt: 'Куда ты сейчас … ?', options: ['еду', 'едешь', 'едем'], correct: 'едешь' },
  { type: 'choice', prompt: 'Я … в магазин.', options: ['еду', 'едешь', 'едет'], correct: 'еду' },
  { type: 'choice', prompt: 'А вы куда … ?', options: ['едете', 'едем', 'едут'], correct: 'едете' },
  { type: 'choice', prompt: 'А мы … в университет.', options: ['едет', 'едем', 'едут'], correct: 'едем' },
  { type: 'choice', prompt: 'Куда … сейчас ваша группа?', options: ['едет', 'едем', 'едут'], correct: 'едет' },
  { type: 'choice', prompt: 'Мы … на экскурсию за город.', options: ['едет', 'едем', 'едут'], correct: 'едем' },
  { type: 'choice', prompt: 'Ты не знаешь, куда это … сейчас Таня?', options: ['еду', 'едет', 'едут'], correct: 'едет' },
  { type: 'choice', prompt: 'Она … в гости.', options: ['еду', 'едет', 'едем'], correct: 'едет' },
  { type: 'choice', prompt: 'Твои друзья сейчас … в цирк.', options: ['едет', 'едем', 'едут'], correct: 'едут' },
  { type: 'choice', prompt: 'А почему ты не … ?', options: ['едешь', 'еду', 'едете'], correct: 'едешь' },
  { type: 'choice', prompt: 'А я … на вокзал встречать подругу.', options: ['еду', 'едешь', 'едем'], correct: 'еду' },

  { type: 'choice', prompt: 'Я часто … на дачу.', options: ['езжу', 'ездит', 'ездят'], correct: 'езжу' },
  { type: 'choice', prompt: 'Каждый день отец … на работу.', options: ['езжу', 'ездит', 'ездят'], correct: 'ездит' },
  { type: 'choice', prompt: 'Я каждый день … в университет.', options: ['езжу', 'ездит', 'ездим'], correct: 'езжу' },
  { type: 'choice', prompt: 'Каждую субботу мы … за город отдыхать.', options: ['езжу', 'ездит', 'ездим'], correct: 'ездим' },
  { type: 'choice', prompt: 'Ты часто … в библиотеку?', options: ['ездишь', 'ездим', 'ездят'], correct: 'ездишь' },
  { type: 'choice', prompt: 'Нет, я … туда редко.', options: ['езжу', 'ездит', 'ездим'], correct: 'езжу' },
  { type: 'choice', prompt: 'Вы каждое лето … на море?', options: ['ездите', 'ездим', 'ездят'], correct: 'ездите' },
  { type: 'choice', prompt: 'Да, мы … туда раз в год.', options: ['ездим', 'ездите', 'ездят'], correct: 'ездим' },
];

export default function LessonNineteenTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
