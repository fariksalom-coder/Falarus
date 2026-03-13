import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Она идет в магазин. В руках у нее сумка. Она … сумку.',
    options: ['несёт', 'несу', 'несут'],
    correct: 'несёт',
  },
  {
    type: 'choice',
    prompt: 'Преподаватель идет в аудиторию, в руках у него тетради. Он … тетради.',
    options: ['несу', 'несёт', 'несём'],
    correct: 'несёт',
  },
  {
    type: 'choice',
    prompt: 'Я иду в библиотеку. В руках у меня книга. Я … книгу в библиотеку.',
    options: ['несёт', 'несу', 'несём'],
    correct: 'несу',
  },
  {
    type: 'choice',
    prompt: 'Студенты ходят на занятия с тетрадями и словарями. Студенты всегда … на занятия тетради и словари.',
    options: ['несут', 'несу', 'несёт'],
    correct: 'несут',
  },
  {
    type: 'choice',
    prompt: 'По улице идет молодой человек и … в руках цветы.',
    options: ['несёт', 'несу', 'несут'],
    correct: 'несёт',
  },
  {
    type: 'choice',
    prompt: 'Я всегда … с собой на занятия словарь.',
    options: ['ношу', 'носит', 'носят'],
    correct: 'ношу',
  },
  {
    type: 'choice',
    prompt: 'Ребёнок плачет, и мама ходит по комнате и … его на руках.',
    options: ['носит', 'ношу', 'носят'],
    correct: 'носит',
  },
  {
    type: 'choice',
    prompt: 'Почтальон … в наш дом не только газеты, но и журналы.',
    options: ['ношу', 'носит', 'носят'],
    correct: 'носит',
  },
  {
    type: 'choice',
    prompt: 'Студенты всегда … на занятия тетради и учебники.',
    options: ['носят', 'ношу', 'носит'],
    correct: 'носят',
  },
];

export default function LessonNineteenTaskFourPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" lessonPath="/lesson-19" taskNumber={4} />;
}
