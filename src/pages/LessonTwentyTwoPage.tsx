import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-22';

const HUB_ROUTES = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-22/topshiriq-${n}`, taskNum: n };
});

export default function LessonTwentyTwoPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>Предложный падеж в русском языке употребляется только с предлогами.</p>
          <p>
            <strong>С предлогами в, на:</strong>
          </p>
          <p>
            а) место действия (где? в чем? на чем?): Сестра учится в школе. Брат работает на заводе.
          </p>
          <p>
            б) время (когда? в каком году? в каком месяце? на какой неделе?): Он приехал в этом году в сентябре. Мы ходили на
            экскурсию на прошлой неделе.
          </p>
          <p>в) средство передвижения: Он приехал в Петербург на поезде.</p>
          <p>
            <strong>С предлогом о:</strong> объект мысли/речи (о ком? о чем?): Мы читали о Юрии Гагарине. Мы говорили о космосе.
          </p>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
