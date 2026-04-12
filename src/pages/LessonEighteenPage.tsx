import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-18';

const HUB_ROUTES = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-18/topshiriq-${n}`, taskNum: n };
});

export default function LessonEighteenPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>Rus tilida &quot;buyruq&quot; gaplarni gapirish uchun quyidagi qoidani bilishimiz kerak.</p>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">Qoida 1</p>
            <p className="mt-1">Я читаю → читай</p>
            <p>Я рисую → рисуй</p>
            <p>Я мечтаю → мечтай</p>
            <p>Я умываюсь → умывайся</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">Qoida 2</p>
            <p className="mt-1">Я смотрю → смотри</p>
            <p>Я говорю → говори</p>
            <p>Я пишу → пиши</p>
            <p>Я готовлюсь → готовься</p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="font-semibold">Buyruq fe&apos;llarga misollar</p>
            <p className="mt-2">Ты: читай, говори, пиши, скажи, объясни, готовься, старайся, обращайся</p>
            <p>Вы: читайте, говорите, пишите, скажите, объясните, готовьтесь, старайтесь, обращайтесь</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
