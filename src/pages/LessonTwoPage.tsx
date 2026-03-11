import { useNavigate } from 'react-router-dom';

export default function LessonTwoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          <h1 className="text-xl font-bold text-slate-900 mb-4">2-dars — Kishilik olmoshi</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 space-y-4 text-sm leading-relaxed">
            <p className="font-bold">Kishilik olmoshlari</p>
            <p>Kishilik olmoshlari "Kim?" savoliga javob beradi. Ular odam ismini almashtiradi.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold">Birlik:</p>
                <p className="mt-1">Я — men<br />Ты — sen<br />Он — u (erkak)<br />Она — u (ayol)<br />Оно — u (narsa)</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold">Ko‘plik:</p>
                <p className="mt-1">Мы — biz<br />Вы — siz<br />Они — ular</p>
              </div>
            </div>

            <p className="font-semibold">Misollar:</p>
            <p>Я студент.<br />Ты работаешь.<br />Он врач.<br />Она учительница.<br />Мы дома.<br />Вы из Самарканда.<br />Они работают.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-2/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Topshiriq
          </button>
        </div>
      </main>
    </div>
  );
}
