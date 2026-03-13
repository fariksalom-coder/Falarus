import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Мама … маленького сына в садик.',
    options: ['ведёт', 'веду', 'ведут'],
    correct: 'ведёт',
  },
  {
    type: 'choice',
    prompt: 'По улице идет молодой человек и … на поводке собаку.',
    options: ['ведёт', 'веду', 'ведут'],
    correct: 'ведёт',
  },
  {
    type: 'choice',
    prompt: 'Я … младшего брата в цирк.',
    options: ['веду', 'ведёт', 'ведём'],
    correct: 'веду',
  },
  {
    type: 'choice',
    prompt: 'Наши друзья … нас в музей.',
    options: ['веду', 'ведут', 'ведёт'],
    correct: 'ведут',
  },
  {
    type: 'choice',
    prompt: 'Я каждое утро … мою собаку в этот парк.',
    options: ['вожу', 'водит', 'водят'],
    correct: 'вожу',
  },
  {
    type: 'choice',
    prompt: 'Преподаватель обычно по субботам … студентов на экскурсии.',
    options: ['вожу', 'водит', 'водят'],
    correct: 'водит',
  },
  {
    type: 'choice',
    prompt: 'По воскресеньям многие люди … своих детей в цирк.',
    options: ['водят', 'вожу', 'водит'],
    correct: 'водят',
  },
];

export default function LessonNineteenTaskFivePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" lessonPath="/lesson-19" taskNumber={5} />;
}
