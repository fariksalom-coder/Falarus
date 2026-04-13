import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';

const LESSON_PATH = '/lesson-19';

const HUB_ROUTES = Array.from({ length: 16 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-19/topshiriq-${n}`, taskNum: n };
});

export default function LessonNineteenPage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>Bu darsda rus tilidagi fe&apos;llar harakati mavzusini o&apos;rganamiz.</p>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">Asosiy juftliklar</p>
            <p className="mt-1">идти / ходить, ехать / ездить, бежать / бегать</p>
            <p>нести / носить, везти / возить</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">Qoida (qisqacha)</p>
            <p className="mt-1">Bir yo&apos;nalish, hozir yoki ayni vaqtda: идти, ехать</p>
            <p>Takroriy yoki turli yo&apos;nalish: ходить, ездить</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-900">Nazariya rasmlari</p>
            <div className="mt-3 space-y-3">
              <img src="/lesson-19/theory-1.png" alt="Harakat fellari nazariya rasmi 1" className="w-full rounded-lg border border-amber-200 bg-white" />
              <img src="/lesson-19/theory-2.png" alt="Harakat fellari nazariya rasmi 2" className="w-full rounded-lg border border-amber-200 bg-white" />
              <img src="/lesson-19/theory-3.png" alt="Harakat fellari nazariya rasmi 3" className="w-full rounded-lg border border-amber-200 bg-white" />
            </div>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
