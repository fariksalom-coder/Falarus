import { useNavigate } from 'react-router-dom';

export default function LessonSeventeenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border-2 border-slate-100 bg-white p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Orqaga
          </button>

          <h1 className="mb-1 text-xl font-bold text-slate-900">17-dars — Fe'lning tugallangan va tugallanmagan shakli</h1>
          <p className="mb-4 text-sm text-slate-500">Совершенный и несовершенный вид глагола</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
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
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-1')}
            className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 1
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-2')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 2
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-3')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 3
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-4')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 4
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-5')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 5
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-6')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 6
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-7')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 7
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-8')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 8
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-9')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 9
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-10')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 10
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-11')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 11
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-12')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 12
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-13')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 13
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-14')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 14
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-15')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 15
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-16')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 16
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-17/topshiriq-17')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 17
          </button>
        </div>
      </main>
    </div>
  );
}
