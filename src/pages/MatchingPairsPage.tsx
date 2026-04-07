import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Доброе', right: 'утро' },
      { left: 'Добрый', right: 'день' },
      { left: 'Добрый', right: 'вечер' },
      { left: 'Доброй', right: 'ночи' },
      { left: 'До', right: 'свидания' },
    ],
  },
];

export default function MatchingPairsPage() {
  const { token } = useAuth();
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-1" lessonPath="/lesson-1" taskNumber={2} token={token} />;
}
