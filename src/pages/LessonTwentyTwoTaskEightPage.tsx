import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Мы встретились с другом на … (станция метро).',
    options: ['станция метро', 'станции метро', 'станцию метро'],
    correct: 'станции метро',
  },
  {
    type: 'choice',
    prompt: 'Русский музей находится на … (площадь Искусств).',
    options: ['площади Искусств', 'площадь Искусств', 'площадью Искусств'],
    correct: 'площади Искусств',
  },
  {
    type: 'choice',
    prompt: 'Сначала я жил в … (гостиница).',
    options: ['гостиница', 'гостинице', 'гостиницу'],
    correct: 'гостинице',
  },
  {
    type: 'choice',
    prompt: 'А сейчас живу в … (общежитие).',
    options: ['общежитии', 'общежитие', 'общежитию'],
    correct: 'общежитии',
  },
  {
    type: 'choice',
    prompt: 'Мой брат два года служил в … (армия).',
    options: ['армия', 'армии', 'армию'],
    correct: 'армии',
  },
  {
    type: 'choice',
    prompt: 'Студенты и преподаватели сейчас на … (собрание).',
    options: ['собрание', 'собрании', 'собранию'],
    correct: 'собрании',
  },
  {
    type: 'choice',
    prompt: 'Я понял все слова в … (статья).',
    options: ['статью', 'статье', 'статья'],
    correct: 'статье',
  },
  {
    type: 'choice',
    prompt: 'Утром все студенты нашей группы были на … (занятие).',
    options: ['занятии', 'занятие', 'занятию'],
    correct: 'занятии',
  },
  {
    type: 'choice',
    prompt: 'Мои друзья будут выступать на … (вечер).',
    options: ['вечер', 'вечере', 'вечером'],
    correct: 'вечере',
  },
  {
    type: 'choice',
    prompt: 'Наш преподаватель летом отдыхал в … (санаторий).',
    options: ['санаторий', 'санатории', 'санаторию'],
    correct: 'санатории',
  },
  {
    type: 'choice',
    prompt: 'Этот магазин находится на … (проспект Науки).',
    options: ['проспекте Науки', 'проспект Науки', 'проспектом Науки'],
    correct: 'проспекте Науки',
  },
];

export default function LessonTwentyTwoTaskEightPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" />;
}
