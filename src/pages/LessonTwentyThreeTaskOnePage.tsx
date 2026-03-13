import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Мой отец работает ... заводе, а моя мать — ... школе.',
    options: ['в / в', 'на / в', 'на / на'],
    correct: 'на / в',
  },
  {
    type: 'choice',
    prompt: 'Сегодня ... первом уроке мы писали диктант.',
    options: ['в', 'на', 'к'],
    correct: 'на',
  },
  {
    type: 'choice',
    prompt: 'Мои друзья живут ... общежитии ... Лесном проспекте.',
    options: ['в / на', 'на / в', 'в / в'],
    correct: 'в / на',
  },
  {
    type: 'choice',
    prompt: 'Этот музей находится ... центре города ... большой площади.',
    options: ['на / на', 'в / на', 'в / в'],
    correct: 'в / на',
  },
  {
    type: 'choice',
    prompt: 'Белое море находится ... севере России, а Черное море — ... юге.',
    options: ['в / в', 'на / на', 'в / на'],
    correct: 'на / на',
  },
  {
    type: 'choice',
    prompt: 'Эта студентка будет учиться ... университете, ... филологическом факультете.',
    options: ['в / на', 'на / в', 'в / в'],
    correct: 'в / на',
  },
  {
    type: 'choice',
    prompt: 'В субботу мы были ... театре ... балете.',
    options: ['в / в', 'на / на', 'в / на'],
    correct: 'в / на',
  },
  {
    type: 'choice',
    prompt: 'Из Москвы в Петербург мы приехали ... поезде.',
    options: ['на', 'в', 'к'],
    correct: 'в',
  },
  {
    type: 'choice',
    prompt: 'Мой младший брат учится ... школе ... четвертом классе.',
    options: ['в / в', 'на / на', 'в / на'],
    correct: 'в / в',
  },
  {
    type: 'choice',
    prompt: 'Наша библиотека находится ... пятом этаже.',
    options: ['в', 'на', 'у'],
    correct: 'на',
  },
  {
    type: 'choice',
    prompt: 'Недавно я был ... экскурсии ... музее.',
    options: ['на / в', 'в / в', 'на / на'],
    correct: 'на / в',
  },
  {
    type: 'choice',
    prompt: 'Он изучал русский язык ... родине ... университете.',
    options: ['в / на', 'на / в', 'на / на'],
    correct: 'на / в',
  },
  {
    type: 'choice',
    prompt: 'Аптека находится ... соседнем доме ... втором этаже.',
    options: ['в / в', 'в / на', 'на / в'],
    correct: 'в / на',
  },
];

export default function LessonTwentyThreeTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-23" lessonPath="/lesson-23" taskNumber={1} />;
}
