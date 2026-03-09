import { useNavigate } from 'react-router-dom';

export default function LessonTwentyPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">20-dars — Takrorlash</h1>
          <p className="mb-4 text-sm text-slate-500">Повторение</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Bu darsda oldingi mavzular bo'yicha yakuniy takrorlash testlari bor.</p>
            <p>Testlar qulay bo'lishi uchun bir nechta bo'limlarga bo'lingan (har birida 20 ta).</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-1')}
            className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 1 — Повторение (1-qism)
          </button>

          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-2')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 2 — Повторение (2-qism)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-3')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 3 — Повторение (3-qism)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-4')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 4 — Повторение (4-qism)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-5')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 5 — Повторение (5-qism)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-6')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 6 — Повторение (6-qism)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-20/topshiriq-7')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 7 — Повторение (7-qism)
          </button>
        </div>
      </main>
    </div>
  );
}
