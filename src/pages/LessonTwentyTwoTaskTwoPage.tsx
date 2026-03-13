import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'Найдите правильную пару. Соедините предложение слева со словом справа.',
    pairs: [
      { left: 'Мой друг живёт в …', right: 'Москве' },
      { left: 'Этот инженер работает на …', right: 'заводе' },
      { left: 'Мои родители живут в …', right: 'деревне' },
      { left: 'Эта девушка работает в …', right: 'библиотеке' },
      { left: 'Эти студенты недавно были в …', right: 'музее' },
      { left: 'Он купил газеты в …', right: 'киоске' },
      { left: 'Утром я завтракал в …', right: 'буфете' },
      { left: 'Его учебники стоят на …', right: 'полке' },
      { left: 'Он учится в …', right: 'университете' },
      { left: 'В воскресенье мы были на …', right: 'стадионе' },
    ],
  },
];

export default function LessonTwentyTwoTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" lessonPath="/lesson-22" taskNumber={2} />;
}
