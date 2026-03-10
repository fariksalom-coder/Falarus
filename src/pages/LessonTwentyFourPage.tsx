import { useNavigate } from 'react-router-dom';

export default function LessonTwentyFourPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">24-dars — Sifatlar va tartib sonlar predlojniy padejda</h1>
          <p className="mb-4 text-sm text-slate-500">Прилагательные и порядковые числительные в предложном падеже</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>
              Bu darsda biz sifatlar (прилагательные) va tartib sonlar (порядковые числительные) предложный падежda qanday
              o'zgarishini o'rganamiz.
            </p>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">1) Predlojniy padej qachon ishlatiladi?</p>
              <p className="mt-1">Ko'pincha в yoki на predloglari bilan ishlatiladi.</p>
              <p>Savol: Где? (qayerda?)</p>
              <p>Я живу в большом городе. Он работает в новом здании. Мы сидим на первом этаже.</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">2) Erkak jins (Мужской род)</p>
              <p className="mt-1">Какой? → В (на) каком?</p>
              <p>Ko'pincha -ом yoki -ем qo'shimchasi qo'shiladi.</p>
              <p>новый дом → в новом доме</p>
              <p>первый этаж → на первом этаже</p>
              <p>большой город → в большом городе</p>
              <p>русский журнал → в русском журнале</p>
              <p>соседний дом → в соседнем доме</p>
              <p>хороший фильм → в хорошем фильме</p>
              <p>третий этаж → на третьем этаже</p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="font-semibold text-sky-900">3) O'rta jins (Средний род)</p>
              <p className="mt-1">Какое? → В (на) каком?</p>
              <p>Ko'pincha -ом yoki -ем qo'shimchasi qo'shiladi.</p>
              <p>новое здание → в новом здании</p>
              <p>зимнее пальто → в зимнем пальто</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">4) Ayol jins (Женский род)</p>
              <p className="mt-1">Какая? → В (на) какой?</p>
              <p>Ko'pincha -ой yoki -ей qo'shimchasi qo'shiladi.</p>
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
              <p className="mt-1">Sifat har doim ot bilan bir xil shaklda bo'ladi.</p>
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
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-24/topshiriq-1')}
            className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 1 — Выберите правильную форму
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-24/topshiriq-2')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 2 — Составьте предложение
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-24/topshiriq-3')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 3 — Выберите правильный вопрос
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-24/topshiriq-4')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 4 — Составьте предложение
          </button>
        </div>
      </main>
    </div>
  );
}
