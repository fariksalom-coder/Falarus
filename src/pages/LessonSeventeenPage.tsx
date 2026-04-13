import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { ExtendedHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';

const LESSON_PATH = '/lesson-17';

const HUB_ROUTES = Array.from({ length: 17 }, (_, i) => {
  const n = i + 1;
  return { path: `/lesson-17/topshiriq-${n}`, taskNum: n };
});

export default function LessonSeventeenPage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p>Рус тилида феъллар 2 турга бўлинади.</p>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-900">Қисқартма</p>
            <p className="mt-1">НСВ — несовершенный вид (тугалланмаган феъл)</p>
            <p>СВ — совершенный вид (тугалланган феъл)</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">1) НСВ — тугалланмаган феъл</p>
            <p className="mt-1">НСВ феъллар жараённи, фактни ёки такрорланадиган ҳаракатни билдириш учун ишлатилади.</p>
            <p>Факт: Я смотре́л фильм</p>
            <p>Жараён: Сейча́с я иду́ в шко́лу</p>
            <p>Мунтазам: Он ка́ждый день бе́гает</p>
            <p>Ҳеч қачон: Мы никогда́ не пьём</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-900">2) СВ — тугалланган феъл</p>
            <p className="mt-1">СВ феъллар ҳаракат тугалланганини ёки натижани кўрсатади.</p>
            <p>Натижа: Я вы́пил ле́карство</p>
            <p>Бир марта: Ты поступи́л в университет</p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="font-semibold">НСВ ва СВ фарқи</p>
            <p className="mt-2">Я чита́л книгу — Я прочита́л книгу</p>
            <p>Я чита́ю книгу — (СВ ҳозирги замонда ишлатилмайди)</p>
            <p>Я бу́ду чита́ть книгу — Я прочита́ю книгу</p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <p className="font-semibold text-violet-900">Муҳим қоида (замонлар)</p>
            <p className="mt-1">Ҳозирги замон: НСВ ✔, СВ ❌</p>
            <p>Ўтган замон: НСВ ✔, СВ ✔</p>
            <p>Келаси замон: НСВ ✔, СВ ✔</p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
            <p className="font-semibold text-cyan-900">СВ ясаш усуллари</p>
            <p className="mt-1">1) Префикс: делать → сделать, читать → прочитать, гулять → погулять</p>
            <p>2) Суффикс: получать → получить, объяснять → объяснить, показывать → показать</p>
            <p>3) Янги ўзак: говорить → сказать, брать → взять, класть → положить</p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="font-semibold text-rose-900">Эслаб қолиш учун қисқа схема</p>
            <p className="mt-1">НСВ: жараён, такрорланиш, факт</p>
            <p>СВ: натижа, бир марта, тугалланган ҳаракат</p>
          </div>
        </LessonTheoryCollapsible>

        <ExtendedHubTaskGrid lessonPath={LESSON_PATH} hubRoutes={HUB_ROUTES} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
