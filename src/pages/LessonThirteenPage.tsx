import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-13';

const HUB_ROUTES = [{ path: '/lesson-13/topshiriq-1', taskNum: 1 }];

export default function LessonThirteenPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold text-sky-900">Qoida</p>
              <p>-ться bilan tugagan fe&apos;llarda hozirgi zamonda:</p>
              <p>Я: -юсь, Вы: -етесь, qolgan shaxslarda shaxs qo‘shimchasi + ся.</p>
              <p>Misol: стараться → стараюсь, стараешься, старается, стараемся, стараетесь, стараются.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3">
                  <p className="font-semibold">Стараться</p>
                  <p className="mt-2">Я стараюсь</p>
                  <p>Ты стараешься</p>
                  <p>Он/она старается</p>
                  <p>Мы стараемся</p>
                  <p>Вы стараетесь</p>
                  <p>Они стараются</p>
                </div>
                <div className="p-3 bg-emerald-50">
                  <p className="font-semibold text-emerald-900">Ошибаться</p>
                  <p className="mt-2">Я ошибаюсь</p>
                  <p>Ты ошибаешься</p>
                  <p>Он/она ошибается</p>
                  <p>Мы ошибаемся</p>
                  <p>Вы ошибаетесь</p>
                  <p>Они ошибаются</p>
                </div>
              </div>
            </div>
          
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
