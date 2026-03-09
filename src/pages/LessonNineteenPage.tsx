import { useNavigate } from 'react-router-dom';

export default function LessonNineteenPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">19-dars — Fe'llar harakati</h1>
          <p className="mb-4 text-sm text-slate-500">Глаголы движения</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Bu darsda rus tilidagi fe'llar harakati mavzusini o'rganamiz.</p>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">Asosiy juftliklar</p>
              <p className="mt-1">идти / ходить, ехать / ездить, бежать / бегать</p>
              <p>нести / носить, везти / возить</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">Qoida (qisqacha)</p>
              <p className="mt-1">Bir yo'nalish, hozir yoki ayni vaqtda: идти, ехать</p>
              <p>Takroriy yoki turli yo'nalish: ходить, ездить</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">Nazariya rasmlari</p>
              <div className="mt-3 space-y-3">
                <img src="/lesson-19/theory-1.png" alt="Fe'llar harakati nazariya rasmi 1" className="w-full rounded-lg border border-amber-200 bg-white" />
                <img src="/lesson-19/theory-2.png" alt="Fe'llar harakati nazariya rasmi 2" className="w-full rounded-lg border border-amber-200 bg-white" />
                <img src="/lesson-19/theory-3.png" alt="Fe'llar harakati nazariya rasmi 3" className="w-full rounded-lg border border-amber-200 bg-white" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-1')}
            className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 1 — идти / ходить
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-2')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 2 — ехать / ездить
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-3')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 3 — лететь / летать
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-4')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 4 — нести / носить
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-5')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 5 — вести / водить
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-6')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 6 — идти/ходить, ехать/ездить
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-7')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 7 — выбрать правильный вариант
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-8')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 8 — составьте предложение
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-9')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 9 — ходить/ездить (прошедшее)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-10')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 10 — составьте предложение (ходить/ездить)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-11')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 11 — последовательность диалога
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-12')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 12 — пойти / поехать
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-13')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 13 — будущее время (пойти/поехать)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-14')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 14 — итоговый тест (вариант 1)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-15')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 15 — итоговый тест (вариант 2)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-19/topshiriq-16')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 16 — итоговый тест (вариант 3)
          </button>
        </div>
      </main>
    </div>
  );
}
