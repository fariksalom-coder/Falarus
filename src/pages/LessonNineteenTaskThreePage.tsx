import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Вы куда … ?', options: ['летите', 'летим', 'летят'], correct: 'летите' },
  { type: 'choice', prompt: 'Я … в Москву.', options: ['лечу', 'летишь', 'летим'], correct: 'лечу' },
  { type: 'choice', prompt: 'А вы куда … ?', options: ['летите', 'летим', 'летят'], correct: 'летите' },
  { type: 'choice', prompt: 'Мы тоже … в Москву.', options: ['летит', 'летим', 'летят'], correct: 'летим' },
  { type: 'choice', prompt: 'Скажите, пожалуйста, какой рейс … до Иркутска?', options: ['летим', 'летит', 'летят'], correct: 'летит' },
  { type: 'choice', prompt: 'Мой друг … сейчас в Пермь.', options: ['лечу', 'летит', 'летим'], correct: 'летит' },
  { type: 'choice', prompt: 'А я … в Санкт-Петербург.', options: ['лечу', 'летишь', 'летим'], correct: 'лечу' },
  { type: 'choice', prompt: 'Мы … уже целый час.', options: ['летим', 'летит', 'летят'], correct: 'летим' },
  { type: 'choice', prompt: 'Ты часто … в командировки?', options: ['летаешь', 'летаем', 'летают'], correct: 'летаешь' },
  { type: 'choice', prompt: 'Нет, я … раз в месяц.', options: ['летаю', 'летает', 'летаем'], correct: 'летаю' },
  { type: 'choice', prompt: 'Родители каждый год … на юг отдыхать.', options: ['летаем', 'летают', 'летает'], correct: 'летают' },
  { type: 'choice', prompt: 'Самолёты сегодня не … из-за плохих погодных условий.', options: ['летают', 'летает', 'летаем'], correct: 'летают' },
  { type: 'choice', prompt: 'Кто … быстрее всех?', options: ['летаешь', 'летает', 'летают'], correct: 'летает' },
];

export default function LessonNineteenTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" lessonPath="/lesson-19" taskNumber={3} />;
}
