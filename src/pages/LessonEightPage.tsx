import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSON_8_VAZIFALARI } from '../data/lessonEightTasks';

const LESSON_PATH = '/lesson-8';

export default function LessonEightPage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

            <p>Bu dars umumiy takrorlash uchun.</p>
            <p>Ichida 3 ta blok bor:</p>
            <p>1) Test (10 ta)</p>
            <p>2) Gapni tuzing (10 ta)</p>
            <p>3) Juftini toping (10 ta)</p>
          
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_8_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
