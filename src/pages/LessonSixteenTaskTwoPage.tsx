import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Я ______ читать книгу.',
    options: ['буду', 'будет', 'будут'],
    correct: 'буду',
  },
  {
    type: 'choice',
    prompt: 'Мы ______ говорить по-русски.',
    options: ['будет', 'будем', 'будут'],
    correct: 'будем',
  },
  {
    type: 'choice',
    prompt: 'Он ______ работать завтра.',
    options: ['будет', 'будут', 'буду'],
    correct: 'будет',
  },
  {
    type: 'choice',
    prompt: 'Они ______ гулять вечером.',
    options: ['будет', 'будут', 'будем'],
    correct: 'будут',
  },
  {
    type: 'choice',
    prompt: 'Ты ______ учиться в университете.',
    options: ['будешь', 'будет', 'будут'],
    correct: 'будешь',
  },
];

export default function LessonSixteenTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-16" />;
}
