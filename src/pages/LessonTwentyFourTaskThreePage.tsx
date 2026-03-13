import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Мой отец работает на заводе.',
    options: ['На каком заводе работает ваш отец?', 'Где работает ваш отец?', 'Когда работает ваш отец?'],
    correct: 'На каком заводе работает ваш отец?',
  },
  {
    type: 'choice',
    prompt: 'Вчера мы были в музее.',
    options: ['В каком музее вы были?', 'Где вы были вчера?', 'Когда вы были в музее?'],
    correct: 'В каком музее вы были?',
  },
  {
    type: 'choice',
    prompt: 'Моя сестра учится в институте.',
    options: ['В каком институте учится ваша сестра?', 'Где учится ваша сестра?', 'Когда учится ваша сестра?'],
    correct: 'В каком институте учится ваша сестра?',
  },
  {
    type: 'choice',
    prompt: 'У меня есть хорошие друзья. Они студенты.',
    options: ['В каком институте учатся ваши друзья?', 'Кто ваши друзья?', 'Сколько друзей у вас?'],
    correct: 'В каком институте учатся ваши друзья?',
  },
  {
    type: 'choice',
    prompt: 'Виктор живёт в центре города.',
    options: ['В каком районе живёт Виктор?', 'Где живёт Виктор?', 'Когда Виктор живёт в центре города?'],
    correct: 'В каком районе живёт Виктор?',
  },
];

export default function LessonTwentyFourTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-24" lessonPath="/lesson-24" taskNumber={3} />;
}
