import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';

const LESSON_PATH = '/lesson-12';

const HUB_ROUTES = [{ path: '/lesson-12/topshiriq-1', taskNum: 1 }];

export default function LessonTwelvePage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold text-sky-900">Qoida</p>
              <p>
                -ова-, -ева- suffixli fe&apos;llarda hozirgi zamonda bu qism o&apos;rniga <span className="font-semibold">-у / -ю</span>{' '}
                keladi.
              </p>
              <p>Masalan: планировать → планирую, рисовать → рисую.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3">
                  <p className="font-semibold">Планировать (rejalashtirmoq)</p>
                  <p className="mt-2">Я планирую</p>
                  <p>Ты планируешь</p>
                  <p>Он/она планирует</p>
                  <p>Мы планируем</p>
                  <p>Вы планируете</p>
                  <p>Они планируют</p>
                </div>
                <div className="p-3 bg-emerald-50">
                  <p className="font-semibold text-emerald-900">Рисовать (rasm chizmoq)</p>
                  <p className="mt-2">Я рисую</p>
                  <p>Ты рисуешь</p>
                  <p>Он/она рисует</p>
                  <p>Мы рисуем</p>
                  <p>Вы рисуете</p>
                  <p>Они рисуют</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <p className="font-semibold text-violet-900">Shaxs qo‘shimchalari</p>
              <p>Я: -ю / -у</p>
              <p>Ты: -ешь</p>
              <p>Он/она: -ет</p>
              <p>Мы: -ем</p>
              <p>Вы: -ете</p>
              <p>Они: -ют / -ут</p>
            </div>
          
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
