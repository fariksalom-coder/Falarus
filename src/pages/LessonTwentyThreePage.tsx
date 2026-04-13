import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';

const LESSON_PATH = '/lesson-23';

const HUB_ROUTES = Array.from({ length: 2 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-23/topshiriq-${n}`, taskNum: n };
});

export default function LessonTwentyThreePage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>
            Bu darsda biz rus tilida qayerda? (где?) degan savolga javob berishni o&apos;rganamiz. Bunda ko&apos;pincha
            <strong> в </strong>
            va
            <strong> на </strong>
            predloglari ishlatiladi.
          </p>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">Formula</p>
            <p className="mt-1">Где? → В / НА + предложный падеж</p>
            <p>Я учусь в университете. Студенты сидят на лекции.</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">1) Predlog В (ichida, ichkarida)</p>
            <p className="mt-1">Odatda binolar, yopiq joylar yoki hudud ichida bo&apos;lganda ishlatiladi.</p>
            <p>в школе, в университете, в институте, в классе, в группе</p>
            <p>в банке, в больнице, в поликлинике, в театре, в цирке, в музее, в библиотеке</p>
            <p>в городе, в деревне, в доме, в здании</p>
            <p>в стране, в республике, в районе, в центре</p>
            <p>в Африке, в Азии, в России, в Сибири, в Крыму</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-900">2) Predlog НА (ustida, ochiq joylarda)</p>
            <p className="mt-1">Ko&apos;pincha ochiq joylar, tadbirlar yoki ish joylari bilan ishlatiladi.</p>
            <p>на факультете, на уроке, на курсе, на лекции, на занятии, на экзамене</p>
            <p>на улице, на проспекте, на площади, на станции, на остановке, на вокзале</p>
            <p>на заводе, на фабрике, на почте</p>
            <p>на спектакле, на концерте, на балете, на выставке, на экскурсии</p>
            <p>на севере, на юге, на западе, на востоке, на родине</p>
            <p>на Украине, на Урале, на Кавказе, на Кубе</p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
            <p className="font-semibold text-sky-900">3) Transport bilan</p>
            <p className="mt-1">
              Где? → <strong>в + transport</strong>: в автобусе, в троллейбусе, в трамвае, в такси
            </p>
            <p>
              Как? → <strong>на + transport</strong>: на автобусе, на троллейбусе, на трамвае, на такси
            </p>
            <p>Где? Я в автобусе. Как? Я еду на автобусе.</p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="font-semibold text-slate-900">Xulosa</p>
            <p className="mt-1">В → ichkarida bo&apos;lsa</p>
            <p>НА → ochiq joy, tadbir yoki ish joyi bo&apos;lsa</p>
            <p>Transport: в автобусе (ichida), на автобусе (transport orqali)</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
