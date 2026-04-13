import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';

const LESSON_PATH = '/lesson-11';

const HUB_ROUTES = [
  { path: '/lesson-11/mustahkamlash', taskNum: 1 },
  { path: '/lesson-11/zadanie-1', taskNum: 2 },
  ...Array.from({ length: 14 }, (_, i) => ({
    path: `/lesson-11/topshiriq-${i + 2}`,
    taskNum: i + 3,
  })),
];

export default function LessonElevenPage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
            <p className="font-semibold text-sky-900">Fe&apos;l zamonlari</p>
            <p>Rus tilida fe&apos;lning 3 ta zamoni bor: o‘tgan, hozirgi, kelasi.</p>
            <p>Я работал/а (o‘tgan), Я работаю (hozirgi), Я буду работать (kelasi).</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
            <p className="font-semibold text-emerald-900">Настоящее время (hozirgi zamon)</p>
            <p>Hozir bo‘layotgan harakatni bildiradi.</p>
            <p>O‘zbekchadagi -япман/-япсан/-япти kabi, rus tilida ham har bir shaxs uchun alohida qo‘shimcha bor.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-b border-slate-300 p-3 md:border-b-0 md:border-r">
                <p className="font-semibold">Работать (ishlamoq)</p>
                <p className="mt-2">Я работаю</p>
                <p>Ты работаешь</p>
                <p>Он/она работает</p>
                <p>Мы работаем</p>
                <p>Вы работаете</p>
                <p>Они работают</p>
              </div>
              <div className="bg-violet-50 p-3">
                <p className="font-semibold text-violet-900">Xulosa (qo‘shimchalar)</p>
                <p className="mt-2">Я: -у / -ю</p>
                <p>Ты: -ешь / -ишь</p>
                <p>Он/она: -ет / -ит</p>
                <p>Мы: -ем / -им</p>
                <p>Вы: -ете / -ите</p>
                <p>Они: -ут/-ют / -ат/-ят</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="font-semibold text-amber-900">Misollar</p>
            <p>читать: читаю, читаешь, читает, читаем, читаете, читают</p>
            <p>говорить: говорю, говоришь, говорит, говорим, говорите, говорят</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
