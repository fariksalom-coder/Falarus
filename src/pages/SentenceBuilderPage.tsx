import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';
import { useAuth } from '../context/AuthContext';

const TASKS: Task[] = [
  { type: 'sentence', prompt: 'Men talabaman.', words: ['Я', 'студент.', 'врач'], correct: 'Я студент.' },
  { type: 'sentence', prompt: 'U muhandis.', words: ['Он', 'инженер.', 'учитель'], correct: 'Он инженер.' },
  { type: 'sentence', prompt: 'Bu mening kitobim.', words: ['Это', 'моя', 'книга.', 'тетрадь'], correct: 'Это моя книга.' },
  { type: 'sentence', prompt: 'Biz uyda yashaymiz.', words: ['Мы', 'живём', 'дома.', 'в', 'школе'], correct: 'Мы живём дома.' },
  { type: 'sentence', prompt: 'Siz qayerdansiz?', words: ['Откуда', 'вы?', 'когда', 'где'], correct: 'Откуда вы?' },
];

export default function SentenceBuilderPage() {
  const { token } = useAuth();
  return (
    <LessonFourteenTaskRunner
      tasks={TASKS}
      backPath="/lesson-1"
      lessonPath="/lesson-1"
      taskNumber={3}
      sentenceInstruction="Pastdagi so‘zlardan to‘g‘ri ruscha tarjimani tuzing."
      token={token}
    />
  );
}
