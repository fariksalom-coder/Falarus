import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-15';

const HUB_ROUTES = [
  { path: '/lesson-15/mustahkamlash', taskNum: 1 },
  ...Array.from({ length: 7 }, (_, i) => ({
    path: `/lesson-15/topshiriq-${i + 1}`,
    taskNum: i + 2,
  })),
];

export default function LessonFifteenPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>
            Ўтган замон рус тилида энг осон замон ҳисобланади: феъллардаги <span className="font-semibold">-ть</span>
            {' '}қўшимчаси олиб ташланиб, ўрнига ўтган замон қўшимчалари қўйилади.
          </p>
          <p>
            Бирликда (Я, Ты, Он/Она) ва кўпликда (Мы, Вы, Они) қўшимчалар умумий қоида асосида ишлатилади.
          </p>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">Мисол: Быть — бўлмоқ</p>
            <p>Быть → (ть олиб ташланади) + Л / ЛА / ЛИ</p>
            <p className="mt-2">Я был(а), Ты был(а), Он был, Она была, Мы были, Вы были, Они были.</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">Хулоса шакли</p>
            <p>Я _________л(а)</p>
            <p>Ты ________л(а)</p>
            <p>Он _________л</p>
            <p>Она ________ла</p>
            <p>Мы _________ли</p>
            <p>Вы _________ли</p>
            <p>Они ________ли</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
