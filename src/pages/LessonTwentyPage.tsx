import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-20';

const HUB_ROUTES = Array.from({ length: 7 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-20/topshiriq-${n}`, taskNum: n };
});

export default function LessonTwentyPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>Bu darsda oldingi mavzular bo&apos;yicha yakuniy takrorlash testlari bor.</p>
          <p>Testlar qulay bo&apos;lishi uchun bir nechta bo&apos;limlarga bo&apos;lingan (har birida 20 ta).</p>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
