import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'Найдите правильную пару.',
    pairs: [
      { left: 'Сейчас эти студенты в …', right: 'аудитории' },
      { left: 'Вчера мы были на …', right: 'экскурсии' },
      { left: 'Мои друзья живут в …', right: 'общежитии' },
      { left: 'Утром Марта была на …', right: 'лекции' },
      { left: 'Группа №4 сейчас на …', right: 'занятии' },
      { left: 'Он будет ждать меня на …', right: 'станции' },
      { left: 'Этот музей находится на …', right: 'площади' },
      { left: 'Твоя куртка лежит на …', right: 'кровати' },
      { left: 'Почта находится в соседнем …', right: 'здании' },
      { left: 'Он сделал три ошибки в …', right: 'упражнении' },
    ],
  },
];

export default function LessonTwentyTwoTaskSixPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" />;
}
