import { useNavigate } from 'react-router-dom';

export default function LessonEightPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          <h1 className="text-xl font-bold text-slate-900 mb-4">9-dars — Takrorlash</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 leading-relaxed space-y-2">
            <p>Bu dars umumiy takrorlash uchun.</p>
            <p>Ichida 3 ta blok bor:</p>
            <p>1) Test (10 ta)</p>
            <p>2) Gapni tuzing (10 ta)</p>
            <p>3) Juftini toping (10 ta)</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-8/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Mustahkamlash
          </button>
        </div>
      </main>
    </div>
  );
}
