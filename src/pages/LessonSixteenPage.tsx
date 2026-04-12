import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-16';

const HUB_ROUTES = [1, 2, 3].map((n) => ({
  path: `/lesson-16/topshiriq-${n}`,
  taskNum: n,
}));

export default function LessonSixteenPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>Рус тилида келаси замонда гапиришнинг 2 хил усули бор. Бу дарсда 1-усулни ўрганамиз.</p>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">1-усул: быть феъли ёрдамида келаси замон</p>
            <p className="mt-1">Муҳим қоида: <span className="font-semibold">быть + инфинитив</span></p>
            <p>Инфинитив ўзгармайди.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-b border-slate-300 p-3 md:border-b-0 md:border-r">
                <p className="font-semibold">Быть феъли келаси замонда</p>
                <p className="mt-2">Я — буду</p>
                <p>Ты — будешь</p>
                <p>Он / она — будет</p>
                <p>Мы — будем</p>
                <p>Вы — будете</p>
                <p>Они — будут</p>
              </div>
              <div className="bg-violet-50 p-3">
                <p className="font-semibold text-violet-900">Формула</p>
                <p className="mt-2">Я буду + феъл</p>
                <p>Ты будешь + феъл</p>
                <p>Он/она будет + феъл</p>
                <p>Мы будем + феъл</p>
                <p>Вы будете + феъл</p>
                <p>Они будут + феъл</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">Мисол: Читать</p>
            <p className="mt-1">Я буду читать, Ты будешь читать, Он будет читать.</p>
            <p>Мы будем читать, Вы будете читать, Они будут читать.</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-900">Мисол: Говорить</p>
            <p className="mt-1">Я буду говорить, Ты будешь говорить, Он будет говорить.</p>
            <p>Мы будем говорить, Вы будете говорить, Они будут говорить.</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
