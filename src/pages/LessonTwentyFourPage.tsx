import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-24';

const HUB_ROUTES = Array.from({ length: 4 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-24/topshiriq-${n}`, taskNum: n };
});

export default function LessonTwentyFourPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>
            Bu darsda biz sifatlar (прилагательные) va tartib sonlar (порядковые числительные) предложный падежda qanday
            o&apos;zgarishini o&apos;rganamiz.
          </p>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">1) Predlojniy padej qachon ishlatiladi?</p>
            <p className="mt-1">Ko&apos;pincha в yoki на predloglari bilan ishlatiladi.</p>
            <p>Savol: Где? (qayerda?)</p>
            <p>Я живу в большом городе. Он работает в новом здании. Мы сидим на первом этаже.</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">2) Erkak jins (Мужской род)</p>
            <p className="mt-1">Какой? → В (на) каком?</p>
            <p>Ko&apos;pincha -ом yoki -ем qo&apos;shimchasi qo&apos;shiladi.</p>
            <p>новый дом → в новом доме</p>
            <p>первый этаж → на первом этаже</p>
            <p>большой город → в большом городе</p>
            <p>русский журнал → в русском журнале</p>
            <p>соседний дом → в соседнем доме</p>
            <p>хороший фильм → в хорошем фильме</p>
            <p>третий этаж → на третьем этаже</p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
            <p className="font-semibold text-sky-900">3) O&apos;rta jins (Средний род)</p>
            <p className="mt-1">Какое? → В (на) каком?</p>
            <p>Ko&apos;pincha -ом yoki -ем qo&apos;shimchasi qo&apos;shiladi.</p>
            <p>новое здание → в новом здании</p>
            <p>зимнее пальто → в зимнем пальто</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-900">4) Ayol jins (Женский род)</p>
            <p className="mt-1">Какая? → В (на) какой?</p>
            <p>Ko&apos;pincha -ой yoki -ей qo&apos;shimchasi qo&apos;shiladi.</p>
            <p>новая школа → в новой школе</p>
            <p>тихая улица → на тихой улице</p>
            <p>соседняя комната → в соседней комнате</p>
            <p>хорошая школа → в хорошей школе</p>
            <p>третья страница → на третьей странице</p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="font-semibold text-slate-900">5) Qisqa qoida</p>
            <p className="mt-1">Мужской: каком → -ом / -ем</p>
            <p>Средний: каком → -ом / -ем</p>
            <p>Женский: какой → -ой / -ей</p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="font-semibold text-slate-900">6) Muhim</p>
            <p className="mt-1">Sifat har doim ot bilan bir xil shaklda bo&apos;ladi.</p>
            <p>большой город → в большом городе</p>
            <p>новая школа → в новой школе</p>
            <p>первый этаж → на первом этаже</p>
          </div>

          <div className="rounded-xl border border-emerald-300 bg-emerald-100 p-3">
            <p className="font-semibold text-emerald-900">Xulosa</p>
            <p className="mt-1">мужской род → -ом / -ем</p>
            <p>средний род → -ом / -ем</p>
            <p>женский род → -ой / -ей</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
