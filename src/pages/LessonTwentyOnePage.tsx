import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';

const LESSON_PATH = '/lesson-21';

const HUB_ROUTES = [{ path: '/lesson-21/topshiriq-1', taskNum: 1 }];

export default function LessonTwentyOnePage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>
            <strong>Именительный</strong> — кто? что?
          </p>
          <p>
            <strong>Родительный</strong> — кого? чего?
          </p>
          <p>
            <strong>Дательный</strong> — кому? чему?
          </p>
          <p>
            <strong>Винительный</strong> — кого? что?
          </p>
          <p>
            <strong>Творительный</strong> — кем? чем?
          </p>
          <p>
            <strong>Предложный</strong> — о ком? о чем?
          </p>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
