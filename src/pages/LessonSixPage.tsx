import { useNavigate } from 'react-router-dom';

export default function LessonSixPage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-4">6-dars — Чей? Чья? Чьё?</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 space-y-4 text-sm leading-relaxed">
            <p>
              Rus tilida <span className="font-semibold">kimning?</span> savolini berish uchun quyidagi shakllar ishlatiladi:
              <span className="font-semibold"> Чей? Чья? Чьё?</span>. Bu savollar otning rodiga bog&apos;liq.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="font-bold text-sky-900">Чей? (m.r.)</p>
                <p className="mt-1">дом → Чей дом?</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="font-bold text-rose-900">Чья? (j.r.)</p>
                <p className="mt-1">книга → Чья книга?</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-bold text-emerald-900">Чьё? (s.r.)</p>
                <p className="mt-1">окно → Чьё окно?</p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
              <p className="font-semibold text-indigo-900">Egalik olmoshlari: мен / сен</p>
              <p>Мужской: мой / твой</p>
              <p>Женский: моя / твоя</p>
              <p>Средний: моё / твоё</p>
              <p className="text-indigo-800">Misollar: мой дом, моя книга, моё окно, твой телефон, твоя машина, твоё письмо.</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="font-semibold text-amber-900">U (он / она)</p>
              <p>его — uning (erkak), её — uning (ayol)</p>
              <p className="text-amber-800">Rodga qarab o&apos;zgarmaydi: его дом, его книга, его окно, её дом, её машина, её письмо.</p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <p className="font-semibold text-violet-900">Biz / Siz</p>
              <p>Мужской: наш / ваш</p>
              <p>Женский: наша / ваша</p>
              <p>Средний: наше / ваше</p>
              <p>Ko‘plik: наши / ваши</p>
              <p className="text-violet-800">Misollar: наш дом, наша школа, наше письмо, ваш телефон, ваша машина, ваше окно.</p>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 space-y-2">
              <p className="font-semibold text-teal-900">Ular</p>
              <p>их — ularning</p>
              <p className="text-teal-800">Rodga qarab o&apos;zgarmaydi: их дом, их книга, их окно.</p>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <p className="font-semibold">Muhim qoida:</p>
              <p>Egalik olmoshi har doim otning rodiga moslashadi: мой дом, моя книга, моё окно.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-6/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Mustahkamlash
          </button>
        </div>
      </main>
    </div>
  );
}
